import axios, { AxiosInstance } from 'axios';
import { TokenData, DEXSource } from '../types/token';
import { RateLimiter } from '../utils/rateLimiter';
import { ExponentialBackoff } from '../utils/exponentialBackoff';

export class DexScreenerService {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private backoff: ExponentialBackoff;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.dexscreener.com',
      timeout: 10000,
    });

    this.rateLimiter = new RateLimiter(300, 60000);
    this.backoff = new ExponentialBackoff(5, 1000, 30000);
  }

  async searchTokens(query: string = 'SOL'): Promise<TokenData[]> {
    await this.rateLimiter.waitForSlot('dexscreener');

    return this.backoff.execute(async () => {
      const response = await this.client.get(`/latest/dex/search`, {
        params: { q: query }
      });

      if (!response.data.pairs) {
        return [];
      }

      return this.transformPairs(response.data.pairs);
    }, ExponentialBackoff.isRetryableError);
  }

  async getTokenByAddress(address: string): Promise<TokenData | null> {
    await this.rateLimiter.waitForSlot('dexscreener');

    return this.backoff.execute(async () => {
      const response = await this.client.get(`/latest/dex/tokens/${address}`);

      if (!response.data.pairs || response.data.pairs.length === 0) {
        return null;
      }

      const transformed = this.transformPairs(response.data.pairs);
      return transformed[0] || null;
    }, ExponentialBackoff.isRetryableError);
  }

  async getTrendingTokens(): Promise<TokenData[]> {
    await this.rateLimiter.waitForSlot('dexscreener');

    return this.backoff.execute(async () => {
      const response = await this.client.get('/token-profiles/latest/v1');

      if (!response.data) {
        return [];
      }

      const addresses = response.data
        .slice(0, 20)
        .map((item: any) => item.tokenAddress);

      const tokens: TokenData[] = [];
      for (const address of addresses) {
        try {
          const token = await this.getTokenByAddress(address);
          if (token) {
            tokens.push(token);
          }
        } catch (error) {
          console.error(`Error fetching token ${address}:`, error);
        }
      }

      return tokens;
    }, ExponentialBackoff.isRetryableError);
  }

  private transformPairs(pairs: any[]): TokenData[] {
    return pairs
      .filter(pair => pair.baseToken && pair.priceUsd)
      .map(pair => {
        const priceUsd = parseFloat(pair.priceUsd) || 0;
        const solPrice = 150;
        const priceSol = priceUsd / solPrice;

        const marketCapUsd = parseFloat(pair.fdv || pair.marketCap) || 0;
        const volumeUsd = parseFloat(pair.volume?.h24) || 0;
        const liquidityUsd = parseFloat(pair.liquidity?.usd) || 0;

        return {
          token_address: pair.baseToken.address,
          token_name: pair.baseToken.name || 'Unknown',
          token_ticker: pair.baseToken.symbol || 'UNKNOWN',
          price_sol: priceSol,
          market_cap_sol: marketCapUsd / solPrice,
          volume_sol: volumeUsd / solPrice,
          liquidity_sol: liquidityUsd / solPrice,
          transaction_count: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
          price_1hr_change: parseFloat(pair.priceChange?.h1) || 0,
          price_24hr_change: parseFloat(pair.priceChange?.h24) || 0,
          price_7d_change: parseFloat(pair.priceChange?.h6) || 0,
          protocol: pair.dexId || DEXSource.DEXSCREENER,
          last_updated: Date.now()
        };
      });
  }
}
