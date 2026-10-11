import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AgentEventsService } from '../agent-events/agent-events.service';
import { ProfileService } from '../profile/profile.service';
import { Provenance, UserRole, ExtractedDocument, ExtractedField, DocumentType } from '@educaro/shared';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import Groq from 'groq-sdk';
import { PDFParse } from 'pdf-parse';
import * as Tesseract from 'tesseract.js';
import { retryGroqUnavailable } from '../common/groq-retry';

export interface DocumentUploadDto {
  userId: string;
  documentType: DocumentType;
  filename: string;
  base64Data?: string;
  simulatedSampleId?: string;
}

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private groq: Groq | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly eventsService: AgentEventsService,
    private readonly profileService: ProfileService,
  ) {
    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
    }
  }

  async processDocumentExtraction(dto: DocumentUploadDto, file: Express.Multer.File): Promise<ExtractedDocument> {
    const startTime = Date.now();
    const docId = crypto.randomUUID();
    const groq = this.groq;

    if (!groq) {
      throw new BadRequestException('GROQ_API_KEY is not configured in the backend environment.');
    }

    let extractedFields: ExtractedField[] = [];
    let overallConfidence = 0.0;

    // Generate prompt based on document type
    let prompt = `You are an expert document extraction AI performing OCR-level precise extraction from the attached ${dto.documentType} document.

CRITICAL INSTRUCTIONS FOR DATE/YEAR FIELDS:
- Read every printed date and year CHARACTER BY CHARACTER, digit by digit. Do NOT guess or approximate.
- For years: read each of the 4 digits individually (e.g., "2", "0", "2", "4" = "2024"). Never round to a nearby year.
- If ANY digit in a date/year is blurry, obscured, or ambiguous, set confidence to 0.3 or lower and include a note in sourceSnippet explaining which digit(s) are unclear (e.g., "Third digit unclear: could be '2' or '0', reading as '2024' but uncertain").
- NEVER confidently return a round year like 2000, 2010, 2020 unless you can clearly read each individual digit. Round years from blurry documents are almost always misreads.
- If you truly cannot read a date at all, return the value as null rather than guessing.

GENERAL INSTRUCTIONS:
- Extract values EXACTLY as printed on the document. Do not infer, guess, or fill in from general knowledge.
- Return ONLY a valid JSON object containing an "extractedFields" array of objects. Do not include markdown formatting like \`\`\`json.

Each object must have:
- "key": string (a camelCase identifier for the field)
- "label": string (human readable name of the field)
- "value": string (the extracted value EXACTLY as printed. If not found or truly unreadable, return null)
- "confidence": number (between 0.0 and 1.0. Use 0.9+ only when text is crisp and unambiguous. Use 0.5-0.8 for slightly unclear text. Use below 0.5 for blurry/guessed values)
- "sourceSnippet": string (the exact text snippet from the document where you found this, including surrounding context. For dates, include the full date string as printed. If any digits were unclear, note which ones)

`;

    if (dto.documentType === 'DEGREE_CERTIFICATE') {
      prompt += `Fields to extract:
- key: "degreeName", label: "Degree Title" — the full degree name as printed (e.g., "Bachelor of Technology", "Master of Science")
- key: "institution", label: "Awarding University" — the exact university/institution name as printed on the certificate
- key: "fieldOfStudy", label: "Field of Study" — the branch/major/discipline as printed
- key: "graduationDate", label: "Date / Year of Passing" — READ THIS VERY CAREFULLY DIGIT BY DIGIT. Extract the exact year or full date of graduation/passing as printed. This is the most critical field.
- key: "gradeOrGpa", label: "CGPA / Classification" — exact grade, CGPA, percentage, or classification as printed`;
    } else if (dto.documentType === 'LANGUAGE_CERTIFICATE') {
      prompt += `Fields to extract:
- key: "certificateIssuer", label: "Exam Board / Institute" — exact issuing organization name as printed
- key: "germanLevel", label: "CEFR German Level" — the exact CEFR level (A1, A2, B1, B2, C1, C2) as printed
- key: "score", label: "Overall Grade / Points" — exact score or grade as printed
- key: "testDate", label: "Examination Date" — READ THIS DIGIT BY DIGIT. The exact examination date as printed`;
    } else if (dto.documentType === 'PASSPORT') {
      prompt += `Fields to extract:
- key: "fullName", label: "Full Name" — exact full name as printed in the passport
- key: "passportNumber", label: "Passport Number" — exact passport number as printed, character by character
- key: "nationality", label: "Nationality" — nationality as printed
- key: "expiryDate", label: "Expiry Date" — READ THIS DIGIT BY DIGIT. Exact expiry date as printed`;
    } else if (dto.documentType === 'VISA') {
      prompt += `Fields to extract:
- key: "visaType", label: "Visa Type" — visa category/type as printed
- key: "validityDates", label: "Validity Dates" — READ EACH DATE DIGIT BY DIGIT. Exact validity period as printed
- key: "visaNumber", label: "Visa / Sticker Number" — exact visa/sticker number as printed, character by character`;
    } else {
      prompt += `Extract any relevant key fields you can find. Provide appropriate key, label, value, confidence, and sourceSnippet. For any dates, read each digit individually and carefully.`;
    }

    const uploadDir = path.resolve(process.cwd(), '../web/public/uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    let previewUrl = '';
    
    // Extract raw text
    let rawText = '';
    let extractionMethod = '';

    if (file.mimetype === 'application/pdf') {
      const parser = new PDFParse({ data: file.buffer });
      try {
        this.logger.log(`Extracting text layer from PDF ${dto.filename} using pdf-parse...`);
        const pdfData = await parser.getText();
        rawText = pdfData.text ? pdfData.text.trim() : '';
        extractionMethod = 'pdf-parse';
        
        const previewFilename = `${docId}.pdf`;
        fs.writeFileSync(path.join(uploadDir, previewFilename), file.buffer);
        previewUrl = `/uploads/documents/${previewFilename}`;

        if (!rawText || rawText.length < 50) {
          this.logger.warn(`pdf-parse returned empty/short text. Document may be a scanned image. Tesseract fallback for PDFs requires a PDF-to-image converter, which was removed.`);
        }
      } catch (err: any) {
        this.logger.error(`pdf-parse failed for ${dto.filename}: ${err.message}`, err.stack);
        throw new BadRequestException(`Failed to read PDF text. Error: ${err.message}`);
      } finally {
        await parser.destroy();
      }
    } else if (file.mimetype.startsWith('image/')) {
      const ext = file.mimetype === 'image/jpeg' ? 'jpg' : file.mimetype === 'image/png' ? 'png' : 'webp';
      const previewFilename = `${docId}.${ext}`;
      fs.writeFileSync(path.join(uploadDir, previewFilename), file.buffer);
      previewUrl = `/uploads/documents/${previewFilename}`;

      try {
        this.logger.log(`Running Tesseract OCR on image ${dto.filename}...`);
        const { data } = await Tesseract.recognize(file.buffer, 'eng');
        rawText = data.text ? data.text.trim() : '';
        extractionMethod = 'tesseract';
      } catch (err: any) {
        this.logger.error(`Tesseract OCR failed: ${err.message}`, err.stack);
        throw new BadRequestException(`Failed to run OCR on image. Error: ${err.message}`);
      }
    } else {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}. Please upload a PDF, JPEG, PNG, or WEBP.`);
    }

    this.logger.log(`Raw text extracted (${extractionMethod}): ${rawText.substring(0, 100)}...`);

    try {
      this.logger.log(`Sending structured extraction request for ${dto.documentType} to Groq (openai/gpt-oss-120b)`);

      const response = await retryGroqUnavailable(
        () => groq.chat.completions.create({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: prompt },
            {
              role: 'user',
              content: `Please extract the fields from the following OCR/parsed text for this ${dto.documentType}:\n\n${rawText}`
            }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        }),
        `Groq extraction for ${dto.documentType}`,
        this.logger,
      );
      let text = response.choices[0]?.message?.content ?? '';
      
      // Log raw Groq response for debugging extraction issues
      this.logger.debug(`Groq raw response for ${dto.documentType} (${dto.filename}): ${text.substring(0, 2000)}`);
      
      // Clean up markdown if Groq returned it despite instructions
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      if (!text) {
        throw new Error('Groq returned an empty response — the document may be unreadable or in an unsupported format.');
      }

      const parsedResponse = JSON.parse(text);
      const parsedFields = parsedResponse.extractedFields || parsedResponse;
      
      if (Array.isArray(parsedFields)) {
        extractedFields = parsedFields.filter(f => f.value !== null && f.value !== undefined).map(f => {
          let confidence = Number(f.confidence) || 0;
          const value = String(f.value);

          // Safety check: if a date/year field returns a suspiciously round year (2000, 2010, 2020),
          // cap its confidence at 0.4 since round years from OCR are almost always misreads
          const isDateField = /date|year|passing|graduation|expiry|validity/i.test(f.key + ' ' + f.label);
          if (isDateField && /\b(2000|2010|2020|1990|1980|1970)\b/.test(value) && confidence > 0.4) {
            this.logger.warn(`Round-year safety: clamping confidence for ${f.key}="${value}" from ${confidence} to 0.4 — likely OCR misread`);
            confidence = 0.4;
          }

          return {
            key: f.key,
            label: f.label,
            value,
            confidence,
            sourceSnippet: f.sourceSnippet || '',
            provenance: Provenance.AI_EXTRACTED
          };
        });
        
        if (extractedFields.length > 0) {
          overallConfidence = extractedFields.reduce((sum, f) => sum + f.confidence, 0) / extractedFields.length;
        }
      }
    } catch (error: any) {
      // DO NOT fall back to hardcoded fake data — that was the root cause of the 2024→2000 bug.
      // Instead, log the error clearly and throw so the user knows extraction failed.
      this.logger.error(`Groq extraction FAILED for ${dto.documentType} (${dto.filename}): ${error.message}`, error.stack);

      if (error?.status === 503 || error?.status === 429) {
        throw new ServiceUnavailableException(
          'Groq is temporarily busy. Your document was not processed; please retry in a few minutes.',
        );
      }

      throw new BadRequestException(
        `Document extraction failed: ${error.message}. Please try re-uploading the document. ` +
        `Ensure the image is clear, well-lit, and in a supported format (JPEG, PNG, or PDF).`
      );
    }

    // Save to documents table
    await this.db.query(
      `INSERT INTO documents (id, user_id, document_type, filename, preview_url, status, extracted_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        docId,
        dto.userId,
        dto.documentType,
        dto.filename,
        previewUrl,
        'EXTRACTED',
        JSON.stringify(extractedFields),
      ]
    );

    // Save fields into profile_fields with AI_EXTRACTED provenance
    const actor = { userId: dto.userId, role: UserRole.APPLICANT, isAi: true };
    for (const field of extractedFields) {
      await this.profileService.upsertField(actor, {
        category: dto.documentType,
        fieldKey: field.key,
        value: field.value,
        provenance: Provenance.AI_EXTRACTED,
        confidence: field.confidence,
        sourceDocumentId: docId,
        sourceSnippet: field.sourceSnippet,
      });
    }

    const durationMs = Date.now() - startTime;

    // Log to Agent Events
    await this.eventsService.logEvent({
      userId: dto.userId,
      agent: 'Extraction Agent (Groq)',
      tool: 'DocumentVisionParser',
      reason: `Parsed uploaded ${dto.documentType.replace('_', ' ')} (${dto.filename})`,
      input: {
        documentType: dto.documentType,
        filename: dto.filename,
        mimeType: file.mimetype,
        bytes: file.size,
      },
      output: {
        documentId: docId,
        fieldsCount: extractedFields.length,
        overallConfidence,
      },
      confidence: overallConfidence,
      durationMs,
    });

    return {
      id: docId,
      documentType: dto.documentType,
      filename: dto.filename,
      previewUrl,
      uploadedAt: new Date().toISOString(),
      extractedFields,
      overallConfidence,
      status: 'EXTRACTED',
    };
  }

  async getDocuments(userId: string): Promise<ExtractedDocument[]> {
    const res = await this.db.query(
      'SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      documentType: r.document_type,
      filename: r.filename,
      previewUrl: r.preview_url,
      uploadedAt: r.created_at,
      extractedFields: JSON.parse(r.extracted_data || '[]'),
      overallConfidence: 0.95,
      status: r.status,
    }));
  }

  async confirmExtractedField(userId: string, docId: string, fieldKey: string, confirmedValue?: string) {
    // When applicant confirms or edits an extracted field, update provenance to APPLICANT_PROVIDED
    const actor = { userId, role: UserRole.APPLICANT, isAi: false };
    
    const existing = await this.db.query(
      'SELECT category, value FROM profile_fields WHERE user_id = $1 AND field_key = $2',
      [userId, fieldKey]
    );

    const val = confirmedValue ?? (existing.rows[0]?.value || '');
    const category = existing.rows[0]?.category || 'DOCUMENTS';

    await this.profileService.upsertField(actor, {
      category,
      fieldKey,
      value: val,
      provenance: Provenance.APPLICANT_PROVIDED,
      sourceDocumentId: docId,
    });

    await this.eventsService.logEvent({
      userId,
      agent: 'Extraction Agent',
      tool: 'FieldConfirmationTool',
      reason: `Applicant reviewed and confirmed field '${fieldKey}'`,
      input: { fieldKey, value: val },
      output: { provenance: Provenance.APPLICANT_PROVIDED, status: 'CONFIRMED' },
      confidence: 1.0,
      durationMs: 45,
    });

    return { success: true, fieldKey, confirmedValue: val, provenance: Provenance.APPLICANT_PROVIDED };
  }

  async deleteDocument(userId: string, docId: string) {
    // Check if document exists and belongs to user
    const docRes = await this.db.query(
      'SELECT id, filename, document_type FROM documents WHERE id = $1 AND user_id = $2',
      [docId, userId]
    );

    if (docRes.rows.length === 0) {
      throw new BadRequestException('Document not found or does not belong to user');
    }

    const doc = docRes.rows[0];

    // Delete the extracted fields associated with this document from profile_fields
    await this.db.query(
      'DELETE FROM profile_fields WHERE user_id = $1 AND source_document_id = $2',
      [userId, docId]
    );

    // Delete the document itself
    await this.db.query(
      'DELETE FROM documents WHERE id = $1 AND user_id = $2',
      [docId, userId]
    );

    // Log the deletion event
    await this.eventsService.logEvent({
      userId,
      agent: 'Extraction Agent',
      tool: 'DocumentDeletionTool',
      reason: `Applicant deleted document '${doc.filename}' (${doc.document_type})`,
      input: { docId },
      output: { status: 'DELETED' },
      confidence: 1.0,
      durationMs: 0,
    });

    return { success: true, message: 'Document deleted successfully' };
  }
}
