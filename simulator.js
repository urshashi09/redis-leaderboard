require("dotenv").config();

const redisClient = require("./src/redisclient");

const LEADERBOARD_KEY = process.env.LEADERBOARD_KEY || "game:leaderboard";
const PLAYER_META_PREFIX = process.env.PLAYER_META_PREFIX || "player:meta:";

const SCORE_DELTA_BY_TIER = {
  Legend: { min: 2000, max: 12000 },
  Diamond: { min: 1500, max: 9000 },
  Platinum: { min: 1000, max: 7000 },
  Gold: { min: 600, max: 5000 },
  Silver: { min: 300, max: 3500 },
  Bronze: { min: 100, max: 2000 },
  Iron: { min: 50, max: 800 },
};

function getMetaKey(username) {
  return `${PLAYER_META_PREFIX}${username}`;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDelta(tier) {
  const range = SCORE_DELTA_BY_TIER[tier] || { min: 100, max: 3000 };
  return getRandomInt(range.min, range.max);
}

function pickRandomPlayers(players, count) {
  const shuffled = [...players];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

async function getTopLeaderboard(limit = 20) {
  const rawEntries = await redisClient.zrange(
    LEADERBOARD_KEY,
    0,
    limit - 1,
    "REV",
    "WITHSCORES"
  );

  if (rawEntries.length === 0) {
    return [];
  }

  const usernames = [];
  for (let i = 0; i < rawEntries.length; i += 2) {
    usernames.push(rawEntries[i]);
  }

  const metaPipeline = redisClient.pipeline();
  for (const username of usernames) {
    metaPipeline.hgetall(getMetaKey(username));
  }

  const metadataResults = await metaPipeline.exec();

  const leaderboard = [];
  for (let i = 0; i < rawEntries.length; i += 2) {
    const rank = i / 2 + 1;
    const username = rawEntries[i];
    const score = Number.parseInt(rawEntries[i + 1], 10);
    const metadata = metadataResults[rank - 1][1] || {};

    leaderboard.push({
      rank,
      username,
      score,
      country: metadata.country || "-",
      tier: metadata.tier || "-",
    });
  }

  return leaderboard;
}

function printLeaderboard(entries, events, tickNumber) {
  console.clear();

  console.log(`LIVE REDIS LEADERBOARD | tick ${tickNumber} | ${new Date().toLocaleTimeString()}`);
  console.log("Rank  Player               Tier       Country   Score");
  console.log("----  -------------------  ---------  --------  ----------");

  for (const entry of entries) {
    const rankText = `${entry.rank}`.padEnd(4);
    const playerText = entry.username.padEnd(19);
    const tierText = entry.tier.padEnd(9);
    const countryText = entry.country.padEnd(8);
    const scoreText = entry.score.toLocaleString().padStart(10);

    console.log(`${rankText}  ${playerText}  ${tierText}  ${countryText}  ${scoreText}`);
  }

  console.log("\nRecent score updates:");
  for (const event of events.slice(-6)) {
    console.log(
      `${event.username.padEnd(18)} +${event.delta
        .toLocaleString()
        .padStart(6)}  => ${event.newScore.toLocaleString()}`
    );
  }

  console.log(`\nRedis key: ${LEADERBOARD_KEY}`);
  console.log("Press Ctrl+C to stop simulation.");
}

async function loadPlayersWithTier() {
  const usernames = await redisClient.zrange(LEADERBOARD_KEY, 0, -1);

  const metaPipeline = redisClient.pipeline();
  for (const username of usernames) {
    metaPipeline.hgetall(getMetaKey(username));
  }

  const metadataResults = await metaPipeline.exec();

  return usernames.map((username, index) => ({
    username,
    tier: metadataResults[index][1]?.tier || "Iron",
  }));
}

async function runSimulation() {
  await redisClient.connect();

  const totalPlayers = await redisClient.zcard(LEADERBOARD_KEY);
  if (totalPlayers === 0) {
    console.error("Leaderboard is empty. Run `npm run seed` first.");
    await redisClient.quit();
    process.exit(1);
  }

  const players = await loadPlayersWithTier();
  console.log(`Simulation started with ${players.length} players.`);

  let tickNumber = 0;
  let tickInProgress = false;

  async function tick() {
    if (tickInProgress) {
      return;
    }

    tickInProgress = true;
    tickNumber += 1;

    try {
      const updatesPerTick = getRandomInt(3, 6);
      const selectedPlayers = pickRandomPlayers(players, updatesPerTick);
      const selectedUpdates = [];
      const scorePipeline = redisClient.pipeline();

      for (const player of selectedPlayers) {
        const delta = getRandomDelta(player.tier);
        selectedUpdates.push({ username: player.username, delta });
        scorePipeline.zincrby(LEADERBOARD_KEY, delta, player.username);
      }

      const scoreResults = await scorePipeline.exec();

      const events = selectedUpdates.map((update, index) => {
        const newScore = Number.parseInt(scoreResults[index][1], 10);

        return {
          username: update.username,
          delta: update.delta,
          newScore,
        };
      });

      const leaderboard = await getTopLeaderboard(20);
      printLeaderboard(leaderboard, events, tickNumber);
    } catch (error) {
      console.error("Simulation tick failed:", error.message);
    } finally {
      tickInProgress = false;
    }
  }

  await tick();
  const intervalId = setInterval(tick, 2000);

  process.on("SIGINT", async () => {
    clearInterval(intervalId);
    await redisClient.quit();
    console.log("Simulation stopped.");
    process.exit(0);
  });
}

runSimulation().catch(async (error) => {
  console.error("Simulator error:", error.message);

  try {
    await redisClient.quit();
  } catch {
    // Ignore close errors while exiting after a failure.
  }

  process.exit(1);
});