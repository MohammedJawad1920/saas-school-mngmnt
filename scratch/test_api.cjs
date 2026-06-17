const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function test() {
  const url = "http://localhost:3000/api/attendances?page=0&limit=0&startDate=2026-05-08&endDate=2026-05-14&date=2026-05-10&year=2025+november";
  console.log(`Fetching ${url}`);
  try {
    const response = await axios.get(url, {
      headers: {
        "api-key": process.env.API_KEY || ""
      }
    });
    console.log("Response status:", response.status);
    console.log("Data count:", response.data.attendances?.length);
  } catch (error) {
    console.error("Error status:", error.response?.status);
    console.error("Error data summary:", error.response?.data?.slice?.(0, 100));
  }
}

test();
