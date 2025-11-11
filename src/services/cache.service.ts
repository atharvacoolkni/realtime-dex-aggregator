import Redis from 'ioredis';
import { TokenData } from '../types/token';

export class CacheService {
  private redis: Redis;
  private ttl: number;

  constructor(redisUrl: string = 'redis://localhost:6379', ttl: number = 30) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
    this.ttl = ttl;

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const expiryTime = ttl || this.ttl;
      await this.redis.setex(key, expiryTime, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }

  async getTTL(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`Cache TTL check error for key ${key}:`, error);
      return -1;
    }
  }

  async setTokenList(tokens: TokenData[], ttl?: number): Promise<void> {
    await this.set('tokens:list', tokens, ttl);
  }

  async getTokenList(): Promise<TokenData[] | null> {
    return await this.get<TokenData[]>('tokens:list');
  }

  async setToken(address: string, token: TokenData, ttl?: number): Promise<void> {
    await this.set(`token:${address}`, token, ttl);
  }

  async getToken(address: string): Promise<TokenData | null> {
    return await this.get<TokenData>(`token:${address}`);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
