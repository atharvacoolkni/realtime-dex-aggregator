import express, { Application } from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { CacheService } from './services/cache.service';
import { AggregatorService } from './services/aggregator.service';
import { WebSocketService } from './services/websocket.service';
import { createTokenRoutes } from './routes/tokens.routes';

dotenv.config();

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '30');
const WS_UPDATE_INTERVAL = parseInt(process.env.WEBSOCKET_UPDATE_INTERVAL_MS || '5000');

class Server {
  private app: Application;
  private httpServer: ReturnType<typeof createServer>;
  private cache: CacheService;
  private aggregator: AggregatorService;
  private websocket: WebSocketService;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);

    this.cache = new CacheService(REDIS_URL, CACHE_TTL);
    this.aggregator = new AggregatorService(this.cache);
    this.websocket = new WebSocketService(
      this.httpServer,
      this.aggregator,
      WS_UPDATE_INTERVAL
    );

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });
  }

  private setupRoutes(): void {
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Real-time DEX Aggregator API',
        version: '1.0.0',
        endpoints: {
          tokens: '/api/tokens',
          token_by_address: '/api/tokens/:address',
          refresh: 'POST /api/tokens/refresh'
        },
        websocket: {
          connected_clients: this.websocket.getActiveConnectionsCount(),
          events: {
            subscribe: 'Subscribe to token updates with filters',
            refresh: 'Request manual data refresh',
            initial_data: 'Receive initial token data',
            update: 'Receive token updates',
            price_update: 'Receive periodic price updates',
            volume_spike: 'Receive volume spike notifications',
            price_change: 'Receive price change notifications'
          }
        }
      });
    });

    this.app.use('/api', createTokenRoutes(this.aggregator));

    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        websocket_connections: this.websocket.getActiveConnectionsCount()
      });
    });
  }

  async start(): Promise<void> {
    try {
      console.log('Warming up cache...');
      await this.aggregator.aggregateTokens(true);
      console.log('Cache warmed up successfully');

      this.httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`HTTP API: http://localhost:${PORT}`);
        console.log(`WebSocket: ws://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    console.log('Shutting down server...');
    this.websocket.close();
    await this.cache.close();
    this.httpServer.close();
    console.log('Server stopped');
  }
}

const server = new Server();

server.start();

process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});

export default server;
