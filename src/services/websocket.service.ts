import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { AggregatorService } from './aggregator.service';
import { FilterOptions } from '../types/token';
import cron from 'node-cron';

export class WebSocketService {
  private io: SocketIOServer;
  private aggregator: AggregatorService;
  private updateInterval: number;
  private activeConnections: Set<string> = new Set();

  constructor(
    server: HttpServer,
    aggregator: AggregatorService,
    updateInterval: number = 5000
  ) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.aggregator = aggregator;
    this.updateInterval = updateInterval;

    this.setupConnectionHandlers();
    this.startPeriodicUpdates();
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.activeConnections.add(socket.id);

      socket.on('subscribe', async (options: FilterOptions) => {
        console.log(`Client ${socket.id} subscribed with filters:`, options);

        try {
          const data = await this.aggregator.filterAndSort(options);
          socket.emit('initial_data', data);
        } catch (error) {
          console.error('Error sending initial data:', error);
          socket.emit('error', { message: 'Failed to fetch initial data' });
        }
      });

      socket.on('refresh', async (options: FilterOptions) => {
        console.log(`Client ${socket.id} requested refresh`);

        try {
          const data = await this.aggregator.filterAndSort(options);
          socket.emit('update', data);
        } catch (error) {
          console.error('Error refreshing data:', error);
          socket.emit('error', { message: 'Failed to refresh data' });
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.activeConnections.delete(socket.id);
      });
    });
  }

  private startPeriodicUpdates(): void {
    cron.schedule('*/30 * * * * *', async () => {
      if (this.activeConnections.size === 0) {
        return;
      }

      try {
        const tokens = await this.aggregator.aggregateTokens(true);

        this.io.emit('price_update', {
          timestamp: Date.now(),
          tokens: tokens.slice(0, 30)
        });
      } catch (error) {
        console.error('Error in periodic update:', error);
      }
    });

    console.log('Periodic updates started (every 30 seconds)');
  }

  async broadcastVolumeSpike(tokenAddress: string, volumeChange: number): Promise<void> {
    const token = await this.aggregator.getTokenByAddress(tokenAddress);

    if (token) {
      this.io.emit('volume_spike', {
        token,
        volume_change: volumeChange,
        timestamp: Date.now()
      });
    }
  }

  async broadcastPriceChange(tokenAddress: string, priceChange: number): Promise<void> {
    const token = await this.aggregator.getTokenByAddress(tokenAddress);

    if (token) {
      this.io.emit('price_change', {
        token,
        price_change: priceChange,
        timestamp: Date.now()
      });
    }
  }

  getActiveConnectionsCount(): number {
    return this.activeConnections.size;
  }

  close(): void {
    this.io.close();
  }
}
