const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const client = wrapper(axios.create({ jar: new CookieJar() }));

const downloadGame = async (req, res) => {
  try {
    const {
      noOfTickets,
      gameName,
      gameNO,
      no_Of_Tickets_Per_Book,
      no_Of_Books_Per_Pack,
      noOfticketsInFile,
      batchNo,
    } = req.query;

    const downloadUrl = `https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/com/stpl/pms/action/bo/gl/st_download_game.action?noOfTickets=${noOfTickets}&gameName=${gameName}&gameNO=${gameNO}&no_Of_Tickets_Per_Book=${no_Of_Tickets_Per_Book}&no_Of_Books_Per_Pack=${no_Of_Books_Per_Pack}&noOfticketsInFile=${noOfticketsInFile}&batchNo=${batchNo}`;

    const downloadResponse = await client.get(downloadUrl, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    const $ = cheerio.load(downloadResponse.data);
    const tableExists = $("#subReportTable1").length > 0;
    const extractedData = [];

    if (tableExists) {
      $("#subReportTable1 tbody tr").each((index, row) => {
        const ticketRange = $(row).find("td").eq(0).text().trim();
        const textFileLink = $(row)
          .find("td")
          .eq(1)
          .find("a")
          .attr("onclick")
          ?.match(/clickme\("([^"]+)"\)/);
        const virnFileLink = $(row)
          .find("td")
          .eq(2)
          .find("a")
          .attr("onclick")
          ?.match(/clickme\("([^"]+)"\)/);

        if (ticketRange && textFileLink && virnFileLink) {
          extractedData.push({
            TicketRange: ticketRange,
            files: {
              textFile: {
                filename: $(row).find("td").eq(1).find("a").text(),
                link: textFileLink[1],
              },
              virnFile: {
                filename: $(row).find("td").eq(2).find("a").text(),
                link: virnFileLink[1],
              },
            },
          });
        }
      });
    }

    res.json({
      message: "Download links extracted successfully",
      data: extractedData,
    });
  } catch (error) {
    console.error("Error during download request:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports = { downloadGame };
