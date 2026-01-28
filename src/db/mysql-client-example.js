const MySQLClient = require("./mysql-client");

/**
 * Example usage of the getPatientsByCategory function
 * This demonstrates how to retrieve and work with patient groups by demographics
 */
async function exampleUsage() {
  const client = new MySQLClient();

  try {
    // Connect to the database
    await client.connect();

    // Example 1: Get all patients grouped by gender
    console.log("Example 1: Patients grouped by GENDER");
    console.log("=".repeat(50));
    const genderGroups = await client.getPatientsByCategory("GENDER");

    for (const [key, patients] of Object.entries(genderGroups)) {
      console.log(`${key}: ${patients.length} patients`);
      console.log(`  First 3: ${patients.slice(0, 3).join(", ")}`);
    }

    // Example 2: Get all patients grouped by race
    console.log("\nExample 2: Patients grouped by RACE");
    console.log("=".repeat(50));
    const raceGroups = await client.getPatientsByCategory("RACE");

    for (const [key, patients] of Object.entries(raceGroups)) {
      console.log(`${key}: ${patients.length} patients`);
    }

    // Example 3: Get all patients grouped by ethnicity
    console.log("\nExample 3: Patients grouped by ETHNICITY");
    console.log("=".repeat(50));
    const ethnicityGroups = await client.getPatientsByCategory("ETHNICITY");

    for (const [key, patients] of Object.entries(ethnicityGroups)) {
      console.log(`${key}: ${patients.length} patients`);
    }

    // Example 4: Working with specific groups
    console.log("\nExample 4: Working with specific gender groups");
    console.log("=".repeat(50));

    const malePatients = genderGroups["GENDER.M"] || [];
    const femalePatients = genderGroups["GENDER.F"] || [];
    const unknownGenderPatients = genderGroups["GENDER.U"] || [];

    console.log(`Male patients: ${malePatients.length}`);
    console.log(`Female patients: ${femalePatients.length}`);
    console.log(`Unknown gender: ${unknownGenderPatients.length}`);
    console.log(
      `Total: ${
        malePatients.length +
        femalePatients.length +
        unknownGenderPatients.length
      }`
    );

    // Example 5: Find a specific patient's category
    console.log("\nExample 5: Check if a patient is in a specific group");
    console.log("=".repeat(50));

    const searchPatientId = malePatients[0]; // Get first male patient
    const isMale = malePatients.includes(searchPatientId);
    console.log(`Patient ${searchPatientId} is male: ${isMale}`);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

// Run the example
if (require.main === module) {
  exampleUsage();
}

module.exports = exampleUsage;
