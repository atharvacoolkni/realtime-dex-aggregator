export class ExponentialBackoff {
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;

  constructor(maxRetries: number = 5, baseDelay: number = 1000, maxDelay: number = 30000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  async execute<T>(
    fn: () => Promise<T>,
    retryableErrors: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!retryableErrors(error) || attempt === this.maxRetries) {
          throw error;
        }

        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          this.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  static isRetryableError(error: any): boolean {
    if (error.response) {
      const status = error.response.status;
      return status === 429 || status >= 500;
    }

    if (error.code) {
      return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(error.code);
    }

    return true;
  }
}
