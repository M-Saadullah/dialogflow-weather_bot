// index.js
import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const params = req.body.queryResult.parameters;
  const city = params.city || params["geo-city"]; // ✅ Handles both cases
  const apiKey = process.env.OPENWEATHER_API_KEY;

  // Validate API key
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Missing OPENWEATHER_API_KEY environment variable" });
  }

  // Validate city parameter
  if (!city) {
    return res.json({
      fulfillmentText:
        "Please tell me which city you'd like to know the weather for.",
    });
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    const weather = data.weather[0].description;
    const temp = data.main.temp;

    return res.json({
      fulfillmentText: `The weather in ${city} is ${weather} with a temperature of ${temp}°C.`,
    });
  } catch (error) {
    console.error("Error fetching weather:", error);
    return res.json({
      fulfillmentText:
        "Sorry, I couldn't fetch the weather information right now.",
    });
  }
});

app.listen(3000, () => console.log("Server is running on port 3000"));
