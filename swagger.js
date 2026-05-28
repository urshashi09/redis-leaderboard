const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "High-Performance Redis Leaderboard API",
    description:
      "A real-time gaming leaderboard API built with Node.js, Express, and Redis. " +
      "Uses Redis Sorted Sets for fast ranking operations and Redis Hashes for player metadata. " +
      "Write-heavy endpoints are rate-limited to 30 requests per IP per minute.",
    version: "1.0.0",
  },
  host: "localhost:3000",
  basePath: "/",
  schemes: ["http"],
  consumes: ["application/json"],
  produces: ["application/json"],
  tags: [
    {
      name: "Health",
      description: "API and Redis health status",
    },
    {
      name: "Leaderboard",
      description: "Read leaderboard rankings",
    },
    {
      name: "Management",
      description: "Create, update, and delete players and scores",
    },
  ],
  securityDefinitions: {},
  definitions: {
    RankedPlayer: {
      type: "object",
      properties: {
        rank: {
          type: "integer",
          example: 1,
          description: "1-based rank (highest score = rank 1)",
        },
        username: {
          type: "string",
          example: "DragonSlayer99",
          description: "Unique player identifier",
        },
        score: {
          type: "number",
          example: 98500,
          description: "Current leaderboard score",
        },
        country: {
          type: "string",
          example: "US",
          description: "Two-letter country code",
        },
        tier: {
          type: "string",
          example: "Diamond",
          description: "Player tier / division",
        },
        avatar: {
          type: "string",
          example: "https://example.com/avatar.png",
          description: "URL of the player's avatar image",
        },
        joined: {
          type: "string",
          format: "date-time",
          example: "2024-01-15T10:30:00Z",
          description: "ISO 8601 timestamp of when the player was registered",
        },
      },
    },
    CreatePlayerRequest: {
      type: "object",
      required: ["username"],
      properties: {
        username: {
          type: "string",
          example: "NewPlayer",
        },
        score: {
          type: "number",
          example: 0,
          default: 0,
        },
        country: {
          type: "string",
          example: "US",
        },
        tier: {
          type: "string",
          example: "Gold",
        },
        avatar: {
          type: "string",
          example: "https://example.com/avatar.png",
        },
      },
    },
    SetScoreRequest: {
      type: "object",
      required: ["username", "score"],
      properties: {
        username: {
          type: "string",
          example: "Player1",
        },
        score: {
          type: "number",
          example: 5000,
          description: "Absolute score value to assign",
        },
      },
    },
    IncrementScoreRequest: {
      type: "object",
      required: ["username", "amount"],
      properties: {
        username: {
          type: "string",
          example: "Player1",
        },
        amount: {
          type: "number",
          example: 150,
          description: "Value to add to the current score (can be negative)",
        },
      },
    },
    SuccessResponse: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Operation completed successfully",
        },
      },
    },
    ErrorResponse: {
      type: "object",
      properties: {
        error: {
          type: "string",
          example: "An error occurred",
        },
      },
    },
    HealthResponse: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["ok", "degraded"],
          example: "ok",
        },
        redis: {
          type: "string",
          enum: ["connected", "disconnected"],
          example: "connected",
        },
      },
    },
  },
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./server.js"];

swaggerAutogen(outputFile, endpointsFiles, doc);