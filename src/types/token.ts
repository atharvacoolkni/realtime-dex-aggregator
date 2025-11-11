export interface TokenData {
  token_address: string;
  token_name: string;
  token_ticker: string;
  price_sol: number;
  market_cap_sol: number;
  volume_sol: number;
  liquidity_sol: number;
  transaction_count: number;
  price_1hr_change: number;
  price_24hr_change?: number;
  price_7d_change?: number;
  protocol: string;
  last_updated: number;
}

export interface FilterOptions {
  timePeriod?: '1h' | '24h' | '7d';
  sortBy?: 'volume' | 'price_change' | 'market_cap' | 'liquidity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse {
  tokens: TokenData[];
  next_cursor: string | null;
  total: number;
}

export enum DEXSource {
  DEXSCREENER = 'dexscreener',
  JUPITER = 'jupiter',
  GECKOTERMINAL = 'geckoterminal'
}
