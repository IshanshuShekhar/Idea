import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { UserRole } from '@educaro/shared';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { SeedService } from '../seed/seed.service';

export interface RegisterDto {
  email: string;
  password?: string;
  role?: UserRole;
  consent?: boolean;
}

export interface LoginDto {
  email: string;
  password?: string;
}

export interface SendOtpDto {
  email: string;
}

export interface VerifyOtpDto {
  email: string;
  code: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly seedService: SeedService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.db.query('SELECT id, email, role FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      // Existing user — return login session
      const user = existing.rows[0];
      const tokens = this.generateTokens(user.id, user.email, user.role);
      return {
        user: { id: user.id, email: user.email, role: user.role },
        ...tokens,
      };
    }

    const userId = crypto.randomUUID();
    const role = dto.role || UserRole.APPLICANT;
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : null;
    const consentAt = new Date().toISOString();

    await this.db.query(
      `INSERT INTO users (id, email, password_hash, role, consent_at, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, email, passwordHash, role, consentAt]
    );

    // If applicant, also create applicant profile row
    if (role === UserRole.APPLICANT) {
      const applicantId = crypto.randomUUID();
      await this.db.query(
        `INSERT INTO applicants (id, user_id, email, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [applicantId, userId, email]
      );
    }

    const tokens = this.generateTokens(userId, email, role);
    return {
      user: { id: userId, email, role, consentAt },
      ...tokens,
    };
  }

  /**
   * Email-only or email+password login.
   * Auto-provisions applicant account if email does not exist yet.
   */
  async login(dto: LoginDto) {
    if (!dto || typeof dto.email !== 'string' || !dto.email.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }

    const email = dto.email.trim().toLowerCase();
    const res = await this.db.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (res.rows.length === 0) {
      // Auto-provision user for seamless email-only login
      return this.register({
        email,
        password: dto.password,
        role: UserRole.APPLICANT,
        consent: true,
      });
    }

    const user = res.rows[0];
    if (dto.password && user.password_hash) {
      const valid = await bcrypt.compare(dto.password, user.password_hash);
      if (!valid) {
        throw new BadRequestException('Incorrect password.');
      }
    }

    const tokens = this.generateTokens(user.id, user.email, user.role);
    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  /**
   * Hardcoded demo session for applicant or consultant.
   * Defaults to Rahul Sharma demo applicant.
   */
  async demoLogin(role: UserRole = UserRole.APPLICANT) {
    const email = role === UserRole.CONSULTANT
      ? 'consultant@educaro.de'
      : role === UserRole.ADMIN
        ? 'admin@educaro.de'
        : 'rahul.sharma@example.com';

    if (email === 'rahul.sharma@example.com') {
      // Ensure Rahul persona is seeded with full profile, documents & planted inconsistency
      await this.seedService.seedRahulPersona();
    }

    const existing = await this.db.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length === 0) {
      return this.register({
        email,
        password: 'password123',
        role,
        consent: true,
      });
    }

    const user = existing.rows[0];
    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...this.generateTokens(user.id, user.email, user.role),
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const email = dto.email?.trim().toLowerCase();
    const code = '123456';
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await this.db.query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE email = $3',
      [hash, expiresAt, email]
    );

    return {
      success: true,
      message: `Demo OTP is ${code}`,
      debugOtp: code,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const res = await this.db.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (res.rows.length === 0) {
      return this.register({
        email,
        role: UserRole.APPLICANT,
        consent: true,
      });
    }

    const user = res.rows[0];
    const tokens = this.generateTokens(user.id, user.email, user.role);
    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
    return { accessToken, refreshToken };
  }
}
