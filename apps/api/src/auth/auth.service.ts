import { Injectable, BadRequestException, UnauthorizedException, ConflictException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { UserRole } from '@educaro/shared';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

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
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }

    if (!dto.consent) {
      throw new BadRequestException('Consent to process application data is required (PRD Section 7 A5).');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new ConflictException('An account with this email already exists.');
    }

    const userId = crypto.randomUUID();
    const role = dto.role || UserRole.APPLICANT;
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : null;
    const consentAt = new Date().toISOString();

    await this.db.query(
      `INSERT INTO users (id, email, password_hash, role, consent_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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

  async login(dto: LoginDto) {
    if (!dto || typeof dto.email !== 'string' || !dto.email.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }
    if (dto.password !== undefined && typeof dto.password !== 'string') {
      throw new BadRequestException('Password must be a string');
    }

    const email = dto.email.trim().toLowerCase();
    const res = await this.db.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (res.rows.length === 0) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const user = res.rows[0];
    if (user.password_hash) {
      if (!dto.password) {
        throw new BadRequestException('Password is required for this account.');
      }
      const match = await bcrypt.compare(dto.password, user.password_hash);
      if (!match) {
        throw new UnauthorizedException('Invalid email or password.');
      }
    }

    const tokens = this.generateTokens(user.id, user.email, user.role);
    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async sendOtp(dto: SendOtpDto) {
    if (!this.emailService.canSend && !this.emailService.isDemo) {
      throw new ServiceUnavailableException('Email delivery is not configured. Please try again later.');
    }

    const email = dto.email.trim().toLowerCase();
    let res = await this.db.query('SELECT id, email, role FROM users WHERE email = $1', [email]);

    let userId: string;
    let role = UserRole.APPLICANT;

    if (res.rows.length === 0) {
      // Auto-register user with OTP
      userId = crypto.randomUUID();
      await this.db.query(
        `INSERT INTO users (id, email, role, consent_at, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, email, role]
      );
      await this.db.query(
        `INSERT INTO applicants (id, user_id, email, created_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [crypto.randomUUID(), userId, email]
      );
    } else {
      userId = res.rows[0].id;
      role = res.rows[0].role;
    }

    // Generate a crypto-random 6-digit OTP
    const otpCodeRaw = (crypto.randomInt(100000, 1000000)).toString();

    // Hash the OTP before storing (SHA-256 — no need for bcrypt cost for short-lived tokens)
    const otpHash = crypto.createHash('sha256').update(otpCodeRaw).digest('hex');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await this.db.query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3',
      [otpHash, expiresAt, userId]
    );

    if (this.emailService.isDemo) {
      this.logger.warn(`SendGrid is not configured; issuing a demo OTP for ${email}.`);
    } else {
      // Send OTP email via shared EmailService
      try {
        await this.emailService.send(
          {
            to: email,
            subject: 'Your EduRoute AI Login Code',
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #F5F5EF; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; width: 48px; height: 48px; background: #5F7D8B; border-radius: 12px; color: white; font-weight: 700; font-size: 18px; line-height: 48px; text-align: center;">ER</div>
              <h2 style="color: #344653; font-size: 20px; margin: 12px 0 4px;">EduRoute AI — Login Code</h2>
              <p style="color: #71808A; font-size: 13px; margin: 0;">Your one-time login code</p>
            </div>
            <div style="background: #EEF1EB; border: 1px solid #DCE2DC; border-radius: 12px; padding: 24px; text-align: center;">
              <p style="color: #344653; font-size: 13px; margin: 0 0 16px;">Use the code below to sign in. It expires in <strong>10 minutes</strong>.</p>
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #344653; background: #F5F5EF; border-radius: 8px; padding: 16px 24px; display: inline-block; font-family: monospace;">${otpCodeRaw}</div>
              <p style="color: #71808A; font-size: 11px; margin: 16px 0 0;">If you didn't request this, you can safely ignore this email.</p>
            </div>
            <p style="color: #71808A; font-size: 11px; text-align: center; margin-top: 20px;">© EduRoute AI — Your Germany immigration journey starts here.</p>
          </div>
        `,
          },
          { throwOnFailure: true },
        );
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : 'Email provider rejected the request.';
        this.logger.error(`Failed to send verification email: ${reason}`);
        throw new BadRequestException(
          `We couldn't send your verification email. ${reason} Please check your email configuration or contact support.`,
        );
      }

      this.logger.log(`OTP email flow completed successfully for: ${email}`);
    }

    return {
      success: true,
      message: this.emailService.isDemo
        ? 'Email delivery is disabled in demo mode. Use the debug verification code shown below.'
        : `A 6-digit verification code has been sent to ${email}. Please check your inbox.`,
      ...(this.emailService.isDemo ? { debugOtp: otpCodeRaw } : {}),
    };
  }

  async demoLogin(role: UserRole) {
    if (process.env.DEMO_MODE !== 'true') {
      throw new ServiceUnavailableException('Demo login is disabled.');
    }

    const email = role === UserRole.CONSULTANT
      ? 'consultant@educaro.de'
      : role === UserRole.ADMIN
        ? 'admin@educaro.de'
        : 'applicant.demo@educaro.com';
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
    if (user.role !== role) {
      throw new ConflictException('The demo account is configured for a different role.');
    }

    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...this.generateTokens(user.id, user.email, user.role),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const res = await this.db.query(
      'SELECT id, email, role, otp_code, otp_expires_at FROM users WHERE email = $1',
      [email]
    );

    if (res.rows.length === 0) {
      throw new BadRequestException('User not found.');
    }

    const user = res.rows[0];

    if (!user.otp_code) {
      throw new BadRequestException('No verification code found. Please request a new code.');
    }

    // Check expiry before comparing (fail-fast on expired codes)
    if (new Date(user.otp_expires_at) < new Date()) {
      // Clear the expired OTP
      await this.db.query(
        'UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
        [user.id]
      );
      throw new BadRequestException('Your code has expired. Please request a new one.');
    }

    // Verify by hashing the submitted code and comparing to stored hash
    const submittedHash = crypto.createHash('sha256').update(dto.code.trim()).digest('hex');
    if (submittedHash !== user.otp_code) {
      throw new BadRequestException('Incorrect code. Please try again.');
    }

    // Clear OTP and mark verified
    await this.db.query(
      'UPDATE users SET otp_code = NULL, otp_expires_at = NULL, email_verified = TRUE WHERE id = $1',
      [user.id]
    );

    const tokens = this.generateTokens(user.id, user.email, user.role);
    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  private generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }
}
