import { Router, Request, Response } from 'express';
import { AggregatorService } from '../services/aggregator.service';
import { FilterOptions } from '../types/token';

export function createTokenRoutes(aggregator: AggregatorService): Router {
  const router = Router();

  router.get('/tokens', async (req: Request, res: Response) => {
    try {
      const options: FilterOptions = {
        timePeriod: req.query.timePeriod as '1h' | '24h' | '7d' | undefined,
        sortBy: req.query.sortBy as 'volume' | 'price_change' | 'market_cap' | 'liquidity' | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        cursor: req.query.cursor as string | undefined
      };

      const result = await aggregator.filterAndSort(options);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching tokens:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tokens'
      });
    }
  });

  router.get('/tokens/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const token = await aggregator.getTokenByAddress(address);

      if (!token) {
        return res.status(404).json({
          success: false,
          error: 'Token not found'
        });
      }

      res.json({
        success: true,
        data: token
      });
    } catch (error) {
      console.error('Error fetching token:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch token'
      });
    }
  });

  router.post('/tokens/refresh', async (req: Request, res: Response) => {
    try {
      const tokens = await aggregator.aggregateTokens(true);

      res.json({
        success: true,
        data: {
          tokens,
          total: tokens.length,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh tokens'
      });
    }
  });

  return router;
}
