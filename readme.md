# GPT Vehicle Data Enrichment

This Node.js application enriches vehicle crash data by using OpenAI's GPT model to determine electric, hybrid, and safety features of vehicles based on make, model, and year.

## Features

- Processes CSV files containing vehicle crash data
- Uses GPT-3.5-turbo to analyze vehicle specifications
- Determines if vehicles are:
  - Electric
  - Hybrid
  - Equipped with Automatic Braking System (AEB)
- Handles errors gracefully
- Supports resuming interrupted processing
- Rate limiting to respect OpenAI's API limits

## Prerequisites

- Node.js
- OpenAI API key

## Installation

1. Clone the repository
2. Install dependencies:
```sh
npm install
```
3. Copy `.env.example` to `.env` and add your OpenAI API key:
```sh
OPENAI_API_KEY=your_api_key_here
```

## Usage

1. Place your input CSV file as `vehmodel_crashes_cris3.csv`
2. Run the script:
```sh
node index.js
```

The script will process the input file and create `vehmodel_crashes_streamed.csv` with additional columns for:
- IsElectric
- IsHybrid
- HasAutomaticBrakingSystem

## Dependencies

- csv-parser: CSV file parsing
- csv-writer: CSV file writing
- dotenv: Environment variable management
- openai: OpenAI API client

## Error Handling

- Skips already processed entries
- Handles missing data gracefully
- Implements fallbacks for API errors
- Logs processing status with emojis for better visibility

## Rate Limiting

The script includes a 101ms delay between API calls to stay within OpenAI's rate limits (approximately 500 requests per minute).