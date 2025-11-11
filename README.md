# 🚀 Real-time DEX Aggregator Service

A production-grade backend that aggregates meme coin data from multiple DEX sources (**DexScreener + Jupiter**) with efficient caching, rate limiting, intelligent merging, filtering, pagination, and **real-time WebSocket updates**.  
Designed to replicate the token discovery behavior seen on **axiom.trade**.

---

## ✅ Live Deployment

### **REST API:**  
https://realtime-dex-aggregator.onrender.com

### **WebSocket:**  
wss://realtime-dex-aggregator.onrender.com

### **Health Check:**  
https://realtime-dex-aggregator.onrender.com/health

---

## ✅ Repository

GitHub Repo:  
https://github.com/atharvacoolkni/realtime-dex-aggregator

---

## ✅ Postman Collection

Available in the repo:  
/postman/realtime-dex-aggregator.postman_collection.json


Import this file into Postman / Insomnia to test all REST APIs.

---

## ✅ Features

- ✅ Aggregates real-time token data from **DexScreener API** + **Jupiter API**
- ✅ Intelligent merging of duplicate tokens (same token address)
- ✅ **Redis caching** with configurable TTL (defaults to 30s)
- ✅ **WebSocket live updates** every 30 seconds
- ✅ Real-time:
  - 📈 price updates  
  - 🔥 volume spike notifications
- ✅ Filtering:
  - `1h`, `24h`, `7d`
- ✅ Sorting:
  - `volume`, `market_cap`, `liquidity`, `price_change`
- ✅ Cursor-based pagination
- ✅ Exponential backoff + API rate limiting
- ✅ 10+ **Jest unit & integration tests**
- ✅ Fully containerized using **Docker**
- ✅ Deployed on **Render**

---

## ✅ Tech Stack

- **Node.js** + **TypeScript**
- **Express.js**
- **Socket.io**
- **Redis Cloud**
- **Axios**
- **Docker**
- **Render** (hosting)
- **Jest + Supertest**

---

## ✅ Architecture Diagram

client (WebSocket / REST)
|
REST / WS Layer
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
Periodic Updater (WebSocket Broadcast)


---

# ✅ API Endpoints

### **GET `/api/tokens`**
Query Parameters:

| Name        | Values                                  |
|-------------|------------------------------------------|
| timePeriod  | `1h`, `24h`, `7d`                        |
| sortBy      | `volume`, `market_cap`, `liquidity`, `price_change` |
| sortOrder   | `asc`, `desc`                            |
| limit       | default: `20`                            |
| cursor      | pagination cursor                        |

---

### **GET `/api/tokens/:address`**
Get detailed info for a single token by address.

---

### **POST `/api/tokens/refresh`**
Force-refresh the token list.  
Useful for demos & debugging.

---

# ✅ WebSocket Events

### 📤 **Client → Server**
| Event      | Description |
|------------|-------------|
| `subscribe` | Subscribe to real-time updates |
| `refresh`   | Trigger a manual refresh |

---

### 📥 **Server → Client**

| Event name     | Description                              |
|----------------|-------------------------------------------|
| `initial_data` | Full token snapshot on connection         |
| `price_update` | Real-time price changes                   |
| `update`       | Periodic token list updates               |
| `volume_spike` | High-volume detection alerts              |
| `error`        | Error messages                            |

---

# ✅ How to Run Locally

```bash
npm install
npm run dev


PORT=3000
REDIS_URL=redis://default:<password>@<redis-cloud-host>:<port>
CACHE_TTL_SECONDS=30
WEBSOCKET_UPDATE_INTERVAL_MS=5000
RATE_LIMIT_MAX_REQUESTS=300
RATE_LIMIT_WINDOW_MS=60000


Deployment (Render)

This project includes:

Dockerfile

render.yaml

Render auto-detects Dockerfile and deploys the service.
Redis is provided via Redis Cloud.