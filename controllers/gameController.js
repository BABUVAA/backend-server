const axios = require("axios");
const qs = require("qs");
const cheerio = require("cheerio");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const client = wrapper(axios.create({ jar: new CookieJar() }));

const searchGames = async (req, res) => {
  try {
    const { userName, gameName, gameNO, ticketPrize } = req.body;

    const submitPayload = qs.stringify({
      userName: userName,
      gameName: gameName,
      gameNO: gameNO,
      ticketPrize: ticketPrize,
    });

    const response = await client.post(
      "https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/com/stpl/pms/action/bo/gl/st_test_submit_btn.action",
      submitPayload,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    const htmlContent = response.data;
    const $ = cheerio.load(htmlContent);

    let gamesData = [];

    $("#subReportTable tbody tr").each((index, element) => {
      const gameName = $(element).find("td").eq(1).text().trim();
      const gameNo = $(element).find("td").eq(2).text().trim();
      const batchNo = $(element).find("td").eq(3).text().trim();
      const ticketType = $(element).find("td").eq(4).text().trim();
      const ticketCost = $(element).find("td").eq(5).text().trim();
      const noOfTickets = $(element).find("td").eq(6).text().trim();
      const status = $(element).find("td").eq(7).text().trim();

      gamesData.push({
        gameName,
        gameNo,
        batchNo,
        ticketType,
        ticketCost,
        noOfTickets,
        status,
      });
    });

    res.json({
      message: "Test submitted successfully",
      data: gamesData,
    });
  } catch (error) {
    console.error("Submit Test error:", error);
    res
      .status(500)
      .json({ message: "Submission failed", error: error.message });
  }
};

module.exports = { searchGames };
