const express = require("express");
const router = express.Router();
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


router.get("/", async (req, res) => {
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
});

router.get("/player/:username", async (req, res) => {
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
});

router.get("/score-range", async (req, res) => {
  try {
    const minScore = parseFiniteNumber(req.query.min, 0);
    const maxScore = parseFiniteNumber(req.query.max, Number.MAX_SAFE_INTEGER);
    const players = await leaderboardService.getByScoreRange(minScore, maxScore);

    res.json({ success: true, min: minScore, max: maxScore, count: players.length, players });
  } catch (error) {
    sendInternalError(res, error);
  }
});

router.post("/score", async (req, res) => {
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
});

router.post("/increment", async (req, res) => {
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
});

router.post("/player", async (req, res) => {
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
});

router.delete("/player/:username", async (req, res) => {
  try {
    const { username } = req.params;
    await leaderboardService.removePlayer(username);

    res.json({ success: true, message: `${username} removed` });
  } catch (error) {
    sendInternalError(res, error);
  }
});

router.post("/reset", async (_req, res) => {
  try {
    await leaderboardService.resetLeaderboard();
    res.json({ success: true, message: "Leaderboard cleared" });
  } catch (error) {
    sendInternalError(res, error);
  }
});

module.exports = router;