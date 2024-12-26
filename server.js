// Import required libraries
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const qs = require("qs");
const cheerio = require("cheerio");
const CryptoJS = require("crypto-js"); // For MD5 hashing
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const fs = require("fs");
const path = require("path");
require("dotenv").config(); // Load .env variables

// Initialize express app
const app = express();
const allowedOrigins = [
  "https://demo-project-a7umtayvs-babuvaas-projects.vercel.app",
  "https://demo-project-git-master-babuvaas-projects.vercel.app",
  "http://localhost:5173",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow request
    } else {
      callback(new Error("Not allowed by CORS")); // Block request
    }
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Cookie"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser()); // Middleware to parse cookies
// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use("/downloads", express.static(path.join(__dirname, "downloadFile")));
// Initialize cookie jar for Axios
const jar = new CookieJar();
const client = wrapper(axios.create({ jar })); // Use the wrapper to create an Axios client with cookie support

// Your existing login route
app.post("/login", async (req, res) => {
  jar.removeAllCookiesSync();
  console.log("login");
  try {
    // Step 1: Load the home page and extract loginToken and JSESSIONID
    const homePageResponse = await client.get(
      "https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/"
    );

    // Parse the HTML to extract loginToken
    const $ = cheerio.load(homePageResponse.data);
    const loginToken = $('input[name="loginToken"]').val(); // Extract the loginToken from the hidden input field
    const jsessionId = homePageResponse.headers["set-cookie"]
      .find((cookie) => cookie.startsWith("JSESSIONID"))
      .split(";")[0]
      .split("=")[1]; // Extract JSESSIONID from cookie

    if (!loginToken || !jsessionId) {
      return res
        .status(400)
        .json({ message: "Login token or JSESSIONID not found" });
    }

    // Step 2: Prepare the login payload with the form data
    const firstHash = "25d55ad283aa400af464c76d713c07ad"; // Example static hash
    const combinedString = firstHash + loginToken;
    const finalPasswordHash = CryptoJS.MD5(combinedString).toString(
      CryptoJS.enc.Hex
    );

    const loginPayload = qs.stringify({
      "struts.token.name": "loginToken",
      loginToken: loginToken,
      "newLoginBean.userName": "bomaster",
      "newLoginBean.password": finalPasswordHash,
    });

    // Step 3: Send the POST request for login
    const loginResponse = await client.post(
      "https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/com/stpl/pms/action/bo/lm/bo_lm_login.action",
      loginPayload,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: `JSESSIONID=${jsessionId}`, // Send the extracted JSESSIONID cookie
        },
      }
    );

    res.json({
      message: "Login successful",
      data: loginResponse.data, // The response from the login API
    });
  } catch (error) {
    console.error("Error during login process:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to get Game Data and Download Links
app.post("/searchGames", async (req, res) => {
  console.log("searching games");
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
});

// Download Game Route (This is for extracting download links, not file download)
app.get("/downloadGame", async (req, res) => {
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

    if (
      !noOfTickets ||
      !gameName ||
      !gameNO ||
      !no_Of_Tickets_Per_Book ||
      !no_Of_Books_Per_Pack ||
      !noOfticketsInFile ||
      !batchNo
    ) {
      return res
        .status(400)
        .json({ message: "Missing required query parameters" });
    }

    const downloadUrl = `https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/com/stpl/pms/action/bo/gl/st_download_game.action?noOfTickets=${noOfTickets}&gameName=${gameName}&gameNO=${gameNO}&no_Of_Tickets_Per_Book=${no_Of_Tickets_Per_Book}&no_Of_Books_Per_Pack=${no_Of_Books_Per_Pack}&noOfticketsInFile=${noOfticketsInFile}&batchNo=${batchNo}`;

    const downloadResponse = await client.get(downloadUrl, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    const $ = cheerio.load(downloadResponse.data);

    // Check if #subReportTable1 is present in the HTML and log the result
    const tableExists = $("#subReportTable1").length > 0;
    const extractedData = [];

    if (tableExists) {
      // Extracting the data

      $("#subReportTable1 tbody tr").each((index, row) => {
        const ticketRange = $(row).find("td").eq(0).text().trim(); // Extract Ticket Range (First column)
        const textFileLink = $(row)
          .find("td")
          .eq(1) // Second column: Ticket Text File
          .find("a")
          .attr("onclick")
          ?.match(/clickme\("([^"]+)"\)/); // Extract the URL inside the onclick

        const virnFileLink = $(row)
          .find("td")
          .eq(2) // Third column: Ticket VIRN File
          .find("a")
          .attr("onclick")
          ?.match(/clickme\("([^"]+)"\)/); // Extract the URL inside the onclick

        if (ticketRange && textFileLink && virnFileLink) {
          extractedData.push({
            TicketRange: ticketRange,
            files: {
              textFile: {
                filename: $(row).find("td").eq(1).find("a").text(),
                link: textFileLink[1], // Extracted link
              },
              virnFile: {
                filename: $(row).find("td").eq(2).find("a").text(),
                link: virnFileLink[1], // Extracted link
              },
            },
          });
        }
      });
    } else {
      console.log("#subReportTable1 not found.");
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
});

// Download File Route (Handles actual file download)
app.get("/downloadFile", async (req, res) => {
  console.log("Downloading file...");

  try {
    const { fileNametoDownload } = req.query;
    console.log(req.query);
    if (!fileNametoDownload) {
      return res.status(400).json({
        message:
          "Both fileNametoDownlaod and fileNametoDownlaod2 are required.",
      });
    }

    const downloadUrl = `https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/com/stpl/pms/action/bo/gl/st_download_game_downloadFile.action?subReportTable1_length=10&fileNametoDownlaod=${encodeURIComponent(
      fileNametoDownload
    )}&fileNametoDownlaod=`;

    console.log(downloadUrl);
    const downloadResponse = await client.get(downloadUrl, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
      responseType: "stream",
    });

    const contentDisposition = downloadResponse.headers["content-disposition"];
    let fileName = fileNametoDownload.split("/").pop();

    if (contentDisposition && contentDisposition.indexOf("filename=") !== -1) {
      fileName = contentDisposition
        .split("filename=")[1]
        .replace(/"/g, "")
        .trim();
    }

    const filePath = path.join(__dirname, "downloadFile", fileName);
    const fileStream = fs.createWriteStream(filePath);

    downloadResponse.data.pipe(fileStream);

    fileStream.on("finish", () => {
      res.json({
        message: "File downloaded successfully",
        downloadUrl: `/downloads/${fileName}`,
      });
    });

    fileStream.on("error", (err) => {
      console.error("Error while saving the file:", err);
      res
        .status(500)
        .json({ message: "Error while saving the file", error: err.message });
    });
    console.log("file downloaded");
  } catch (error) {
    console.error("Error during download request:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

app.get("/generateData", async (req, res) => {
  console.log("generating data");
  const { ticketStatus } = req.query;
  if (!ticketStatus) {
    return res
      .status(400)
      .json({ error: "ticketStatus query parameter is required" });
  }
  const externalUrl = `https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/com/stpl/pms/action/bo/gl/st_game_status_gameUploadGeneration.action?ticketStatus=${ticketStatus}`;

  try {
    // Use the pre-configured axios client to fetch the JSP page
    const response = await client.get(externalUrl);

    // Load the response data into cheerio
    const $ = cheerio.load(response.data);

    // Check if the #roleId1 select element exists in the HTML
    const selectoption = $("#roleId1").length > 0;

    if (!selectoption) {
      return res.status(400).json({ data: "No data exists" });
    }

    // Extract values from the select element with id="roleId1"
    const optionValues = [];
    $("#roleId1 option").each((index, element) => {
      const value = $(element).val();
      // Exclude the "--Please Select--" option
      if (value !== "-1" && value) {
        optionValues.push(value);
      }
    });

    // Forward the external API response to the client
    res.status(response.status).json({ data: optionValues });
  } catch (error) {
    console.error("Error while generating data:", error.message);
    // Handle the error gracefully and send a response to the frontend
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Failed to fetch data",
    });
  }
});
app.get("/generateGameData", async (req, res) => {
  console.log("generating game data");
  const { ticketStatus, gameNo } = req.query;
  if (!ticketStatus) {
    return res
      .status(400)
      .json({ error: "ticketStatus query parameter is required" });
  }
  const externalUrl = `https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/com/stpl/pms/action/bo/gl/st_batch_status_gameUploadGeneration.action?gameNo=${gameNo}&ticketStatus=${ticketStatus}`;

  console.log(externalUrl);
  try {
    // Use the pre-configured axios client to fetch the JSP page
    const response = await client.get(externalUrl);

    // Load the response data into cheerio
    const $ = cheerio.load(response.data);

    console.log(response.data);
    // Check if the #roleId1 select element exists in the HTML
    const selectoption = $("#roleId").length > 0;

    if (!selectoption) {
      return res.status(400).json({ data: "No data exists" });
    }

    // Extract values from the select element with id="roleId1"
    const optionValues = [];
    $("#roleId option").each((index, element) => {
      const value = $(element).val();
      // Exclude the "--Please Select--" option
      if (value !== "-1" && value) {
        optionValues.push(value);
      }
    });

    // Forward the external API response to the client
    res.status(response.status).json({ data: optionValues });
  } catch (error) {
    console.error("Error while generating data:", error.message);
    // Handle the error gracefully and send a response to the frontend
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Failed to fetch data",
    });
  }
});

app.get("/generateAllData", async (req, res) => {
  console.log("generating All data");
  const { batchNo, gameNo } = req.query;
  if (!batchNo || !gameNo) {
    return res
      .status(400)
      .json({ error: "ticketStatus query parameter is required" });
  }
  const externalUrl = `https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/com/stpl/pms/action/bo/gl/ticket_generate_start_click.action?gameNo=${gameNo}&batchNo=${batchNo}`;

  console.log(externalUrl);
  try {
    // Use the pre-configured axios client to fetch the JSP page
    const response = await client.get(externalUrl);
    console.log(response.data);
    // Forward the external API response to the client
    res.status(response.status).json({ data: "success" });
  } catch (error) {
    console.error("Error while generating data:", error.message);
    // Handle the error gracefully and send a response to the frontend
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Failed to fetch data",
    });
  }
});

app.get("/logout", async (req, res) => {
  console.log("logout");
  try {
    const url =
      "https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/com/stpl/pms/action/bo/lm/bo_lm_logout.action";
    const response = await client.get(url);
    jar.removeAllCookiesSync();
    res.status(response.status).json({ logout: "logout" });
  } catch (error) {}
});
// Start the server on port 5000 (or any available port)
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
