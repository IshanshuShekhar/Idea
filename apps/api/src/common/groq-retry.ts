import { Logger } from '@nestjs/common';

const RETRY_DELAYS_MS = [1000, 3000, 6000] as const;

export async function retryGroqUnavailable<T>(
  operation: () => Promise<T>,
  operationName: string,
  logger: Logger,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      const status = error?.status ?? error?.statusCode;
      if ((status !== 503 && status !== 429) || attempt >= RETRY_DELAYS_MS.length) {
        throw error;
      }

      const delayMs = RETRY_DELAYS_MS[attempt];
      logger.warn(
        `${operationName} received HTTP ${status}; retrying in ${delayMs}ms (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length}).`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
