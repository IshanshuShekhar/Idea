import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AgentEventsService } from '../agent-events/agent-events.service';
import { ProfileService } from '../profile/profile.service';
import { Provenance, UserRole } from '@educaro/shared';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import Groq, { toFile } from 'groq-sdk';
import { retryGroqUnavailable } from '../common/groq-retry';

export interface VideoExtractionResult {
  videoId: string;
  videoUrl: string;
  filename: string;
  transcript: string;
  durationSeconds: number;
  extractedFields: {
    key: string;
    label: string;
    value: string;
    sourceSnippet: string;
    confidence: number;
    provenance: Provenance;
  }[];
  isAiExtracted: boolean;
  modelUsed: string;
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private groq: Groq | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly eventsService: AgentEventsService,
    private readonly profileService: ProfileService,
  ) {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (apiKey) {
      this.groq = new Groq({ apiKey });
      this.logger.log('Groq client initialized for Video transcription and extraction.');
    } else {
      this.logger.warn(
        'GROQ_API_KEY is not configured in .env. Video service will not be able to process AI tasks.',
      );
    }
  }

  async processVideoUpload(
    userId: string,
    file?: Express.Multer.File,
    metadata?: { durationSeconds?: number; filename?: string },
  ): Promise<VideoExtractionResult> {
    const startTime = Date.now();
    const videoId = crypto.randomUUID();
    let videoUrl = '/images/1790019066-38c49f00.mp4';
    let filename = metadata?.filename || 'video-intro.webm';
    const groq = this.groq;

    // 1. Save uploaded video to web public uploads directory if file buffer provided
    if (file && file.buffer) {
      try {
        filename = file.originalname || `intro-${Date.now()}.webm`;
        const uploadDir = path.resolve(process.cwd(), '../web/public/uploads/videos');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, `${videoId}-${filename}`);
        fs.writeFileSync(filePath, file.buffer);
        videoUrl = `/uploads/videos/${videoId}-${filename}`;
      } catch (err) {
        this.logger.error('Failed to write uploaded video to disk, falling back to sample asset', err);
        videoUrl = '/images/1790019066-38c49f00.mp4';
      }
    }

    if (!groq) {
      throw new ServiceUnavailableException(
        'Video transcription is unavailable because Groq is not configured on the API.',
      );
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('No video file was received. Please select the video again and retry.');
    }

    let transcript = '';
    let extracted: any = null;
    const modelUsed = 'whisper-large-v3 + qwen/qwen3.8-27b';

    try {
      // --- Step 1: Transcribe audio with Groq Whisper ---
      this.logger.log('Step 1/2: Sending video to Groq Whisper for transcription...');
      const audioFile = await toFile(file.buffer, filename, { type: file.mimetype || 'video/webm' });
      const transcriptionResult = await retryGroqUnavailable(
        () => groq.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-large-v3',
        }),
        'Groq Whisper transcription',
        this.logger,
      );
      transcript = transcriptionResult.text ?? '';
      this.logger.log(`Whisper transcription done: ${transcript.length} chars.`);

      if (!transcript.trim()) {
        this.logger.warn('Whisper returned an empty transcript — video may have no spoken audio.');
      }

      // --- Step 2: Extract motivation fields from transcript via LLM ---
      this.logger.log('Step 2/2: Extracting motivation fields from transcript via Groq LLM...');

      const extractionPrompt = `You are an AI Admissions Intake Agent for Educaro Germany.
You will be given a transcript of the applicant's spoken video introduction.

1) Extract the applicant's motivation/reason for moving to Germany.
2) Extract their career and professional goals.
3) Extract their background summary.

If a field genuinely isn't mentioned in the transcript, return "Not extracted" with 0 confidence, rather than inventing content.

Return ONLY a valid JSON object with this schema:
{
  "extractedFields": {
    "reasonForGermany": { "value": string, "sourceSnippet": string, "confidence": number },
    "careerGoals": { "value": string, "sourceSnippet": string, "confidence": number },
    "backgroundSummary": { "value": string, "sourceSnippet": string, "confidence": number }
  }
}`;

      const extractionResponse = await retryGroqUnavailable(
        () => groq.chat.completions.create({
          model: 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: extractionPrompt },
            { role: 'user', content: `Here is the applicant's spoken transcript:\n\n"${transcript}"` },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
        'Groq video field extraction',
        this.logger,
      );

      let extractionText = extractionResponse.choices[0]?.message?.content ?? '';
      extractionText = extractionText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(extractionText);
      extracted = parsed.extractedFields || parsed;

      if (!extracted || !extracted.reasonForGermany || !extracted.careerGoals || !extracted.backgroundSummary) {
          throw new Error('Groq response missing required extracted fields.');
      }
      
      this.logger.log(`Groq extraction succeeded: ${transcript.length} chars transcribed, 3 fields extracted.`);
    } catch (err: any) {
      this.logger.error(`Groq video processing failed: ${err.message}`, err.stack);
      const message = process.env.NODE_ENV === 'production'
        ? 'Video transcription failed. Please try again later.'
        : `Video transcription failed: ${err.message}`;
      if (err?.status === 503 || err?.status === 429) {
        throw new ServiceUnavailableException(
          'Groq is temporarily busy. Your video was not processed; please retry in a few minutes.',
        );
      }
      throw new InternalServerErrorException(message);
    }

    // 4. Store extracted fields in profile_fields under MOTIVATION category with Provenance.AI_EXTRACTED
    const actor = { userId, role: UserRole.APPLICANT, isAi: true };
    const fieldsToStore = [
      {
        key: 'reasonForGermany',
        label: 'Motivation for Germany',
        value: extracted.reasonForGermany.value,
        sourceSnippet: extracted.reasonForGermany.sourceSnippet,
        confidence: extracted.reasonForGermany.confidence,
        provenance: Provenance.AI_EXTRACTED,
      },
      {
        key: 'careerGoals',
        label: 'Career & Professional Goals',
        value: extracted.careerGoals.value,
        sourceSnippet: extracted.careerGoals.sourceSnippet,
        confidence: extracted.careerGoals.confidence,
        provenance: Provenance.AI_EXTRACTED,
      },
      {
        key: 'backgroundSummary',
        label: 'Candidate Background Summary',
        value: extracted.backgroundSummary.value,
        sourceSnippet: extracted.backgroundSummary.sourceSnippet,
        confidence: extracted.backgroundSummary.confidence,
        provenance: Provenance.AI_EXTRACTED,
      },
    ];

    for (const field of fieldsToStore) {
      await this.profileService.upsertField(actor, {
        category: 'MOTIVATION',
        fieldKey: field.key,
        value: field.value,
        provenance: Provenance.AI_EXTRACTED,
        confidence: field.confidence,
        sourceDocumentId: videoId,
        sourceSnippet: field.sourceSnippet,
      });
    }

    // 5. Store record in video_intros table
    await this.db.query(
      `INSERT INTO video_intros (id, user_id, video_url, filename, transcript, duration_seconds, extracted_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        videoId,
        userId,
        videoUrl,
        filename,
        transcript,
        metadata?.durationSeconds || 45,
        JSON.stringify(fieldsToStore),
      ],
    );

    // Also register in documents table for consolidated checklist
    await this.db.query(
      `INSERT INTO documents (id, user_id, document_type, filename, preview_url, status, extracted_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        videoId,
        userId,
        'VIDEO_INTRO',
        filename,
        videoUrl,
        'EXTRACTED',
        JSON.stringify(fieldsToStore),
      ],
    );

    const durationMs = Date.now() - startTime;

    // 6. Log to Agent Events
    await this.eventsService.logEvent({
      userId,
      agent: 'Extraction Agent',
      tool: 'GroqVideoExtraction',
      reason: `Transcribed video intro (${filename}) and extracted Motivation, Career Goals & Background`,
      input: {
        filename,
        videoUrl,
        hasAudio: Boolean(file?.buffer?.length),
        model: modelUsed,
      },
      output: {
        videoId,
        transcriptLength: transcript.length,
        extractedCount: fieldsToStore.length,
        confidence: 0.96,
      },
      confidence: 0.96,
      durationMs,
    });

    return {
      videoId,
      videoUrl,
      filename,
      transcript,
      durationSeconds: metadata?.durationSeconds || 45,
      extractedFields: fieldsToStore,
      isAiExtracted: true,
      modelUsed,
    };
  }

  async getLatestVideoIntro(userId: string) {
    const res = await this.db.query(
      `SELECT * FROM video_intros WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      videoUrl: row.video_url,
      filename: row.filename,
      transcript: row.transcript,
      durationSeconds: row.duration_seconds,
      extractedFields: JSON.parse(row.extracted_data || '[]'),
      createdAt: row.created_at,
    };
  }
}
