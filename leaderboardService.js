const redisClient = require("./src/redisclient");

const LEADERBOARD_KEY= process.env.LEADERBOARD_KEY || "game:leaderboard"
const PLAYER_META_PREFIX= process.env.PLAYER_META_PREFIX || "player:meta:"
const PLAYER_META_TTL_SECONDS= 60 * 60 * 24 * 15; // 15 days in seconds


// generates a unique Redis key for storing or retrieving a player's metadata
// by combining the metadata key prefix with the player's username.
function getMetaKey(username) {
  return `${PLAYER_META_PREFIX}${username}`;
}



//convert raw redis entry into structured leaderboard objects
//eg: rawEntries = ["username1", "score1", "username2", "score2"]
//returns: [{rank: 1, username: "username1", score: "score1"}, {rank: 2, username: "username2", score: "score2"}]
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

// adds a new player or updates an existing player's score
async function setScore(username, score) {
  await redisClient.zadd(LEADERBOARD_KEY, score, username);
}

// increases a player's score and returns the updated score
async function incrementScore(username, amount) {
  const newScore = await redisClient.zincrby(LEADERBOARD_KEY, amount, username);
  return Number.parseInt(newScore, 10);
}

// removes a player from the leaderboard
async function removePlayer(username) {
  await redisClient.zrem(LEADERBOARD_KEY, username);
}

// clears the entire leaderboard from Redis
async function resetLeaderboard() {
  await redisClient.del(LEADERBOARD_KEY);
}

// returns the top N players (default limit is 10)
//since redis stores sorted set scores in ascending order by default
//we need to reverse the order to get the top N players
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


// similar to getTopN but returns the players in the specified rank range
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


//get stats for a specific player
//returns: {username, rank, score}
//try: uses Redis descending rank support ("REV") to get leaderboard rank directly
//catch: uses callback for older Redis versions that don't support descending rank queries
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


//previously were using zrange (by rank default)
//here we are using zrange (by score) rev to get the players in the specified score range
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

// sets metadata for a player
// metadata should be an object with key-value pairs
// metadata has a TTL of 15 days
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


