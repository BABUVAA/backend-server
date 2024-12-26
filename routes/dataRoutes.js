const express = require("express");
const {
  generateData,
  generateGameData,
  generateAllData,
} = require("../controllers/dataController");

const router = express.Router();

router.get("/generateData", generateData);
router.get("/generateGameData", generateGameData);
router.get("/generateAllData", generateAllData);

module.exports = router;
