const axios = require("axios");
const CryptoJS = require("crypto-js");
const qs = require("qs");
const cheerio = require("cheerio");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const client = wrapper(axios.create({ jar: new CookieJar() }));

const login = async (req, res) => {
  try {
    const homePageResponse = await client.get(
      "https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/"
    );

    const $ = cheerio.load(homePageResponse.data);
    const loginToken = $('input[name="loginToken"]').val();
    const jsessionId = homePageResponse.headers["set-cookie"]
      .find((cookie) => cookie.startsWith("JSESSIONID"))
      .split(";")[0]
      .split("=")[1];

    if (!loginToken || !jsessionId) {
      return res
        .status(400)
        .json({ message: "Login token or JSESSIONID not found" });
    }

    const firstHash = "25d55ad283aa400af464c76d713c07ad";
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

    const loginResponse = await client.post(
      "https://uat-api.mayfaironlinecasino.co.ke/WeaverBO/com/stpl/pms/action/bo/lm/bo_lm_login.action",
      loginPayload,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: `JSESSIONID=${jsessionId}`,
        },
      }
    );

    res.json({
      message: "Login successful",
      data: loginResponse.data,
    });
  } catch (error) {
    console.error("Error during login process:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { login };
