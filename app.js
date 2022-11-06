const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log("DB Error: ${e.message}");
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjectToResponseObjectPlayer = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertDbObjectToResponseObjectMatch = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayersArrayQuery = `
SELECT *
FROM player_details;`;

  const playersArray = await db.all(getPlayersArrayQuery);
  const convertedPlayersArray = [];

  for (let i of playersArray) {
    convertedPlayersArray.push(convertDbObjectToResponseObjectPlayer(i));
  }

  response.send(convertedPlayersArray);
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
    SELECT *
    FROM player_details
    WHERE player_id = ${playerId};`;

  const playerDetails = await db.get(getPlayerQuery);
  const convertedPlayerDetails = convertDbObjectToResponseObjectPlayer(
    playerDetails
  );
  response.send(convertedPlayerDetails);
});

app.put("/players/:playerId/", async (request, response) => {
  const playerDetails = request.body;
  const { playerId } = request.params;
  const { playerName } = playerDetails;
  const updatePlayerDetails = `
  UPDATE player_details
  SET 
  player_name = '${playerName}'
  WHERE player_id = ${playerId};`;

  await db.run(updatePlayerDetails);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetails = `
SELECT *
FROM match_details
WHERE match_id = ${matchId};`;

  const matchDetails = await db.get(getMatchDetails);
  const convertedMatchDetails = convertDbObjectToResponseObjectMatch(
    matchDetails
  );
  response.send(convertedMatchDetails);
});

app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;

  const playerMatchDetailsQuery = `
SELECT match_details.match_id AS matchId,
match_details.match AS match,
match_details.year AS year
FROM match_details INNER JOIN player_match_score
ON match_details.match_id = player_match_score.match_id
WHERE player_id = ${playerId}`;

  const matchesArray = await db.all(playerMatchDetailsQuery);

  response.send(matchesArray);
});

app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const matchPlayerDetailsQuery = `
SELECT player_details.player_id AS playerId,
player_details.player_name AS playerName
FROM player_details INNER JOIN player_match_score
ON player_details.player_id = player_match_score.player_id
WHERE match_id = ${matchId};`;

  const playersArray = await db.all(matchPlayerDetailsQuery);
  response.send(playersArray);
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScoresQuery = `
SELECT player_id,
SUM(player_match_score.score) AS totalScore,
SUM(player_match_score.fours) AS totalFours,
SUM(player_match_score.sixes) AS totalSixes
FROM player_match_score
WHERE player_match_score.player_id = '${playerId}'
;`;

  const getPlayerScores = await db.all(getPlayerScoresQuery);
  response.send(getPlayerScores);
});

module.exports = app;
