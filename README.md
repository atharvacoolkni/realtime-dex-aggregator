Real-time DEX Aggregator Service

A production-grade backend that aggregates meme coin data from multiple DEX sources (DexScreener + Jupiter) with caching, rate limiting, merging, filtering, pagination, and real-time WebSocket updates — similar to axiom.trade Discover page.

Live Deployment

REST API:

https://realtime-dex-aggregator.onrender.com

WebSocket:

wss://realtime-dex-aggregator.onrender.com


Health Check:

https://realtime-dex-aggregator.onrender.com/health


GitHub Repo:
https://github.com/atharvacoolkni/realtime-dex-aggregator


Postman Collection

Located in this repo: 
/postman/realtime-dex-aggregator.postman_collection.json

Features

Aggregates live data from DexScreener API + Jupiter API

Merges duplicate tokens intelligently based on same token address

Redis caching (TTL 30s)

WebSocket live updates every 30s

Real-time price & volume spike events

Filtering: 1h, 24h, 7d

Sorting: volume, market_cap, liquidity, price_change

Cursor-based pagination

Exponential backoff + API rate limiting

10+ Jest unit + integration tests



Tech Stack

Node.js + TypeScript

Express.js

Socket.io

Redis (Cloud)

Axios

Jest + Supertest

Docker + Render (deployment)



client (WebSocket / REST)
        |
REST / WS
        |
   Aggregator Service
   ├── DexScreenerService
   ├── JupiterService
   ├── mergeTokens()
   ├── filterTokens()
   ├── sortTokens()
        |
     CacheService (Redis)
        |
   Periodic Updater (WebSocket broadcast)



API Endpoints
GET /api/tokens

Query params:

timePeriod=1h|24h|7d

sortBy=volume|market_cap|liquidity|price_change

sortOrder=asc|desc

limit=20

cursor=0

GET /api/tokens/:address

Fetch detailed token info.

POST /api/tokens/refresh

Force data refresh.


WebSocket Events
📤 Client → Server:

subscribe
refresh

📥 Server → Client:

initial_data

price_update

update

volume_spike

error

How to Run Locally

npm install
npm run dev



PORT=3000
REDIS_URL=redis://default:<password>@<redis-cloud-host>:<port>
CACHE_TTL_SECONDS=30
WEBSOCKET_UPDATE_INTERVAL_MS=5000
RATE_LIMIT_MAX_REQUESTS=300
RATE_LIMIT_WINDOW_MS=60000


Deployment (Render)

Project uses Dockerfile and render.yaml.
Render automatically picks Dockerfile and deploys

Run:
npm test
