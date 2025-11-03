// index.js
import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const params = req.body.queryResult.parameters;
  const city = params.city || params["geo-city"];
  const date = params["date-time"];
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!city) {
    return res.json({
      fulfillmentText: "Please tell me which city you'd like the weather for.",
    });
  }

  try {
    // If user asked for future date (forecast)
    if (date) {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
          city
        )}&appid=${apiKey}&units=metric`
      );
      const data = await response.json();

      // Get tomorrow’s date in YYYY-MM-DD
      const targetDate = new Date(date).toISOString().split("T")[0];
      const forecast = data.list.find((item) =>
        item.dt_txt.startsWith(targetDate)
      );

      if (forecast) {
        const weather = forecast.weather[0].description;
        const temp = forecast.main.temp;
        return res.json({
          fulfillmentText: `The forecast for ${city} on ${targetDate} is ${weather} with a temperature of ${temp}°C.`,
        });
      }
    }

    // Otherwise, current weather
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${apiKey}&units=metric`
    );
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
