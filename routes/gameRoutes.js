const express = require("express");
const { searchGames } = require("../controllers/gameController");

const router = express.Router();

router.post("/searchGames", searchGames);

module.exports = router;
