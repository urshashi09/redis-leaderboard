# High-Performance Redis Leaderboard API

A real-time gaming leaderboard API built with Node.js, Express, and Redis. It uses Redis Sorted Sets for ranking operations and Redis Hashes for player metadata.

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
- **API documentation** with Swagger UI and OpenAPI spec generation.

---

## Tech Stack

- Node.js
- Express
- Redis with `ioredis`
- Swagger UI with `swagger-ui-express`
- Swagger spec generation with `swagger-autogen`
- CORS and dotenv

## Prerequisites

- Node.js v16 or newer
- Redis server running locally, in Docker, or remotely
- npm

## Installation

```bash
npm install
```

Create a `.env` file in the project root:

```env
PORT=3000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
LEADERBOARD_KEY=game:leaderboard
PLAYER_META_PREFIX=player:meta:
```

## Running

Start the API server:

```bash
npm start
```

The server runs at:

```text
http://localhost:3000
```

Health check:

```text
GET http://localhost:3000/health
```

Swagger UI:

```text
http://localhost:3000/api-docs
```

## Swagger

The generated OpenAPI/Swagger spec lives in:

```text
swagger-output.json
```

Swagger UI is mounted in `server.js`:

```text
GET /api-docs
```

If API routes change, regenerate the Swagger output with:

```bash
node swagger.js
```

Then restart the server.

## Seed Data

Initialize Redis with sample leaderboard data:

```bash
npm run seed
```

## Simulator

Run the live traffic simulator:

```bash
npm run simulate
```

## API Reference

### Health

- `GET /health` - Returns API and Redis connection status.

### Leaderboard

- `GET /api/leaderboard` - Get top players.
- `GET /api/leaderboard?limit=10` - Get top players with a custom limit.
- `GET /api/leaderboard?from=1&to=10` - Get players within a rank range.
- `GET /api/leaderboard/score-range?min=1000&max=5000` - Get players within a score range.
- `GET /api/leaderboard/player/:username` - Get one player's rank, score, and metadata.

### Management

- `POST /api/leaderboard/player` - Create a player.

```json
{
  "username": "NewPlayer",
  "score": 0,
  "country": "US",
  "tier": "Gold"
}
```

- `POST /api/leaderboard/score` - Set a player's absolute score.

```json
{
  "username": "Player1",
  "score": 5000
}
```

- `POST /api/leaderboard/increment` - Increment a player's score.

```json
{
  "username": "Player1",
  "amount": 150
}
```

- `DELETE /api/leaderboard/player/:username` - Remove a player.
- `POST /api/leaderboard/reset` - Clear the leaderboard.

## Docker Compose

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

## Architecture Notes

- Redis Sorted Sets store leaderboard scores. The username is the member and the score is the sort value.
- Redis Hashes store player metadata such as country, tier, avatar, and join timestamp.
- Player metadata expires after 15 days.
- Write endpoints are rate-limited to reduce accidental write spikes.
