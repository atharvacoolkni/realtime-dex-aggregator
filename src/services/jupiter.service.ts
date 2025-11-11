import axios, { AxiosInstance } from 'axios';
import { TokenData, DEXSource } from '../types/token';
import { RateLimiter } from '../utils/rateLimiter';
import { ExponentialBackoff } from '../utils/exponentialBackoff';

export class JupiterService {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private backoff: ExponentialBackoff;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://lite-api.jup.ag',
      timeout: 10000,
    });

    this.rateLimiter = new RateLimiter(100, 60000);
    this.backoff = new ExponentialBackoff(5, 1000, 30000);
  }

  async searchTokens(query: string = 'SOL'): Promise<TokenData[]> {
    await this.rateLimiter.waitForSlot('jupiter');

    return this.backoff.execute(async () => {
      const response = await this.client.get('/tokens/v2/search', {
        params: { query }
      });

      if (!response.data) {
        return [];
      }

      return this.transformTokens(response.data);
    }, ExponentialBackoff.isRetryableError);
  }

  async getTokenPrice(tokenAddress: string): Promise<number | null> {
    await this.rateLimiter.waitForSlot('jupiter');

    return this.backoff.execute(async () => {
      const response = await this.client.get(`/price/v2`, {
        params: { ids: tokenAddress }
      });

      if (!response.data || !response.data.data || !response.data.data[tokenAddress]) {
        return null;
      }

      return response.data.data[tokenAddress].price || null;
    }, ExponentialBackoff.isRetryableError);
  }

  private transformTokens(tokens: any[]): TokenData[] {
    const solPrice = 150;

    return tokens
      .filter(token => token.address)
      .map(token => {
        const priceUsd = parseFloat(token.price) || 0;
        const priceSol = priceUsd / solPrice;

        return {
          token_address: token.address,
          token_name: token.name || 'Unknown',
          token_ticker: token.symbol || 'UNKNOWN',
          price_sol: priceSol,
          market_cap_sol: (parseFloat(token.marketCap) || 0) / solPrice,
          volume_sol: (parseFloat(token.volume24h) || 0) / solPrice,
          liquidity_sol: (parseFloat(token.liquidity) || 0) / solPrice,
          transaction_count: 0,
          price_1hr_change: parseFloat(token.priceChange1h) || 0,
          price_24hr_change: parseFloat(token.priceChange24h) || 0,
          price_7d_change: parseFloat(token.priceChange7d) || 0,
          protocol: DEXSource.JUPITER,
          last_updated: Date.now()
        };
      });
  }
}
