# High-Performance Redis Leaderboard API

A real-time gaming leaderboard API built with **Node.js**, **Express**, and **Redis**. It uses Redis Sorted Sets for fast ranking operations and Redis Hashes for player metadata.

---

## Features

- **Real-time rankings** using Redis `ZSET` sorted sets.
- **Player metadata** such as country, tier, avatar, and join time stored in Redis hashes.
- **Leaderboard queries** for top players, rank ranges, and score ranges.
- **Player management** endpoints for creating, updating, incrementing, deleting, and resetting data.
- **Health check** endpoint for API and Redis status.
- **Rate limiting** on write-heavy player and score endpoints.
- **Seed script** for loading sample players.
- **Traffic simulator** for live score updates.
- **Docker support** with API and Redis services.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** Redis via `ioredis`
- **Configuration:** `dotenv`
- **CORS:** Enabled for frontend integration
- **Containers:** Docker and Docker Compose

---

## Prerequisites

For local development:

- Node.js v16 or newer
- npm
- Redis server running locally or remotely

For Docker:

- Docker
- Docker Compose

---

## Environment Variables

Create a `.env` file in the project root when running locally:

```env
PORT=3000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
LEADERBOARD_KEY=game:leaderboard
PLAYER_META_PREFIX=player:meta:
```

The app currently reads `REDIS_HOST` and `REDIS_PORT`.

---

## Local Setup

Install dependencies:

```bash
npm install
```

Start Redis locally, then seed the leaderboard:

```bash
npm run seed
```

Start the API server:

```bash
npm start
```

The API will be available at:

```text
http://localhost:3000
```

Run the live simulator:

```bash
npm run simulate
```

---

## Docker Setup

Build and start the API plus Redis:

```bash
docker compose up --build
```

The API will be available at:

```text
http://localhost:3000
```

Seed the Docker Redis instance:

```bash
docker compose exec api npm run seed
```

Run the simulator inside the API container:

```bash
docker compose exec api npm run simulate
```

Stop the containers:

```bash
docker compose down
```

Stop the containers and remove the Redis volume:

```bash
docker compose down -v
```

The Docker Compose setup uses:

- `redis`: Redis 7.2 Alpine with append-only persistence.
- `api`: Node.js API container connected to Redis using `REDIS_HOST=redis`.
- `redis_data`: Docker volume for Redis data.

---

## API Reference

Write-heavy endpoints are rate-limited to 30 requests per IP per minute.

### Health

- `GET /health` - Returns API and Redis connection status.

### Leaderboard

- `GET /api/leaderboard` - Get top players.
  - Query params: `limit` with a default of `10`.
- `GET /api/leaderboard?from=1&to=10` - Get players within a rank range.
- `GET /api/leaderboard/score-range?min=1000&max=5000` - Get players within a score range.
- `GET /api/leaderboard/player/:username` - Get one player's rank, score, and metadata.

### Updates and Management

- `POST /api/leaderboard/score` - Set an absolute score. Rate-limited.
  - Body: `{ "username": "Player1", "score": 5000 }`
- `POST /api/leaderboard/increment` - Increment a player's score. Rate-limited.
  - Body: `{ "username": "Player1", "amount": 150 }`
- `POST /api/leaderboard/player` - Register a player with optional metadata. Rate-limited.
  - Body: `{ "username": "NewPlayer", "score": 0, "country": "US", "tier": "Gold" }`
- `DELETE /api/leaderboard/player/:username` - Remove a player.
- `POST /api/leaderboard/reset` - Clear the leaderboard.

---

## Example Requests

Create a player:

```bash
curl -X POST http://localhost:3000/api/leaderboard/player \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"NewPlayer\",\"score\":0,\"country\":\"US\",\"tier\":\"Gold\"}"
```

Increment a score:

```bash
curl -X POST http://localhost:3000/api/leaderboard/increment \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"NewPlayer\",\"amount\":150}"
```

Fetch the leaderboard:

```bash
curl http://localhost:3000/api/leaderboard
```

---

## Architecture Notes

- **Sorted Sets (`ZSET`)** store usernames as members and scores as sort values.
- **Hashes (`HASH`)** store non-ranking data such as country, tier, avatar, and joined timestamp.
- **Rank queries** use Redis sorted set range operations in descending score order.
- **Metadata hashes** have a TTL so profile data expires automatically over time.

---

Feel free to use this as a template for your own gaming backends!
