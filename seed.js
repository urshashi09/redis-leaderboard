require("dotenv").config();

const redisClient = require("./src/redisclient");

const LEADERBOARD_KEY = process.env.LEADERBOARD_KEY || "game:leaderboard";
const PLAYER_META_PREFIX = process.env.PLAYER_META_PREFIX || "player:meta:";
const PLAYER_META_TTL_SECONDS = 60 * 60 * 24 * 30;

const PLAYERS = [
  { username: "DragonSlayer99", score: 982_450, country: "US", tier: "Legend", avatar: "dragon" },
  { username: "NightHawkX", score: 874_320, country: "UK", tier: "Legend", avatar: "hawk" },
  { username: "PixelWizard", score: 761_880, country: "DE", tier: "Diamond", avatar: "wizard" },
  { username: "ShadowByteZ", score: 698_540, country: "JP", tier: "Diamond", avatar: "shadow" },
  { username: "StormRider_77", score: 623_100, country: "BR", tier: "Diamond", avatar: "storm" },
  { username: "IronPhoenix", score: 574_390, country: "CA", tier: "Platinum", avatar: "phoenix" },
  { username: "GhostSniper", score: 512_760, country: "KR", tier: "Platinum", avatar: "ghost" },
  { username: "CyberNovaX", score: 448_210, country: "AU", tier: "Platinum", avatar: "nova" },
  { username: "TurboFalcon", score: 389_570, country: "FR", tier: "Gold", avatar: "falcon" },
  { username: "VoidWalker", score: 331_090, country: "IN", tier: "Gold", avatar: "void" },
  { username: "QuantumKnight", score: 278_640, country: "MX", tier: "Gold", avatar: "knight" },
  { username: "NeonViper", score: 224_380, country: "IT", tier: "Silver", avatar: "viper" },
  { username: "BlazeRunner", score: 178_950, country: "ES", tier: "Silver", avatar: "runner" },
  { username: "FrostByteX", score: 143_200, country: "SE", tier: "Silver", avatar: "frost" },
  { username: "LuckyStrike", score: 112_870, country: "NL", tier: "Silver", avatar: "lucky" },
  { username: "ArcaneHunter", score: 87_430, country: "PL", tier: "Bronze", avatar: "hunter" },
  { username: "TitanCrusher", score: 62_150, country: "RU", tier: "Bronze", avatar: "titan" },
  { username: "CrimsonBlade", score: 41_800, country: "TR", tier: "Bronze", avatar: "blade" },
  { username: "SilverArrow", score: 23_490, country: "AR", tier: "Iron", avatar: "arrow" },
  { username: "NovicePawn", score: 8_120, country: "EG", tier: "Iron", avatar: "pawn" },
];

function getMetaKey(username) {
  return `${PLAYER_META_PREFIX}${username}`;
}

function printTopPlayers(entries, title) {
  console.log(`\n${title}`);
  for (const entry of entries) {
    const rankText = `${entry.rank}.`.padEnd(4);
    const scoreText = entry.score.toLocaleString().padStart(10);
    console.log(`${rankText} ${entry.username.padEnd(18)} ${entry.tier.padEnd(8)} ${scoreText}`);
  }
}

async function deleteExistingMetaKeys() {
  const oldMetaKeys = await redisClient.keys(`${PLAYER_META_PREFIX}*`);
  if (oldMetaKeys.length > 0) {
    await redisClient.del(...oldMetaKeys);
  }
}

async function seedLeaderboard() {
  await redisClient.connect();

  console.log("Clearing old leaderboard and metadata...");
  await redisClient.del(LEADERBOARD_KEY);
  await deleteExistingMetaKeys();

  const pipeline = redisClient.pipeline();
  const joinedAt = new Date().toISOString();

  for (const player of PLAYERS) {
    pipeline.zadd(LEADERBOARD_KEY, player.score, player.username);
    pipeline.hset(getMetaKey(player.username), {
      country: player.country,
      tier: player.tier,
      avatar: player.avatar,
      joinedAt,
    });
    pipeline.expire(getMetaKey(player.username), PLAYER_META_TTL_SECONDS);
  }

  await pipeline.exec();

  const totalPlayers = await redisClient.zcard(LEADERBOARD_KEY);
  console.log(`Seed complete. Players inserted: ${totalPlayers}`);

  const rawEntries = await redisClient.zrange(
    LEADERBOARD_KEY,
    0,
    PLAYERS.length - 1,
    "REV",
    "WITHSCORES"
  );

  const leaderboard = [];
  for (let i = 0; i < rawEntries.length; i += 2) {
    const username = rawEntries[i];
    const score = Number.parseInt(rawEntries[i + 1], 10);
    const metadata = await redisClient.hgetall(getMetaKey(username));

    leaderboard.push({
      rank: i / 2 + 1,
      username,
      score,
      tier: metadata.tier || "-",
    });
  }

  printTopPlayers(leaderboard, "Seeded leaderboard (top to bottom):");

  await redisClient.quit();
  console.log("Redis connection closed.");
}

seedLeaderboard().catch(async (error) => {
  console.error("Seed failed:", error.message);

  try {
    await redisClient.quit();
  } catch {
    // Ignore close errors while exiting after a failure.
  }

  process.exit(1);
});