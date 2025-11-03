## WeatherWebhookAI

A minimal Express-based webhook that returns current weather information for a requested city using the OpenWeather API. Designed to be used as a webhook with NLP platforms (e.g., Dialogflow), expecting a `city` parameter in the payload.

### Features
- **POST /webhook**: Accepts a `city` and responds with a human-friendly weather sentence
- Uses **OpenWeather** current weather endpoint (metric units)

### Requirements
- Node.js 18+ (ESM support and to align with `node-fetch@3`)
- An OpenWeather API key

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure OpenWeather API key:
   - The project currently sets the API key directly in `index.js` at the line defining `apiKey`.
   - Replace the placeholder with your own key, or refactor the code to read from an environment variable (recommended):
     - Create a `.env` file and add `OPENWEATHER_API_KEY=your_key_here`
     - Update `index.js` to read from `process.env.OPENWEATHER_API_KEY`

### Run
```bash
node index.js
```
The server starts on port `3000`.

### Endpoint
- **POST** `/webhook`
  - Expects JSON with a Dialogflow-like structure where `req.body.queryResult.parameters.city` holds the city name.

#### Example request
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
        "queryResult": {
          "parameters": { "city": "London" }
        }
      }'
```

#### Example response
```json
{
  "fulfillmentText": "The weather in London is scattered clouds with a temperature of 14°C."
}
```

### Notes
- Response text depends on OpenWeather fields `weather[0].description` and `main.temp`.
- If integrating with Dialogflow, map your intent to include a `city` parameter so it appears in `queryResult.parameters.city`.

### Project Structure
- `index.js`: Express app, webhook route, OpenWeather fetch logic
- `.gitignore`: Standard Node.js ignores, including lockfiles and environment files

### License
ISC

