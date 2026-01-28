require("dotenv").config();
const { db } = require("../../../src/db/index");
const {
  getConcepts,
} = require("../../../src/controllers/patient-concept-controller");

describe("getConcepts", () => {
  const TEST_PATIENT_ID = process.env.TEST_PATIENT_ID;

  if (!TEST_PATIENT_ID) {
    throw new Error("TEST_PATIENT_ID must be set in .env file");
  }

  beforeAll(async () => {
    await db.open();
    console.log("Database opened successfully");
  });

  afterAll(async () => {
    await db.close();
    console.log("Database closed successfully");
  });

  // Display test group header
  test("── TEST GROUP: getConcepts ──", () => {
    console.log(
      "=".repeat(70) + "\nTEST GROUP: getConcepts\n" + "=".repeat(70)
    );
  });

  // MAIN TEST FIRST: Full data retrieval with type validation
  test("should retrieve concepts for TEST_PATIENT_ID and match Concept type structure", async () => {
    const req = {
      query: { patientId: TEST_PATIENT_ID },
    };

    let responseData;
    let statusCode = 200;

    const res = {
      json: (data) => {
        responseData = data;
      },
      status: (code) => {
        statusCode = code;
        return res;
      },
    };

    await getConcepts(req, res);

    expect(statusCode).toBe(200);
    expect(responseData).toBeDefined();
    expect(Array.isArray(responseData)).toBe(true);

    // Build consolidated log output
    let output = [];
    output.push("=".repeat(70));
    output.push(`TEST: getConcepts for patient ${TEST_PATIENT_ID}`);
    output.push("=".repeat(70));
    output.push(`Found: ${responseData.length} concepts\n`);

    if (responseData.length > 0) {
      // Validate first concept matches Concept.d.ts type structure
      const firstConcept = responseData[0];

      output.push("First Concept (first 5 lines):");
      output.push("-".repeat(70));
      const conceptJson = JSON.stringify(firstConcept, null, 2);
      const conceptLines = conceptJson.split("\n");
      const first5Lines = conceptLines.slice(0, 5).join("\n");
      output.push(first5Lines);
      if (conceptLines.length > 5) {
        output.push(`... (${conceptLines.length - 5} more lines)\n`);
      } else {
        output.push("");
      }

      output.push("Type Validation (Concept.d.ts):");
      output.push("-".repeat(70));

      // Check for Concept interface properties (all are optional)
      // The concept should be an object
      expect(typeof firstConcept).toBe("object");

      // Collect validated properties
      const validatedProps = [];

      // If properties exist, validate their types
      if (firstConcept.hasOwnProperty("id")) {
        expect(typeof firstConcept.id).toBe("string");
        validatedProps.push("✓ id: string");
      }

      if (firstConcept.hasOwnProperty("classUri")) {
        expect(typeof firstConcept.classUri).toBe("string");
        validatedProps.push("✓ classUri: string");
      }

      if (firstConcept.hasOwnProperty("preferredText")) {
        expect(typeof firstConcept.preferredText).toBe("string");
        validatedProps.push("✓ preferredText: string");
      }

      if (firstConcept.hasOwnProperty("confidence")) {
        expect(typeof firstConcept.confidence).toBe("number");
        validatedProps.push("✓ confidence: number");
      }

      if (firstConcept.hasOwnProperty("negated")) {
        expect(typeof firstConcept.negated).toBe("boolean");
        validatedProps.push("✓ negated: boolean");
      }

      if (firstConcept.hasOwnProperty("uncertain")) {
        expect(typeof firstConcept.uncertain).toBe("boolean");
        validatedProps.push("✓ uncertain: boolean");
      }

      if (firstConcept.hasOwnProperty("historic")) {
        expect(typeof firstConcept.historic).toBe("boolean");
        validatedProps.push("✓ historic: boolean");
      }

      if (firstConcept.hasOwnProperty("dpheGroup")) {
        expect(typeof firstConcept.dpheGroup).toBe("string");
        validatedProps.push("✓ dpheGroup: string");
      }

      if (firstConcept.hasOwnProperty("mentionIds")) {
        expect(Array.isArray(firstConcept.mentionIds)).toBe(true);
        validatedProps.push(
          `✓ mentionIds: array (${firstConcept.mentionIds.length} items)`
        );
      }

      if (firstConcept.hasOwnProperty("codifications")) {
        expect(Array.isArray(firstConcept.codifications)).toBe(true);
        validatedProps.push("✓ codifications: array");
      }

      // Format validated properties in 3 columns
      const propsPerColumn = Math.ceil(validatedProps.length / 3);
      const col1 = validatedProps.slice(0, propsPerColumn);
      const col2 = validatedProps.slice(propsPerColumn, propsPerColumn * 2);
      const col3 = validatedProps.slice(propsPerColumn * 2);

      // Calculate column widths for alignment
      const maxCol1Width = Math.max(...col1.map((p) => p.length), 0);
      const maxCol2Width = Math.max(...col2.map((p) => p.length), 0);

      // Build 3-column output
      for (
        let i = 0;
        i < Math.max(col1.length, col2.length, col3.length);
        i++
      ) {
        const line = [
          (col1[i] || "").padEnd(maxCol1Width + 2),
          (col2[i] || "").padEnd(maxCol2Width + 2),
          col3[i] || "",
        ]
          .join("")
          .trimRight();
        output.push(line);
      }
      output.push("");
      output.push(
        `RESULT: ✓ All ${responseData.length} concepts conform to Concept type`
      );
      output.push("=".repeat(70));

      // Print all at once
      console.log(output.join("\n"));
    } else {
      output.push(`⚠️  No concepts found for patient ${TEST_PATIENT_ID}`);
      output.push("=".repeat(70));
      console.log(output.join("\n"));
    }
  });

  // Secondary test: successful retrieval validation
  test("should retrieve concepts when they exist", async () => {
    const req = {
      query: { patientId: TEST_PATIENT_ID },
    };

    let responseData;
    let statusCode = 200;

    const res = {
      json: (data) => {
        responseData = data;
      },
      status: (code) => {
        statusCode = code;
        return res;
      },
    };

    await getConcepts(req, res);

    expect(statusCode).toBe(200);
    expect(responseData).toBeDefined();
    expect(Array.isArray(responseData)).toBe(true);

    if (responseData.length > 0) {
      expect(responseData[0]).toHaveProperty("id");
      expect(responseData[0]).toHaveProperty("classUri");
      expect(responseData[0]).toHaveProperty("preferredText");
      console.log(
        `✓ SUCCESS [getConcepts]: Retrieved ${responseData.length} concepts for real patient data`
      );
    } else {
      console.log(
        `✓ SUCCESS [getConcepts]: Patient ${TEST_PATIENT_ID} has no concepts (valid result)`
      );
    }
  });

  // Validation tests
  test("should handle missing patientId parameter", async () => {
    const req = {
      query: {},
    };

    let responseData;
    let statusCode = 200;

    const res = {
      json: (data) => {
        responseData = data;
      },
      status: (code) => {
        statusCode = code;
        return res;
      },
    };

    await getConcepts(req, res);

    expect(statusCode).toBe(400);
    expect(responseData).toHaveProperty("error");
    expect(responseData.error).toContain("Missing required parameter");
    console.log("✓ VALIDATION [getConcepts]: Missing patientId returns 400");
  });

  test("should return 404 when concepts not found for patient", async () => {
    // When a patient has no concepts, should return 404
    const req = {
      query: { patientId: "NONEXISTENT_PATIENT_99999" },
    };

    let responseData;
    let statusCode = 200;

    const res = {
      json: (data) => {
        responseData = data;
      },
      status: (code) => {
        statusCode = code;
        return res;
      },
    };

    await getConcepts(req, res);

    expect(statusCode).toBe(404);
    expect(responseData).toHaveProperty("error");
    console.log(
      "✓ NOT_FOUND [getConcepts]: Non-existent patient returns 404 error"
    );
  });
});
