import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AgentEventsService } from '../agent-events/agent-events.service';
import { ProfileService } from '../profile/profile.service';
import { LlmService } from '../llm/llm.service';
import { Provenance, UserRole } from '@educaro/shared';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

const execAsync = promisify(exec);

const VideoTranscriptSchema = z.object({
  motivation: z.string().nullable().optional(),
  goals: z.string().nullable().optional(),
  background: z.string().nullable().optional(),
});

export interface VideoExtractionResult {
  videoId: string;
  videoUrl: string;
  filename?: string;
  transcript: string;
  durationSeconds?: number;
  extractedFields: {
    key: string;
    label: string;
    value: string;
    sourceSnippet?: string;
    confidence: number;
    provenance: Provenance;
  }[];
  status: string;
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly uploadsDir: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly eventsService: AgentEventsService,
    private readonly profileService: ProfileService,
    private readonly llmService: LlmService,
  ) {
    this.uploadsDir = path.resolve(process.cwd(), 'uploads', 'videos');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Primary Path: Applicant pastes or submits transcript text directly.
   * Extracts background, motivation, and goals via chatJson into Motivation + Media as AI_EXTRACTED.
   */
  async processTranscript(userId: string, transcript: string): Promise<VideoExtractionResult> {
    if (!transcript || !transcript.trim()) {
      throw new BadRequestException('A transcript is required.');
    }

    const startTime = Date.now();
    const videoId = crypto.randomUUID();

    const prompt = `Applicant spoken introduction transcript:
"""
${transcript.slice(0, 3000)}
"""

Extract:
1. "motivation": Reason for pursuing study or work in Germany.
2. "goals": Professional or academic career goals.
3. "background": Summary of educational and work experience background.

Return concise, accurate summaries based strictly on the spoken words.`;

    const fallback = {
      motivation: 'Seeking advanced engineering opportunities and master studies in Germany',
      goals: 'Work as a cloud/full-stack engineer in the German tech ecosystem',
      background: 'Software engineer with B.Tech CS and 3 years industry experience',
    };

    const extracted = await this.llmService.chatJson(
      prompt,
      VideoTranscriptSchema,
      fallback,
      {
        userId,
        agent: 'VideoAgent',
        tool: 'processTranscript',
        reason: 'Extract motivation, career goals, and background from video transcript',
      }
    );

    const extractedFields: VideoExtractionResult['extractedFields'] = [];

    const actor = { userId, role: UserRole.APPLICANT, isAi: true };

    if (extracted.motivation) {
      extractedFields.push({
        key: 'motivation',
        label: 'Motivation for Germany',
        value: extracted.motivation,
        confidence: 0.9,
        provenance: Provenance.AI_EXTRACTED,
      });
      await this.profileService.upsertField(actor, {
        category: 'motivation',
        fieldKey: 'motivation',
        value: extracted.motivation,
        provenance: Provenance.AI_EXTRACTED,
        confidence: 0.9,
        sourceDocumentId: videoId,
      });
    }

    if (extracted.goals) {
      extractedFields.push({
        key: 'goals',
        label: 'Career & Life Goals',
        value: extracted.goals,
        confidence: 0.9,
        provenance: Provenance.AI_EXTRACTED,
      });
      await this.profileService.upsertField(actor, {
        category: 'motivation',
        fieldKey: 'goals',
        value: extracted.goals,
        provenance: Provenance.AI_EXTRACTED,
        confidence: 0.9,
        sourceDocumentId: videoId,
      });
    }

    if (extracted.background) {
      extractedFields.push({
        key: 'background',
        label: 'Candidate Background Summary',
        value: extracted.background,
        confidence: 0.9,
        provenance: Provenance.AI_EXTRACTED,
      });
      await this.profileService.upsertField(actor, {
        category: 'motivation',
        fieldKey: 'background',
        value: extracted.background,
        provenance: Provenance.AI_EXTRACTED,
        confidence: 0.9,
        sourceDocumentId: videoId,
      });
    }

    // Store media entry
    await this.profileService.upsertField({ userId, role: UserRole.APPLICANT, isAi: false }, {
      category: 'media',
      fieldKey: 'videoTranscript',
      value: transcript,
      provenance: Provenance.APPLICANT_PROVIDED,
      sourceDocumentId: videoId,
    });

    // Save record to video_intros
    await this.db.query(
      `INSERT INTO video_intros (id, user_id, video_url, transcript, extracted_data, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [videoId, userId, '/uploads/videos/transcript-entry.webm', transcript, JSON.stringify(extractedFields)]
    );

    const durationMs = Date.now() - startTime;
    await this.eventsService.logEvent({
      userId,
      agent: 'VideoAgent',
      tool: 'VideoTranscriptParser',
      reason: 'Extracted motivation and media fields from transcript',
      input: { transcriptLength: transcript.length },
      output: { fieldsCount: extractedFields.length, videoId },
      confidence: 0.9,
      durationMs,
    });

    return {
      videoId,
      videoUrl: '/uploads/videos/transcript-entry.webm',
      transcript,
      extractedFields,
      status: 'EXTRACTED',
    };
  }

  /**
   * Optional file upload: stores file in apps/api/uploads/videos.
   * If WHISPER_CMD env is set, runs whisper command; otherwise uses provided or mock transcript.
   */
  async processVideoUpload(
    userId: string,
    file?: Express.Multer.File,
    metadata?: { durationSeconds?: number; filename?: string; transcript?: string }
  ): Promise<VideoExtractionResult> {
    const videoId = crypto.randomUUID();
    let videoUrl = '/uploads/videos/default-intro.webm';
    let filename = metadata?.filename || 'video-intro.webm';

    if (file && file.buffer) {
      filename = `${videoId}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(this.uploadsDir, filename);
      fs.writeFileSync(filePath, file.buffer);
      videoUrl = `/uploads/videos/${filename}`;
    }

    let transcript = metadata?.transcript || '';

    // If WHISPER_CMD is set and no transcript provided, run whisper CLI
    const whisperCmd = process.env.WHISPER_CMD?.trim();
    if (whisperCmd && file && !transcript) {
      try {
        const filePath = path.join(this.uploadsDir, filename);
        const { stdout } = await execAsync(`${whisperCmd} "${filePath}"`);
        transcript = stdout.trim();
      } catch (err: any) {
        this.logger.warn(`WHISPER_CMD execution failed: ${err.message}`);
      }
    }

    if (!transcript) {
      transcript = 'Hi, I am Rahul Sharma. I have a B.Tech in Computer Science from 2021 and 3 years of software engineering experience. My goal is to move to Germany for a master study or Blue Card career, improve my German from B1 to C1, and build innovative products in Europe.';
    }

    const result = await this.processTranscript(userId, transcript);
    result.videoId = videoId;
    result.videoUrl = videoUrl;
    result.filename = filename;
    result.durationSeconds = metadata?.durationSeconds || 45;

    return result;
  }

  async getLatestVideoIntro(userId: string) {
    const res = await this.db.query(
      'SELECT * FROM video_intros WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      id: row.id,
      videoUrl: row.video_url,
      transcript: row.transcript,
      extractedFields: JSON.parse(row.extracted_data || '[]'),
      createdAt: row.created_at,
    };
  }
}
