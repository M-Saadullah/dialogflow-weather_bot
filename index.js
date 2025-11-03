// index.js
import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());

// Helper function to format temperature with feels like
const formatTemperature = (temp, feelsLike) => {
  if (Math.abs(temp - feelsLike) > 3) {
    return `${temp}°C (feels like ${feelsLike}°C)`;
  }
  return `${temp}°C`;
};

// Helper function to get weather emoji
const getWeatherEmoji = (description) => {
  const lower = description.toLowerCase();
  if (lower.includes("clear")) return "☀️";
  if (lower.includes("cloud")) return "☁️";
  if (lower.includes("rain")) return "🌧️";
  if (lower.includes("thunder")) return "⛈️";
  if (lower.includes("snow")) return "❄️";
  if (lower.includes("mist") || lower.includes("fog")) return "🌫️";
  return "🌤️";
};

// Helper function to format wind information
const formatWind = (speed) => {
  if (speed < 1) return "calm";
  if (speed < 5) return "light breeze";
  if (speed < 11) return "moderate breeze";
  if (speed < 20) return "strong breeze";
  return "very windy";
};

// Helper function to get clothing recommendation
const getClothingAdvice = (temp, weatherDesc) => {
  const lower = weatherDesc.toLowerCase();
  
  if (lower.includes("rain")) {
    return "Don't forget your umbrella! ☔";
  }
  if (temp < 5) {
    return "Bundle up warm - it's quite cold! 🧥";
  }
  if (temp < 15) {
    return "A jacket would be a good idea. 🧥";
  }
  if (temp > 30) {
    return "Stay cool and hydrated! 🥤";
  }
  if (temp > 25) {
    return "Light clothing recommended. 👕";
  }
  return "";
};

// Format date for better readability
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "today";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "tomorrow";
  }
  
  return date.toLocaleDateString("en-US", { 
    weekday: "long", 
    month: "short", 
    day: "numeric" 
  });
};

const normalizeDate = (dt) => {
  if (!dt) return null;
  let value = dt;

  // If Dialogflow sends an array, take the first
  if (Array.isArray(value)) {
    value = value[0];
  }

  // If we received a JSON string, try to parse it
  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        // Not valid JSON; assume it's a date string already
        return value;
      }
    } else {
      return value; // plain date string
    }
  }

  if (value && typeof value === "object") {
    return value.date_time || value.startDateTime || value.date || null;
  }

  return null;
};

app.post("/webhook", async (req, res) => {
  const params = req.body.queryResult?.parameters;
  
  if (!params) {
    return res.json({
      fulfillmentText: "I couldn't understand your request. Please try again.",
    });
  }

  const city = params.city || params["geo-city"];
  const date = normalizeDate(params["date-time"]) || normalizeDate(params.datetime);

  const apiKey = process.env.OPENWEATHER_API_KEY;

  // Validate API key
  if (!apiKey) {
    console.error("OPENWEATHER_API_KEY not configured");
    return res.json({
      fulfillmentText: "Weather service is not configured. Please contact support.",
    });
  }

  if (!city) {
    return res.json({
      fulfillmentText: "Please tell me which city you'd like the weather for. 🌍",
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

      if (!response.ok) {
        if (response.status === 404) {
          return res.json({
            fulfillmentText: `I couldn't find weather data for "${city}". Please check the city name and try again.`,
          });
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) {
        return res.json({
          fulfillmentText: "I couldn't understand the date you provided. Please try another date (e.g., 'tomorrow' or '2025-11-03').",
        });
      }
      const targetDate = parsed.toISOString().split("T")[0];
      const forecast = data.list.find((item) =>
        item.dt_txt.startsWith(targetDate)
      );

      if (forecast) {
        const weather = forecast.weather[0].description;
        const emoji = getWeatherEmoji(weather);
        const temp = Math.round(forecast.main.temp);
        const feelsLike = Math.round(forecast.main.feels_like);
        const humidity = forecast.main.humidity;
        const windSpeed = forecast.wind.speed;
        const windDesc = formatWind(windSpeed);
        const advice = getClothingAdvice(temp, weather);
        const dateFormatted = formatDate(targetDate);

        let response = `${emoji} Forecast for ${city} ${dateFormatted}:\n\n`;
        response += `Weather: ${weather}\n`;
        response += `Temperature: ${formatTemperature(temp, feelsLike)}\n`;
        response += `Humidity: ${humidity}%\n`;
        response += `Wind: ${windSpeed} m/s (${windDesc})`;
        
        if (advice) {
          response += `\n\n${advice}`;
        }

        return res.json({ fulfillmentText: response });
      } else {
        return res.json({
          fulfillmentText: `I don't have forecast data for ${city} on that date. I can only provide forecasts up to 5 days ahead.`,
        });
      }
    }

    // Current weather
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return res.json({
          fulfillmentText: `I couldn't find "${city}". Please check the spelling or try a different city name.`,
        });
      }
      if (response.status === 401) {
        console.error("Invalid API key");
        return res.json({
          fulfillmentText: "Weather service authentication failed. Please contact support.",
        });
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const weather = data.weather[0].description;
    const emoji = getWeatherEmoji(weather);
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const windDesc = formatWind(windSpeed);
    const pressure = data.main.pressure;
    const visibility = data.visibility ? (data.visibility / 1000).toFixed(1) : "N/A";
    const advice = getClothingAdvice(temp, weather);

    let responseText = `${emoji} Current weather in ${city}:\n\n`;
    responseText += `Conditions: ${weather}\n`;
    responseText += `Temperature: ${formatTemperature(temp, feelsLike)}\n`;
    responseText += `Humidity: ${humidity}%\n`;
    responseText += `Wind: ${windSpeed} m/s (${windDesc})\n`;
    responseText += `Pressure: ${pressure} hPa\n`;
    responseText += `Visibility: ${visibility} km`;
    
    if (advice) {
      responseText += `\n\n${advice}`;
    }

    return res.json({ fulfillmentText: responseText });

  } catch (error) {
    console.error("Error fetching weather:", error);
    
    // More specific error messages
    if (error.code === "ENOTFOUND") {
      return res.json({
        fulfillmentText: "Cannot connect to weather service. Please check your internet connection.",
      });
    }
    
    return res.json({
      fulfillmentText: `Sorry, I encountered an error while fetching weather for ${city}. Please try again later.`,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "weather-webhook"
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Weather Webhook Service",
    endpoints: {
      webhook: "POST /webhook",
      health: "GET /health"
    }
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌤️  Weather webhook server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});