import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult } from 'pg';
import * as path from 'path';
import * as fs from 'fs';

/**
 * SQLitePersistentAdapter — wraps better-sqlite3 behind a pg-compatible
 * pool interface (query(text, params) → { rows, rowCount }).
 *
 * This is the fallback used when PostgreSQL is unreachable.
 * Data is written to a real .db file on disk — it SURVIVES server restarts.
 *
 * SQL dialect differences bridged:
 *  - $1/$2 positional params → ? placeholders
 *  - CURRENT_TIMESTAMP → datetime('now')  (SQLite built-in)
 *  - SERIAL / BIGSERIAL → INTEGER (SQLite auto-increment)
 *  - ON CONFLICT ... DO UPDATE (upsert) is supported natively since SQLite 3.24
 *  - BOOLEAN → INTEGER 0/1 (SQLite has no native boolean type)
 *  - RETURNING clause → handled via lastInsertRowid + a follow-up SELECT
 */
class SqlitePool {
  private db: any;
  private readonly logger = new Logger('SqlitePool');

  constructor(dbPath: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3');
    this.db = new Database(dbPath);
    // WAL mode for concurrent read performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.logger.log(`SQLite persistent database opened at: ${dbPath}`);
  }

  /** Convert postgres $1,$2 params → SQLite ? placeholders and map values array */
  private pgToSqlite(sql: string, originalValues: any[]): { converted: string, mappedValues: any[] } {
    const mappedValues: any[] = [];
    let converted = sql.replace(/\$(\d+)/g, (match, digits) => {
      const idx = parseInt(digits, 10) - 1;
      mappedValues.push(originalValues[idx]);
      return '?';
    });

    const isDDL = /^\s*(CREATE|DROP|ALTER)\s/i.test(converted);
    converted = converted
      // CURRENT_TIMESTAMP is supported by SQLite natively in DEFAULT — only convert in DML
      .replace(/\bCURRENT_TIMESTAMP\b/g, isDDL ? 'CURRENT_TIMESTAMP' : "datetime('now')")
      // Postgres boolean literals (in DML/queries)
      .replace(/(?<![A-Z_])TRUE\b/g, '1')
      .replace(/(?<![A-Z_])FALSE\b/g, '0')
      // VARCHAR(n) → TEXT, BIGSERIAL → INTEGER, SERIAL → INTEGER
      .replace(/VARCHAR\(\d+\)/gi, 'TEXT')
      .replace(/\bBIGSERIAL\b/gi, 'INTEGER')
      .replace(/\bSERIAL\b/gi, 'INTEGER')
      // BOOLEAN type declaration → INTEGER
      .replace(/\bBOOLEAN\b/gi, 'INTEGER')
      // NOW() function → datetime('now')
      .replace(/\bNOW\(\)/gi, "datetime('now')")
      // interval arithmetic: NOW() + INTERVAL '90 days' → datetime('now', '+90 days')
      .replace(/datetime\('now'\)\s*\+\s*INTERVAL\s*'(\d+)\s*days?'/gi, "datetime('now', '+$1 days')")
      // EXTRACT(DAY FROM ...) → julian day arithmetic
      .replace(/EXTRACT\s*\(\s*DAY\s+FROM\s+\(([^)]+)\)\s*\)/gi, "CAST((julianday($1) - julianday(datetime('now'))) AS INTEGER)");
      
    return { converted, mappedValues };
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const { converted, mappedValues } = this.pgToSqlite(text, params ?? []);
    const values = mappedValues.map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : v === undefined ? null : v));

    try {
      const trimmed = converted.trim().toUpperCase();

      // Multi-statement DDL (CREATE TABLE, etc.) — SQLite prepare() only handles one at a time
      // Split on semicolons and run each individually
      const isDDL = /^\s*(CREATE|DROP|ALTER)\s/i.test(converted.trim());
      if (isDDL && values.length === 0) {
        const statements = converted
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        for (const stmt of statements) {
          this.db.prepare(stmt).run();
        }
        return { rows: [] as T[], rowCount: 0 } as QueryResult<T>;
      }

      if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.includes('RETURNING')) {
        const stmt = this.db.prepare(converted);
        const rows = stmt.all(...values) as any[];
        for (const r of rows) {
          if (r && typeof r === 'object') {
            if (r['COUNT(*)'] !== undefined && r.count === undefined) {
              r.count = r['COUNT(*)'];
            }
          }
        }
        return { rows, rowCount: rows.length } as QueryResult<T>;
      }

      // Plain DML
      const stmt = this.db.prepare(converted);
      const info = stmt.run(...values);
      return { rows: [] as T[], rowCount: info.changes } as QueryResult<T>;
    } catch (err: any) {
      this.logger.error(`SQLite query error: ${err.message}\nSQL: ${converted}`);
      throw err;
    }
  }

  async end() {
    this.db?.close();
  }
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: any;
  private isInMemory = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const connectionString =
      this.configService.get<string>('DATABASE_URL') ||
      'postgresql://educaro:educaropassword@localhost:5432/educaro_db?schema=public';

    try {
      const realPool = new Pool({
        connectionString,
        connectionTimeoutMillis: 1500,
      });
      await realPool.query('SELECT 1');
      this.pool = realPool;
      this.isInMemory = false;
      this.logger.log('Connected to PostgreSQL container on port 5432');
    } catch (err) {
      this.logger.warn(
        `PostgreSQL port 5432 not reachable (${err.message}). Falling back to persistent SQLite database (data survives restarts).`
      );
      // Store the SQLite file next to the compiled API entry point
      const dbDir = path.resolve(__dirname, '..', '..', '..');
      const dbPath = path.join(dbDir, 'educaro_local.db');
      this.pool = new SqlitePool(dbPath);
      this.isInMemory = false; // SQLite IS persistent — not in-memory
    }

    await this.initSchema();
  }

  async onModuleDestroy() {
    if (this.pool?.end) {
      await this.pool.end();
    }
  }

  private async initSchema() {
    try {
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT,
          role VARCHAR(50) DEFAULT 'APPLICANT' NOT NULL,
          consent_at TIMESTAMP,
          otp_code TEXT,
          otp_expires_at TIMESTAMP,
          email_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS applicants (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          location VARCHAR(255),
          goal VARCHAR(50),
          completeness_pct INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS profile_fields (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          category VARCHAR(50) NOT NULL,
          field_key VARCHAR(100) NOT NULL,
          value TEXT NOT NULL,
          provenance VARCHAR(50) NOT NULL,
          confidence REAL,
          source_document_id VARCHAR(100),
          source_snippet TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, field_key)
        );
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS agent_events (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          agent VARCHAR(100) NOT NULL,
          tool VARCHAR(100) NOT NULL,
          reason TEXT,
          input TEXT NOT NULL,
          output TEXT NOT NULL,
          confidence REAL,
          duration_ms INTEGER,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          document_type VARCHAR(50) NOT NULL,
          filename VARCHAR(255) NOT NULL,
          preview_url TEXT,
          status VARCHAR(50) DEFAULT 'EXTRACTED',
          extracted_data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS inconsistencies (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          field_key VARCHAR(100) NOT NULL,
          field_label VARCHAR(255) NOT NULL,
          source_a_json TEXT NOT NULL,
          source_b_json TEXT NOT NULL,
          clarifying_question TEXT NOT NULL,
          suggested_options_json TEXT NOT NULL,
          severity VARCHAR(20) DEFAULT 'CRITICAL',
          is_resolved BOOLEAN DEFAULT FALSE,
          resolved_value TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS entitlements (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          feature_key VARCHAR(100) NOT NULL,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, feature_key)
        );
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          transaction_id VARCHAR(100) UNIQUE NOT NULL,
          method VARCHAR(50) NOT NULL,
          amount INTEGER NOT NULL,
          currency VARCHAR(10) DEFAULT 'INR',
          status VARCHAR(50) DEFAULT 'COMPLETED',
          entitlement_key VARCHAR(100) NOT NULL,
          utr VARCHAR(64),
          receipt_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS video_intros (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          video_url TEXT NOT NULL,
          filename VARCHAR(255),
          transcript TEXT NOT NULL,
          duration_seconds INTEGER,
          extracted_data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          payment_id VARCHAR(100),
          amount INTEGER NOT NULL DEFAULT 100,
          currency VARCHAR(10) NOT NULL DEFAULT 'INR',
          purchase_date TIMESTAMP,
          access_expiry_date TIMESTAMP,
          status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
          plan VARCHAR(100) NOT NULL DEFAULT 'EDUCARO_PREMIUM',
          receipt_file_url TEXT,
          receipt_original_filename VARCHAR(255),
          receipt_mime_type VARCHAR(100),
          receipt_size_bytes INTEGER,
          confirmed_at TIMESTAMP,
          confirmed_by VARCHAR(64),
          admin_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_purchases_user_status ON purchases(user_id, status);

      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS cvs (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          cv_data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_cvs_user ON cvs(user_id);
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS recommendations (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          priority VARCHAR(20) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          pathway_context VARCHAR(50) NOT NULL,
          action_route VARCHAR(100),
          action_label VARCHAR(100),
          why_explanation TEXT,
          why_provenance VARCHAR(50) DEFAULT 'AI_GENERATED',
          rule_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_recommendations_user_status ON recommendations(user_id, status);
        CREATE INDEX IF NOT EXISTS idx_recommendations_user_priority ON recommendations(user_id, priority);
        CREATE INDEX IF NOT EXISTS idx_recommendations_user_rule ON recommendations(user_id, rule_id);
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS faq_categories (
          id VARCHAR(64) PRIMARY KEY,
          key VARCHAR(50) UNIQUE NOT NULL,
          label_en VARCHAR(255) NOT NULL,
          label_hi VARCHAR(255),
          "order" INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS faq_items (
          id VARCHAR(64) PRIMARY KEY,
          category_id VARCHAR(64) REFERENCES faq_categories(id) ON DELETE CASCADE,
          question_en TEXT NOT NULL,
          question_hi TEXT,
          answer_en TEXT NOT NULL,
          answer_hi TEXT,
          related_screen VARCHAR(100),
          views INTEGER DEFAULT 0,
          unanswered_flag BOOLEAN DEFAULT FALSE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Consultant bookings & call log tables (PRD Section 8.3 – Consultant Support)
      await this.query(`
        CREATE TABLE IF NOT EXISTS consultant_bookings (
          id            TEXT PRIMARY KEY,
          user_id       TEXT NOT NULL,
          consultant_id TEXT NOT NULL DEFAULT 'primary',
          scheduled_at  TEXT NOT NULL,
          topic         TEXT,
          notes         TEXT,
          status        TEXT NOT NULL DEFAULT 'booked',
          created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_bookings_user ON consultant_bookings(user_id);

        CREATE TABLE IF NOT EXISTS consultant_call_logs (
          id            TEXT PRIMARY KEY,
          user_id       TEXT NOT NULL,
          consultant_id TEXT NOT NULL DEFAULT 'primary',
          initiated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          booking_id    TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_call_logs_user ON consultant_call_logs(user_id);
      `);

      // Recommendation Engine Schema (Sections 3, 4, 5, 9, 11)
      await this.query(`
        CREATE TABLE IF NOT EXISTS applicant_profiles (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          step1_json TEXT NOT NULL,
          step2_json TEXT NOT NULL,
          step3_json TEXT NOT NULL,
          step4_json TEXT NOT NULL,
          step5_json TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_applicant_profiles_user ON applicant_profiles(user_id);

        CREATE TABLE IF NOT EXISTS comprehensive_profiles (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'DRAFT',
          completeness_score INTEGER DEFAULT 0,
          profile_data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_comprehensive_profiles_user ON comprehensive_profiles(user_id);

        CREATE TABLE IF NOT EXISTS profile_sensitive_data (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          step6_json TEXT NOT NULL,
          consent_given_at TIMESTAMP NOT NULL,
          consent_withdrawn_at TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_profile_sensitive_user ON profile_sensitive_data(user_id);

        CREATE TABLE IF NOT EXISTS universities (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          official_website TEXT NOT NULL,
          city VARCHAR(100) NOT NULL,
          federal_state VARCHAR(100) NOT NULL,
          institution_type VARCHAR(50) NOT NULL,
          public_or_private VARCHAR(20) NOT NULL,
          international_admissions_url TEXT NOT NULL,
          tuition_fee_information TEXT NOT NULL,
          semester_contribution REAL NOT NULL DEFAULT 300,
          general_contact_url TEXT NOT NULL,
          source_url TEXT NOT NULL,
          living_cost_estimate_monthly REAL NOT NULL DEFAULT 934,
          campus_setting VARCHAR(100),
          last_verified_at TIMESTAMP NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_universities_state ON universities(federal_state);
        CREATE INDEX IF NOT EXISTS idx_universities_type ON universities(institution_type);

        CREATE TABLE IF NOT EXISTS programmes (
          id VARCHAR(64) PRIMARY KEY,
          university_id VARCHAR(64) NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
          programme_name VARCHAR(255) NOT NULL,
          degree_level VARCHAR(50) NOT NULL,
          subject_area VARCHAR(100) NOT NULL,
          specialisation VARCHAR(255),
          teaching_language VARCHAR(50) NOT NULL,
          accepted_language_certificates TEXT,
          minimum_language_scores TEXT,
          minimum_academic_grade REAL NOT NULL,
          required_previous_degree VARCHAR(255) NOT NULL,
          required_subjects TEXT,
          required_credit_categories TEXT,
          gre_requirement VARCHAR(50) DEFAULT 'NOT_REQUIRED',
          other_entrance_tests TEXT,
          application_method VARCHAR(50) NOT NULL,
          application_open_date_winter VARCHAR(50),
          application_deadline_winter VARCHAR(50) NOT NULL,
          application_open_date_summer VARCHAR(50),
          application_deadline_summer VARCHAR(50),
          intake VARCHAR(50) NOT NULL DEFAULT 'WINTER',
          tuition_fee REAL NOT NULL DEFAULT 0,
          semester_contribution REAL NOT NULL DEFAULT 300,
          estimated_duration_semesters INTEGER NOT NULL DEFAULT 4,
          official_programme_url TEXT NOT NULL,
          official_admission_requirements_url TEXT NOT NULL,
          data_source TEXT NOT NULL,
          last_verified_at TIMESTAMP NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_programmes_uni ON programmes(university_id);
        CREATE INDEX IF NOT EXISTS idx_programmes_subject ON programmes(subject_area);
        CREATE INDEX IF NOT EXISTS idx_programmes_level ON programmes(degree_level);
        CREATE INDEX IF NOT EXISTS idx_programmes_lang ON programmes(teaching_language);

        CREATE TABLE IF NOT EXISTS scholarships (
          id VARCHAR(64) PRIMARY KEY,
          scholarship_name VARCHAR(255) NOT NULL,
          provider_name VARCHAR(255) NOT NULL,
          provider_type VARCHAR(50) NOT NULL,
          associated_university_id VARCHAR(64) REFERENCES universities(id) ON DELETE SET NULL,
          funding_type VARCHAR(50) NOT NULL,
          funding_amount REAL NOT NULL,
          currency VARCHAR(10) DEFAULT 'EUR',
          payment_frequency VARCHAR(50) NOT NULL,
          duration_months INTEGER NOT NULL,
          tuition_coverage BOOLEAN DEFAULT FALSE,
          living_cost_coverage BOOLEAN DEFAULT FALSE,
          insurance_coverage BOOLEAN DEFAULT FALSE,
          travel_allowance BOOLEAN DEFAULT FALSE,
          nationality_eligibility TEXT NOT NULL,
          eligible_degree_levels TEXT NOT NULL,
          eligible_subjects TEXT NOT NULL,
          minimum_academic_requirements TEXT,
          financial_need_requirement BOOLEAN DEFAULT FALSE,
          sports_achievement_requirement BOOLEAN DEFAULT FALSE,
          gender_related_eligibility VARCHAR(50) DEFAULT 'NONE',
          disability_related_eligibility VARCHAR(50) DEFAULT 'NONE',
          other_eligibility_conditions TEXT,
          required_documents TEXT NOT NULL,
          application_method VARCHAR(100) NOT NULL,
          application_deadline VARCHAR(50) NOT NULL,
          official_application_url TEXT NOT NULL,
          official_eligibility_url TEXT NOT NULL,
          source_url TEXT NOT NULL,
          verification_status VARCHAR(50) DEFAULT 'VERIFIED',
          last_verified_at TIMESTAMP NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_scholarships_provider ON scholarships(provider_name);

        CREATE TABLE IF NOT EXISTS scholarship_rules (
          id VARCHAR(64) PRIMARY KEY,
          scholarship_id VARCHAR(64) NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
          rule_type VARCHAR(50) NOT NULL,
          rule_description TEXT NOT NULL,
          condition_type VARCHAR(50) NOT NULL,
          condition_value TEXT NOT NULL,
          mandatory_or_preferred VARCHAR(50) DEFAULT 'MANDATORY',
          evidence_required TEXT NOT NULL,
          exception_notes TEXT,
          official_source_url TEXT NOT NULL,
          last_verified_at TIMESTAMP NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_rules_scholarship ON scholarship_rules(scholarship_id);
        CREATE INDEX IF NOT EXISTS idx_rules_type ON scholarship_rules(rule_type);

        CREATE TABLE IF NOT EXISTS saved_shortlists (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          item_type VARCHAR(50) NOT NULL,
          item_id VARCHAR(64) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, item_type, item_id)
        );
        CREATE INDEX IF NOT EXISTS idx_shortlists_user ON saved_shortlists(user_id);

        CREATE TABLE IF NOT EXISTS application_roadmaps (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          step_number INTEGER NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          category VARCHAR(50) NOT NULL,
          is_mandatory BOOLEAN DEFAULT TRUE,
          is_completed BOOLEAN DEFAULT FALSE,
          due_date VARCHAR(50),
          action_url TEXT,
          conditional_reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON application_roadmaps(user_id);

        CREATE TABLE IF NOT EXISTS financial_scenarios (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          scenario_name VARCHAR(255) NOT NULL,
          scenario_data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_financial_scenarios_user ON financial_scenarios(user_id);
      `);

      this.logger.log('Database tables verified/initialized successfully (users, applicants, profile_fields, agent_events, documents, inconsistencies, entitlements, payments, video_intros, purchases, recommendations, faq, consultant_bookings, consultant_call_logs, applicant_profiles, profile_sensitive_data, universities, programmes, scholarships, scholarship_rules, saved_shortlists, application_roadmaps, financial_scenarios)');
    } catch (err) {
      this.logger.error('Failed to initialize database schema', err.stack);
    }
  }

  async checkConnection(): Promise<{ connected: boolean; isInMemory: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      return {
        connected: true,
        isInMemory: this.isInMemory,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return {
        connected: false,
        isInMemory: this.isInMemory,
        error: error.message,
      };
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.pool.query(text, params);
  }
}
