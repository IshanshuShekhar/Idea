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
    const values = mappedValues;

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

      this.logger.log('Database tables verified/initialized successfully (users, applicants, profile_fields, agent_events, documents, inconsistencies, entitlements, payments, video_intros, purchases, recommendations, faq, consultant_bookings, consultant_call_logs)');
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
