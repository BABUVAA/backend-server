const express = require("express");
const { downloadGame } = require("../controllers/filecontroller");

const router = express.Router();

router.get("/downloadGame", downloadGame);

module.exports = router;
