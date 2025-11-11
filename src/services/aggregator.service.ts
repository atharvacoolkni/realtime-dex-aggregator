import { TokenData, FilterOptions, PaginatedResponse } from '../types/token';
import { DexScreenerService } from './dexscreener.service';
import { JupiterService } from './jupiter.service';
import { CacheService } from './cache.service';

export class AggregatorService {
  private dexScreener: DexScreenerService;
  private jupiter: JupiterService;
  private cache: CacheService;

  constructor(cache: CacheService) {
    this.dexScreener = new DexScreenerService();
    this.jupiter = new JupiterService();
    this.cache = cache;
  }

  async aggregateTokens(forceRefresh: boolean = false): Promise<TokenData[]> {
    if (!forceRefresh) {
      const cached = await this.cache.getTokenList();
      if (cached) {
        return cached;
      }
    }

    const [dexTokens, jupiterTokens] = await Promise.allSettled([
      this.dexScreener.getTrendingTokens(),
      this.jupiter.searchTokens('SOL')
    ]);

    const allTokens: TokenData[] = [];

    if (dexTokens.status === 'fulfilled') {
      allTokens.push(...dexTokens.value);
    } else {
      console.error('DexScreener error:', dexTokens.reason);
    }

    if (jupiterTokens.status === 'fulfilled') {
      allTokens.push(...jupiterTokens.value);
    } else {
      console.error('Jupiter error:', jupiterTokens.reason);
    }

    const mergedTokens = this.mergeTokens(allTokens);

    await this.cache.setTokenList(mergedTokens);

    return mergedTokens;
  }

  private mergeTokens(tokens: TokenData[]): TokenData[] {
    const tokenMap = new Map<string, TokenData>();

    for (const token of tokens) {
      const existing = tokenMap.get(token.token_address);

      if (!existing) {
        tokenMap.set(token.token_address, token);
      } else {
        const merged: TokenData = {
          ...existing,
          volume_sol: Math.max(existing.volume_sol, token.volume_sol),
          liquidity_sol: Math.max(existing.liquidity_sol, token.liquidity_sol),
          transaction_count: Math.max(existing.transaction_count, token.transaction_count),
          market_cap_sol: Math.max(existing.market_cap_sol, token.market_cap_sol),
          last_updated: Math.max(existing.last_updated, token.last_updated)
        };

        tokenMap.set(token.token_address, merged);
      }
    }

    return Array.from(tokenMap.values());
  }

  async filterAndSort(options: FilterOptions): Promise<PaginatedResponse> {
    const tokens = await this.aggregateTokens();

    let filtered = this.applyTimeFilter(tokens, options.timePeriod);
    filtered = this.sortTokens(filtered, options.sortBy, options.sortOrder);

    const limit = options.limit || 20;
    const cursorIndex = options.cursor ? parseInt(options.cursor) : 0;

    const paginatedTokens = filtered.slice(cursorIndex, cursorIndex + limit);
    const nextCursor = cursorIndex + limit < filtered.length
      ? String(cursorIndex + limit)
      : null;

    return {
      tokens: paginatedTokens,
      next_cursor: nextCursor,
      total: filtered.length
    };
  }

  private applyTimeFilter(tokens: TokenData[], timePeriod?: '1h' | '24h' | '7d'): TokenData[] {
    if (!timePeriod) {
      return tokens;
    }

    return tokens.filter(token => {
      const change = timePeriod === '1h'
        ? token.price_1hr_change
        : timePeriod === '24h'
        ? token.price_24hr_change
        : token.price_7d_change;

      return change !== undefined && change !== 0;
    });
  }

  private sortTokens(
    tokens: TokenData[],
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): TokenData[] {
    const sorted = [...tokens];

    sorted.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case 'volume':
          aValue = a.volume_sol;
          bValue = b.volume_sol;
          break;
        case 'price_change':
          aValue = a.price_1hr_change;
          bValue = b.price_1hr_change;
          break;
        case 'market_cap':
          aValue = a.market_cap_sol;
          bValue = b.market_cap_sol;
          break;
        case 'liquidity':
          aValue = a.liquidity_sol;
          bValue = b.liquidity_sol;
          break;
        default:
          aValue = a.volume_sol;
          bValue = b.volume_sol;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }

  async getTokenByAddress(address: string): Promise<TokenData | null> {
    const cached = await this.cache.getToken(address);
    if (cached) {
      return cached;
    }

    const token = await this.dexScreener.getTokenByAddress(address);

    if (token) {
      await this.cache.setToken(address, token);
    }

    return token;
  }
}
