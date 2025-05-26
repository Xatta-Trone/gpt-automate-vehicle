/** @format */

require("dotenv").config();
const fs = require("fs");
const csv = require("csv-parser");
const { createObjectCsvWriter } = require("csv-writer");
const { OpenAI } = require("openai");

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// File paths
const inputFilePath = "vehmodel_crashes_cris3.csv";
const outputFilePath = "vehmodel_crashes_streamed.csv";

// System prompt for GPT
const systemPrompt = `You are a vehicle information assistant. Based on the vehicle's make, model, and model year, your task is to determine whether it is:

1. Electric (True/False)  
2. Hybrid (True/False)  
3. Has an Automatic Braking System (AEB)/ Emergency braking system (EBS) or not (True/False)  

Return your answer in the format:
{
  "IsElectric": true/false,
  "IsHybrid": true/false,
  "HasAutomaticBrakingSystem": true/false
}`;

// Initialize CSV writer
const csvWriter = createObjectCsvWriter({
  path: outputFilePath,
  header: [
    { id: "Veh_Make_ID", title: "Veh_Make_ID" },
    { id: "Veh_Mod_ID", title: "Veh_Mod_ID" },
    { id: "Veh_Mod_Year", title: "Veh_Mod_Year" },
    { id: "n_crashes", title: "n_crashes" },
    { id: "IsElectric", title: "IsElectric" },
    { id: "IsHybrid", title: "IsHybrid" },
    { id: "HasAutomaticBrakingSystem", title: "HasAutomaticBrakingSystem" },
  ],
  append: fs.existsSync(outputFilePath),
});

// Load already processed entries
const processed = new Set();

function loadProcessedRows() {
  return new Promise((resolve) => {
    if (!fs.existsSync(outputFilePath)) return resolve();
    fs.createReadStream(outputFilePath)
      .pipe(csv())
      .on("data", (row) => {
        const key = `${row.Veh_Make_ID}-${row.Veh_Mod_ID}-${row.Veh_Mod_Year}`;
        processed.add(key);
      })
      .on("end", () => {
        console.log(`🔄 Loaded ${processed.size} processed entries.`);
        resolve();
      });
  });
}

// Small delay function
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Process a single row
async function processRow(row) {
  const make = row.Veh_Make_ID?.trim();
  const model = row.Veh_Mod_ID?.trim();
  const year = row.Veh_Mod_Year?.trim();

  const key = `${make}-${model}-${year}`;
  if (processed.has(key)) {
    console.log(`⏭️ Skipping already processed: ${key}`);
    return;
  }

  if (!make || !model || !year) {
    console.log("⚠️ Skipping row with missing data:", row);
    return;
  }

  const prompt = `Make: ${make}, Model: ${model}, Year: ${year}`;
  console.log(`→ Processing: ${prompt}`);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });

    const content = response.choices[0].message.content;
    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch {
      console.warn("⚠️ Could not parse GPT response. Using fallback.");
      parsed = {
        IsElectric: "Unknown",
        IsHybrid: "Unknown",
        HasAutomaticBrakingSystem: "Unknown",
      };
    }

    const finalRow = {
      Veh_Make_ID: make,
      Veh_Mod_ID: model,
      Veh_Mod_Year: year,
      n_crashes: row.n_crashes,
      ...parsed,
    };

    await csvWriter.writeRecords([finalRow]);
    processed.add(key);
    console.log("✅ Saved:", finalRow);
  } catch (error) {
    console.error(`❌ GPT error for ${prompt}:`, error.message);

    const errorRow = {
      Veh_Make_ID: make,
      Veh_Mod_ID: model,
      Veh_Mod_Year: year,
      n_crashes: row.n_crashes,
      IsElectric: "Error",
      IsHybrid: "Error",
      HasAutomaticBrakingSystem: "Error",
    };

    await csvWriter.writeRecords([errorRow]);
    processed.add(key);
  }

  await sleep(101); // 500 RPM limit (~100ms/request)
}

// Main execution flow
(async () => {
  await loadProcessedRows();

  const readStream = fs.createReadStream(inputFilePath).pipe(csv());

  readStream.on("data", async (row) => {
    readStream.pause(); // Pause while processing
    await processRow(row);
    readStream.resume(); // Continue
  });

  readStream.on("end", () => {
    console.log("🎉 All rows processed and saved.");
  });
})();
