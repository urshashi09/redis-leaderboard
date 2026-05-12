# 🏆 High-Performance Redis Leaderboard API

A robust, real-time gaming leaderboard system built with **Node.js**, **Express**, and **Redis**. This project demonstrates how to leverage Redis Sorted Sets for low-latency rankings and Hashes for player metadata, capable of handling millions of players with sub-millisecond response times.

---

## 🚀 Features

- **Real-Time Rankings**: Instant updates using Redis `ZSET` (Sorted Sets).
- **Player Metadata**: Detailed player profiles (country, tier, avatar) stored in Redis `HASH`.
- **Advanced Querying**:
  - Top N players retrieval.
  - Rank-based pagination (e.g., ranks 50-100).
  - Score range filtering.
- **Traffic Simulator**: A live CLI tool to simulate concurrent player score updates.
- **Health Monitoring**: Built-in endpoint to monitor API and Redis connectivity.
- **Seeding Script**: Quick setup with high-quality sample data.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Redis (via `ioredis`)
- **Environment**: `dotenv` for configuration
- **CORS**: Enabled for cross-origin frontend integration

---

## 📋 Prerequisites

- **Node.js** (v16+)
- **Redis Server** (Local or Cloud)
- **npm** or **yarn**

---

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd leaderboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   REDIS_URL=redis://localhost:6379
   LEADERBOARD_KEY=game:leaderboard
   PLAYER_META_PREFIX=player:meta:
   ```

4. **Seed the database**:
   Initialize the leaderboard with sample players:
   ```bash
   node seed.js
   ```

---

## 🏃 Running the Project

### Start the API Server
```bash
npm start
```
The server will run at `http://localhost:3000`.

### Run the Live Simulator
Watch the leaderboard change in real-time with randomized traffic:
```bash
node simulator.js
```

---

## 📡 API Reference

### Health & Status
- `GET /health` - Returns API and Redis connection status.

### Leaderboard Operations
- `GET /api/leaderboard` - Get top players.
  - Query params: `limit` (default 10).
- `GET /api/leaderboard?from=1&to=10` - Get players within a specific rank range.
- `GET /api/leaderboard/score-range?min=1000&max=5000` - Filter players by score.
- `GET /api/leaderboard/player/:username` - Get stats and metadata for a specific player.

### Updates & Management
- `POST /api/leaderboard/score` - Set an absolute score for a player.
  - Body: `{ "username": "Player1", "score": 5000 }`
- `POST /api/leaderboard/increment` - Increment a player's score.
  - Body: `{ "username": "Player1", "amount": 150 }`
- `POST /api/leaderboard/player` - Register a new player with metadata.
  - Body: `{ "username": "NewPlayer", "score": 0, "country": "US", "tier": "Gold" }`
- `DELETE /api/leaderboard/player/:username` - Remove a player.
- `POST /api/leaderboard/reset` - **(Danger)** Clear the entire leaderboard.

---

## 🏗️ Architecture Note

- **Sorted Sets (ZSET)**: Used for the leaderboard itself. The `score` is the sort key, and the `username` is the member. This provides $O(\log N)$ complexity for additions and range queries.
- **Hashes (HASH)**: Used to store non-ranking data like `country`, `tier`, and `joinedAt` timestamps. This keeps the Sorted Set lean and fast.

---

## 📄 License
ISC License. Feel free to use this as a template for your own gaming backends!
