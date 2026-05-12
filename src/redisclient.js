const Redis = require("ioredis");


 const redisHost= process.env.REDIS_HOST || "127.0.0.1"
 const redisPort= process.env.REDIS_PORT || 6379

 const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  lazyConnect: true,
  retryStrategy(retryCount) {
    if (retryCount > 5) {
      console.error("Redis connection failed after 5 retries.");
      console.error("Make sure your Redis server is running.");
      return null;
    }

    return Math.min(retryCount * 300, 3000);
  },
});

 

redisClient.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
});

module.exports = redisClient;