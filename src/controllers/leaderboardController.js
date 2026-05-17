const leaderboardService = require("../../leaderboardService");

const MAX_PAGE_SIZE = 10;

function sendInternalError(res, error) {
  res.status(500).json({ success: false, error: error.message });
}

// converts a given value into a positive integer for safe query handling.
// returns the fallback value if parsing fails and ensures the result is at least 1 for negative numbers.
function parsePositiveInt(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallbackValue;
  }

  return Math.max(1, parsed);
}




// Converts a given value into a valid finite number for score/range validation.
// Returns the fallback value if the input is NaN, Infinity, or otherwise invalid.
function parseFiniteNumber(value, fallbackValue) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return fallbackValue;
  }
  

  return parsed;
}


// fetches leaderboard data.
//if "from" and "to" are provided, fetches players within that rank range.
//otherwise, fetches the top N players using the given limit(applies a maximum page size limit for safety and performance)
//returns leaderboard data along with total player count

 const getLeaderboard = async (req, res) => {
  try {
    const { from, to, limit } = req.query;

    if (from !== undefined && to !== undefined) {
      const fromRank = parsePositiveInt(from, 1);
      const requestedToRank = parsePositiveInt(to, fromRank);
      const toRank = Math.min(requestedToRank, fromRank + MAX_PAGE_SIZE - 1);

      const leaderboard = await leaderboardService.getRankRange(fromRank, toRank);
      return res.json({ success: true, from: fromRank, to: toRank, leaderboard });
    }

    const requestedLimit = parsePositiveInt(limit, 10);
    const safeLimit = Math.min(requestedLimit, MAX_PAGE_SIZE);
    const [leaderboard, total] = await Promise.all([
      leaderboardService.getTopN(safeLimit),
      leaderboardService.getTotalPlayers(),
    ]);

    res.json({ success: true, total, showing: safeLimit, leaderboard });
  } catch (error) {
    sendInternalError(res, error);
  }
}


/*
  Fetches a player's leaderboard information.
  Returns the player's rank, score, and stored metadata.
*/
 const getPlayer= async (req, res) => {
  try {
    const { username } = req.params;
    const playerStats = await leaderboardService.getPlayerStats(username);

    if (!playerStats) {
      return res.status(404).json({ success: false, error: "Player not found" });
    }

    const playerMeta = await leaderboardService.getPlayerMeta(username);
    res.json({ success: true, player: { ...playerStats, ...(playerMeta || {}) } });
  } catch (error) {
    sendInternalError(res, error);
  }
}


/*
  Fetches players whose scores fall within a given range.
  Reads minimum and maximum score from query parameters.
  Returns matching players along with total count.
*/
 const getPlayersByScoreRange = async (req, res) =>{
  try {
    const minScore = parseFiniteNumber(req.query.min, 0);
    const maxScore = parseFiniteNumber(req.query.max, Number.MAX_SAFE_INTEGER);
    const players = await leaderboardService.getByScoreRange(minScore, maxScore);

    res.json({ success: true, min: minScore, max: maxScore, count: players.length, players });
  } catch (error) {
    sendInternalError(res, error);
  }
}


/*
  Sets or updates a player's score in Redis.
  Validates username and score before updating.
  Returns the updated player statistics after saving.
*/
 const setPlayerScore = async (req, res) =>{
  try {
    const { username, score } = req.body;

    if (!username || score === undefined) {
      return res.status(400).json({ success: false, error: "username and score required" });
    }

    if (typeof score !== "number" || score < 0) {
      return res.status(400).json({ success: false, error: "score must be a non-negative number" });
    }

    await leaderboardService.setScore(username, score);
    const player = await leaderboardService.getPlayerStats(username);

    res.json({ success: true, message: `Score set for ${username}`, player });
  } catch (error) {
    sendInternalError(res, error);
  }
}



/*
  Increases a player's score by a specified amount.
  Validates request data before updating leaderboard score.
  Returns the new score and updated player rank.
*/
 const incrementPlayerScore = async (req, res) =>{
  try {
    const { username, amount } = req.body;

    if (!username || amount === undefined) {
      return res.status(400).json({ success: false, error: "username and amount required" });
    }

    if (typeof amount !== "number") {
      return res.status(400).json({ success: false, error: "amount must be a number" });
    }

    const newScore = await leaderboardService.incrementScore(username, amount);
    const player = await leaderboardService.getPlayerStats(username);

    res.json({ success: true, message: `+${amount} pts for ${username}`, newScore, player });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/*
  Creates a new player entry in the leaderboard.
  Stores initial score and additional metadata in Redis.
  Adds a joined timestamp for player creation tracking.
*/
 const createPlayer = async (req, res) => {
  try {
    const { username, score = 0, ...metadata } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: "username required" });
    }

    await leaderboardService.setScore(username, score);

    await leaderboardService.setPlayerMeta(username, {
      ...metadata,
      joinedAt: new Date().toISOString(),
    });

    const player = await leaderboardService.getPlayerStats(username);
    res.status(201).json({ success: true, message: `Player ${username} created`, player });
  } catch (error) {
    sendInternalError(res, error);
  }
}


/*
  Removes a player from the Redis leaderboard.
  Deletes the player's leaderboard entry using username.
  Returns a success response after removal.
*/
 const removePlayer =async (req, res) => {
  try {
    const { username } = req.params;
    await leaderboardService.removePlayer(username);

    res.json({ success: true, message: `${username} removed` });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/*
  Clears the entire leaderboard from Redis.
  Removes all stored leaderboard entries and rankings.
  Useful for resetting the leaderboard state.
*/
 const resetLeaderboard = async (_req, res) => {
  try {
    await leaderboardService.resetLeaderboard();
    res.json({ success: true, message: "Leaderboard cleared" });
  } catch (error) {
    sendInternalError(res, error);
  }
}

module.exports = {
  getLeaderboard,
  getPlayer,
  getPlayersByScoreRange,
  setPlayerScore,
  incrementPlayerScore,
  createPlayer,
  removePlayer,
  resetLeaderboard,
};