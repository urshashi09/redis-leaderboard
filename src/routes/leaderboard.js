const express = require("express");
const { getLeaderboard, getPlayer, getPlayersByScoreRange, setPlayerScore, incrementPlayerScore, createPlayer, removePlayer, resetLeaderboard } = require("../controllers/leaderboardController");
const router = express.Router();
const rateLimit = require("express-rate-limit");


// 30 score writes per IP per minute
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, slow down." },
});




router.get("/", getLeaderboard );

router.get("/player/:username", getPlayer );

router.get("/score-range", getPlayersByScoreRange );

router.post("/score",writeLimiter, setPlayerScore);

router.post("/increment",writeLimiter, incrementPlayerScore );

router.post("/player",writeLimiter, createPlayer);

router.delete("/player/:username", removePlayer );

router.post("/reset", resetLeaderboard);

module.exports = router;