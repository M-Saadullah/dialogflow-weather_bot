// index.js
import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const city = req.body.queryResult.parameters.city;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENWEATHER_API_KEY environment variable" });
  }
  if (!city) {
    return res.status(400).json({ error: "Missing 'city' parameter" });
  }
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
  const data = await response.json();

  const weather = data.weather[0].description;
  const temp = data.main.temp;

  return res.json({
    fulfillmentText: `The weather in ${city} is ${weather} with a temperature of ${temp}°C.`,
  });
});

app.listen(3000, () => console.log("Server is running on port 3000"));
