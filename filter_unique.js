/** @format */

const fs = require("fs");
const csv = require("csv-parser");
const { createObjectCsvWriter } = require("csv-writer");

const inputFilePath = "vehmodel_crashes_cris3.csv";
const outputFilePath = "vehmodel_crashes_unique.csv";

// Track unique keys
const seen = new Set();
const uniqueRows = [];

fs.createReadStream(inputFilePath)
  .pipe(csv())
  .on("data", (row) => {
    const key = `${row.Veh_Make_ID?.trim()}-${row.Veh_Mod_ID?.trim()}-${row.Veh_Mod_Year?.trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  })
  .on("end", async () => {
    const headers = Object.keys(uniqueRows[0]).map((key) => ({
      id: key,
      title: key,
    }));

    const csvWriter = createObjectCsvWriter({
      path: outputFilePath,
      header: headers,
    });

    await csvWriter.writeRecords(uniqueRows);
    console.log(
      `✅ Saved ${uniqueRows.length} unique rows to ${outputFilePath}`
    );
  });
