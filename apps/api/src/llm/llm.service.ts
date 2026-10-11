import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { AgentEventsService } from '../agent-events/agent-events.service';

export interface LlmContext {
  userId?: string;
  agent?: string;
  tool?: string;
  reason?: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;
  public readonly baseUrl: string;
  public readonly model: string;
  public readonly visionModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventsService: AgentEventsService,
  ) {
    this.baseUrl =
      this.configService.get<string>('LLM_BASE_URL') ||
      process.env.LLM_BASE_URL ||
      'http://localhost:11434/v1';

    const apiKey =
      this.configService.get<string>('LLM_API_KEY') ||
      process.env.LLM_API_KEY ||
      'ollama';

    this.model =
      this.configService.get<string>('LLM_MODEL') ||
      process.env.LLM_MODEL ||
      'llama3.1';

    this.visionModel =
      this.configService.get<string>('LLM_VISION_MODEL') ||
      process.env.LLM_VISION_MODEL ||
      'qwen2.5vl';

    this.openai = new OpenAI({
      baseURL: this.baseUrl,
      apiKey: apiKey,
    });

    this.logger.log(`Initialized LlmService with base ${this.baseUrl}, model: ${this.model}, vision: ${this.visionModel}`);
  }

  /**
   * chatJson: Calls OpenAI-compatible API, enforces JSON schema via Zod, retries up to 2 times (3 total attempts).
   * Logs latency, provider, and model in agent_events. Falls back gracefully on failure so flow never crashes.
   */
  async chatJson<T>(
    prompt: string,
    zodSchema: z.ZodSchema<T>,
    fallbackData?: T,
    context?: LlmContext,
    systemPrompt: string = 'You are a precise data extraction and applicant evaluation assistant. You MUST reply ONLY with a valid JSON object matching the requested schema. Do not include markdown codeblocks or text outside the JSON.'
  ): Promise<T> {
    const agent = context?.agent || 'LlmService';
    const tool = context?.tool || 'chatJson';
    const startTime = Date.now();

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    let lastError: any = null;
    const maxRetries = 2; // 1 initial + 2 retries = 3 attempts total

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const attemptStart = Date.now();
      try {
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });

        const content = response.choices?.[0]?.message?.content?.trim() || '{}';
        
        // Strip markdown backticks if returned despite prompt
        const cleanJson = content
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();

        const parsed = JSON.parse(cleanJson);
        const validated = zodSchema.parse(parsed);

        const durationMs = Date.now() - attemptStart;
        await this.eventsService.logEvent({
          userId: context?.userId,
          agent,
          tool,
          reason: context?.reason || `LLM query processed via ${this.model} (attempt ${attempt + 1})`,
          input: { provider: this.baseUrl, model: this.model, promptLength: prompt.length },
          output: validated as any,
          confidence: 0.95,
          durationMs,
        });

        return validated;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`chatJson attempt ${attempt + 1} failed: ${err.message}`);
        
        // Brief backoff before retry
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 500));
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;
    this.logger.error(`chatJson exhausted all ${maxRetries + 1} attempts: ${lastError?.message}. Falling back.`);

    // Fall back to provided default data or safe mock
    if (fallbackData !== undefined) {
      await this.eventsService.logEvent({
        userId: context?.userId,
        agent,
        tool,
        reason: `Fallback data used due to LLM error: ${lastError?.message || 'unknown error'}`,
        input: { provider: this.baseUrl, model: this.model, promptLength: prompt.length },
        output: fallbackData as any,
        confidence: 0.5,
        durationMs: totalDurationMs,
      });
      return fallbackData;
    }

    // Attempt default empty object parse as safety
    try {
      return zodSchema.parse({});
    } catch {
      throw lastError;
    }
  }

  /**
   * describeImage: Sends an image to the vision model (qwen2.5vl) for text/visual extraction.
   * Logs latency, provider, and model in agent_events. Falls back to graceful text message on failure.
   */
  async describeImage(
    base64Image: string,
    mimeType: string = 'image/jpeg',
    prompt: string = 'Extract all visible text, dates, applicant names, degrees, and certificates from this document image in detail.',
    context?: LlmContext
  ): Promise<string> {
    const agent = context?.agent || 'LlmService';
    const tool = context?.tool || 'describeImage';
    const startTime = Date.now();

    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const resultText = response.choices?.[0]?.message?.content || '';
      const durationMs = Date.now() - startTime;

      await this.eventsService.logEvent({
        userId: context?.userId,
        agent,
        tool,
        reason: context?.reason || `Vision extraction completed with ${this.visionModel}`,
        input: { provider: this.baseUrl, visionModel: this.visionModel, mimeType },
        output: { textLength: resultText.length, sample: resultText.slice(0, 150) },
        confidence: 0.9,
        durationMs,
      });

      return resultText;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.logger.warn(`describeImage failed with ${this.visionModel}: ${err.message}. Gracefully falling back.`);

      await this.eventsService.logEvent({
        userId: context?.userId,
        agent,
        tool,
        reason: `Vision call failed: ${err.message}. Using fallback.`,
        input: { provider: this.baseUrl, visionModel: this.visionModel, mimeType },
        output: { error: err.message },
        confidence: 0.2,
        durationMs,
      });

      return '';
    }
  }
}
