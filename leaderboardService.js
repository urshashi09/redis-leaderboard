const redisClient = require("./src/redisclient");

const LEADERBOARD_KEY= process.env.LEADERBOARD_KEY || "game:leaderboard"
const PLAYER_META_PREFIX= process.env.PLAYER_META_PREFIX || "player:meta:"
const META_TTL= 60 * 60 * 24 * 15; // 15 days in seconds


// Generates a unique Redis key for storing or retrieving a player's metadata
// by combining the metadata key prefix with the player's username.
function getMetaKey(username) {
  return `${PLAYER_META_PREFIX}${username}`;
}



function toLeaderboardEntries(rawEntries, startRank = 1) {
  const entries = [];

  for (let i = 0; i < rawEntries.length; i += 2) {
    entries.push({
      rank: startRank + i / 2,
      username: rawEntries[i],
      score: Number.parseInt(rawEntries[i + 1], 10),
    });
  }

  return entries;
}

async function setScore(username, score) {
  await redisClient.zadd(LEADERBOARD_KEY, score, username);
}

async function incrementScore(username, amount) {
  const newScore = await redisClient.zincrby(LEADERBOARD_KEY, amount, username);
  return Number.parseInt(newScore, 10);
}

async function removePlayer(username) {
  await redisClient.zrem(LEADERBOARD_KEY, username);
}

async function resetLeaderboard() {
  await redisClient.del(LEADERBOARD_KEY);
}

async function getTopN(limit = 10) {
  const rawEntries = await redisClient.zrange(
    LEADERBOARD_KEY,
    0,
    limit - 1,
    "REV",
    "WITHSCORES"
  );

  return toLeaderboardEntries(rawEntries, 1);
}

async function getRankRange(fromRank, toRank) {
  const rawEntries = await redisClient.zrange(
    LEADERBOARD_KEY,
    fromRank - 1,
    toRank - 1,
    "REV",
    "WITHSCORES"
  );

  return toLeaderboardEntries(rawEntries, fromRank);
}

async function getPlayerStats(username) {
  const score = await redisClient.zscore(LEADERBOARD_KEY, username);
  if (score === null) {
    return null;
  }

  let rank;

  try {
    const descendingRank = await redisClient.call("ZRANK", LEADERBOARD_KEY, username, "REV");
    rank = descendingRank + 1;
  } catch {
    const [ascendingRank, totalPlayers] = await Promise.all([
      redisClient.zrank(LEADERBOARD_KEY, username),
      redisClient.zcard(LEADERBOARD_KEY),
    ]);
    rank = totalPlayers - ascendingRank;
  }

  return {
    username,
    rank,
    score: Number.parseInt(score, 10),
  };
}

async function getTotalPlayers() {
  return redisClient.zcard(LEADERBOARD_KEY);
}

async function getByScoreRange(minScore, maxScore) {
  const rawEntries = await redisClient.zrange(
    LEADERBOARD_KEY,
    maxScore,
    minScore,
    "BYSCORE",
    "REV",
    "WITHSCORES"
  );

  return toLeaderboardEntries(rawEntries, 1);
}

async function setPlayerMeta(username, metadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return;
  }

  const metaKey = getMetaKey(username);
  await redisClient.hset(metaKey, metadata);
  await redisClient.expire(metaKey, PLAYER_META_TTL_SECONDS);
}

async function getPlayerMeta(username) {
  return redisClient.hgetall(getMetaKey(username));
}

module.exports = {
  setScore,
  incrementScore,
  removePlayer,
  resetLeaderboard,
  getTopN,
  getRankRange,
  getPlayerStats,
  getTotalPlayers,
  getByScoreRange,
  setPlayerMeta,
  getPlayerMeta,
};


