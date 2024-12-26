const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const cheerio = require("cheerio");

const client = wrapper(axios.create({ jar: new CookieJar() }));

// Controller function to fetch game data from an external service
module.exports.fetchGameData = async (req, res) => {
  try {
    const { gameId, batchNo } = req.query;

    // Construct the URL with query parameters
    const gameDataUrl = `https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/com/stpl/pms/action/bo/gl/st_fetch_game_data.action?gameId=${gameId}&batchNo=${batchNo}`;

    // Send a GET request to fetch the data
    const response = await client.get(gameDataUrl, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    const $ = cheerio.load(response.data);
    const gameData = [];

    // Extract relevant data from the HTML (this can vary depending on the structure of the response)
    $("table.gameData tbody tr").each((index, row) => {
      const gameDetails = {
        gameNumber: $(row).find("td").eq(0).text().trim(),
        gameName: $(row).find("td").eq(1).text().trim(),
        batchNumber: $(row).find("td").eq(2).text().trim(),
      };
      gameData.push(gameDetails);
    });

    // Send the extracted game data as a JSON response
    res.json({
      message: "Game data fetched successfully",
      data: gameData,
    });
  } catch (error) {
    console.error("Error fetching game data:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

