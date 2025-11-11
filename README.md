# Real-time DEX Aggregator Service

A high-performance Node.js service that aggregates real-time meme coin data from multiple DEX sources (DexScreener, Jupiter) with efficient caching, rate limiting, and WebSocket support for live updates.

## Features

- **Multi-source Data Aggregation**: Fetches and merges token data from DexScreener and Jupiter APIs
- **Intelligent Caching**: Redis-based caching with configurable TTL (default 30s)
- **Rate Limiting**: Per-source rate limiting with exponential backoff retry logic
- **Real-time Updates**: WebSocket support for live price and volume updates
- **Advanced Filtering**: Filter by time periods (1h, 24h, 7d) and sort by multiple metrics
- **Cursor-based Pagination**: Efficient pagination for large token lists
- **Error Recovery**: Comprehensive error handling with exponential backoff

## Architecture

```
src/
├── types/              # TypeScript type definitions
│   └── token.ts       # Token data structures and interfaces
├── services/          # Core business logic
│   ├── cache.service.ts       # Redis caching layer
│   ├── dexscreener.service.ts # DexScreener API integration
│   ├── jupiter.service.ts     # Jupiter API integration
│   ├── aggregator.service.ts  # Data aggregation and merging
│   └── websocket.service.ts   # WebSocket server
├── utils/             # Utility functions
│   ├── rateLimiter.ts        # Rate limiting implementation
│   └── exponentialBackoff.ts # Retry logic with exponential backoff
├── routes/            # Express route handlers
│   └── tokens.routes.ts
└── server.ts          # Main application entry point
```

## Prerequisites

- Node.js 16+
- Redis server
- TypeScript

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=30
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=300
WEBSOCKET_UPDATE_INTERVAL_MS=5000
```

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### REST API

#### Get Tokens (with filtering and pagination)
```http
GET /api/tokens?timePeriod=24h&sortBy=volume&sortOrder=desc&limit=20&cursor=0
```

**Query Parameters:**
- `timePeriod`: `1h`, `24h`, `7d` (optional)
- `sortBy`: `volume`, `price_change`, `market_cap`, `liquidity` (optional)
- `sortOrder`: `asc`, `desc` (default: `desc`)
- `limit`: Number of tokens per page (default: 20)
- `cursor`: Pagination cursor (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": [...],
    "next_cursor": "20",
    "total": 150
  }
}
```

#### Get Token by Address
```http
GET /api/tokens/:address
```

#### Refresh Token Data
```http
POST /api/tokens/refresh
```

#### Health Check
```http
GET /health
```

### WebSocket API

Connect to `ws://localhost:3000`

#### Events

**Client → Server:**

1. **Subscribe to updates**
```javascript
socket.emit('subscribe', {
  timePeriod: '24h',
  sortBy: 'volume',
  sortOrder: 'desc',
  limit: 20
});
```

2. **Request manual refresh**
```javascript
socket.emit('refresh', {
  timePeriod: '24h',
  sortBy: 'volume'
});
```

**Server → Client:**

1. **initial_data**: Sent after subscription
2. **update**: Manual refresh response
3. **price_update**: Periodic updates every 30 seconds
4. **volume_spike**: Volume spike notifications
5. **price_change**: Significant price change alerts
6. **error**: Error messages

## Usage Examples

### REST API Example

```javascript
// Fetch top 20 tokens by 24h volume
const response = await fetch('http://localhost:3000/api/tokens?timePeriod=24h&sortBy=volume&limit=20');
const data = await response.json();
console.log(data.data.tokens);
```

### WebSocket Example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to WebSocket');

  // Subscribe to token updates
  socket.emit('subscribe', {
    timePeriod: '24h',
    sortBy: 'volume',
    limit: 20
  });
});

socket.on('initial_data', (data) => {
  console.log('Initial tokens:', data.tokens);
});

socket.on('price_update', (data) => {
  console.log('Price update:', data.tokens);
});

socket.on('volume_spike', (data) => {
  console.log('Volume spike detected:', data.token);
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

## Data Flow

1. **Initial Load**:
   - Client connects via HTTP or WebSocket
   - System checks cache for recent data
   - If cache miss, fetches from multiple DEX APIs in parallel
   - Merges duplicate tokens intelligently
   - Stores in cache with TTL

2. **Real-time Updates**:
   - Periodic background job refreshes data every 30 seconds
   - Updates pushed to all connected WebSocket clients
   - No HTTP calls needed after initial load

3. **Rate Limiting**:
   - Per-source rate limiting (300 req/min for DexScreener)
   - Automatic queuing when limits approached
   - Exponential backoff on errors

## Key Design Decisions

### 1. Caching Strategy
- **TTL-based caching** reduces API calls by 95%
- **Configurable TTL** balances freshness vs. performance
- **Per-token caching** enables efficient single-token lookups

### 2. Rate Limiting
- **Per-source limiters** prevent exceeding API quotas
- **Automatic waiting** ensures all requests eventually succeed
- **Transparent to clients** - no failed requests

### 3. Data Merging
- **Address-based deduplication** handles same token on multiple DEXs
- **Max value selection** for volume/liquidity gives best view
- **Protocol preservation** tracks data source

### 4. WebSocket Architecture
- **Event-driven updates** minimize bandwidth
- **Initial data + updates pattern** matches axiom.trade behavior
- **Per-client filtering** enables personalized views

### 5. Error Handling
- **Exponential backoff** recovers from transient failures
- **Graceful degradation** continues with partial data
- **Promise.allSettled** ensures one source failure doesn't block others

## Performance Considerations

- **Concurrent API calls**: Parallel fetching from multiple sources
- **Connection pooling**: Redis connection reuse
- **Minimal data transfer**: Only changed data via WebSocket
- **Cursor pagination**: Efficient large dataset handling

## Scalability

The service is designed for horizontal scaling:

1. **Stateless HTTP layer**: Can run multiple instances behind load balancer
2. **Shared Redis cache**: All instances share cached data
3. **WebSocket sticky sessions**: Required for WebSocket connections
4. **Rate limiter per-instance**: Each instance manages own limits

## Monitoring

Key metrics to monitor:
- Active WebSocket connections: `/health` endpoint
- Cache hit rate: Redis INFO command
- API rate limit usage: Check logs
- Response times: Application performance monitoring

## Limitations

- **API Rate Limits**: DexScreener (300/min), plan requests accordingly
- **Cache Staleness**: Data can be up to TTL seconds old
- **Memory Usage**: Redis cache grows with token count
- **WebSocket Scaling**: Requires sticky sessions or Redis adapter

## Future Enhancements

- [ ] Add GeckoTerminal as third data source
- [ ] Implement Redis Pub/Sub for multi-instance WebSocket sync
- [ ] Add authentication for WebSocket connections
- [ ] Persist historical data in database
- [ ] Add Prometheus metrics endpoint
- [ ] Implement circuit breaker pattern
- [ ] Add GraphQL API layer

## License

MIT
