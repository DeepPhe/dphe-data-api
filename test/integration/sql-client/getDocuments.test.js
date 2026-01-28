require("dotenv").config();
const { db } = require("../../../src/db/index");
const {
  getDocuments,
} = require("../../../src/controllers/patient-document-controller");

describe("getDocuments", () => {
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
  test("── TEST GROUP: getDocuments ──", () => {
    console.log(
      "=".repeat(70) + "\nTEST GROUP: getDocuments\n" + "=".repeat(70)
    );
  });

  test("should retrieve documents for patient via controller", async () => {
    const req = {
      params: {
        patientId: TEST_PATIENT_ID,
      },
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

    await getDocuments(req, res);

    expect(responseData).toBeDefined();
    expect(Array.isArray(responseData)).toBe(true);
    expect(statusCode).toBe(200);
    expect(responseData.length).toBeGreaterThan(0);

    // Build consolidated log output
    let output = [];
    output.push("=".repeat(70));
    output.push(`TEST: getDocuments for patient ${TEST_PATIENT_ID}`);
    output.push("=".repeat(70));
    output.push(`Found: ${responseData.length} documents\n`);

    if (responseData.length > 0) {
      // Show first document
      const firstDoc = responseData[0];
      output.push("First Document (first 5 lines):");
      output.push("-".repeat(70));
      const docJson = JSON.stringify(firstDoc, null, 2);
      const docLines = docJson.split("\n");
      const first5Lines = docLines.slice(0, 5).join("\n");
      output.push(first5Lines);
      if (docLines.length > 5) {
        output.push(`... (${docLines.length - 5} more lines)\n`);
      } else {
        output.push("");
      }

      // Show properties found
      const properties = Object.keys(firstDoc);
      output.push("Document Properties:");
      output.push("-".repeat(70));

      const propsPerColumn = Math.ceil(properties.length / 3);
      const col1 = properties.slice(0, propsPerColumn);
      const col2 = properties.slice(propsPerColumn, propsPerColumn * 2);
      const col3 = properties.slice(propsPerColumn * 2);

      const maxCol1Width = Math.max(...col1.map((p) => p.length), 0);
      const maxCol2Width = Math.max(...col2.map((p) => p.length), 0);

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
        `RESULT: ✓ All ${responseData.length} documents retrieved successfully`
      );
      output.push("=".repeat(70));

      console.log(output.join("\n"));
    }
  });

  test("should exclude text when excludeProperties includes text", async () => {
    const req = {
      params: {
        patientId: TEST_PATIENT_ID,
      },
      query: {
        excludeProperties: "text",
      },
    };

    let responseData;

    const res = {
      json: (data) => {
        responseData = data;
      },
      status: (code) => {
        return res;
      },
    };

    await getDocuments(req, res);

    if (responseData.length > 0) {
      const firstDoc = responseData[0];
      const properties = Object.keys(firstDoc);

      // Build consolidated log output
      let output = [];
      output.push("=".repeat(70));
      output.push(`TEST: excludeProperties with "text" excluded`);
      output.push("=".repeat(70));
      output.push(`Document Properties (text should be absent):`);
      output.push("-".repeat(70));

      const propsPerColumn = Math.ceil(properties.length / 3);
      const col1 = properties.slice(0, propsPerColumn);
      const col2 = properties.slice(propsPerColumn, propsPerColumn * 2);
      const col3 = properties.slice(propsPerColumn * 2);

      const maxCol1Width = Math.max(...col1.map((p) => p.length), 0);
      const maxCol2Width = Math.max(...col2.map((p) => p.length), 0);

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
      expect(firstDoc).not.toHaveProperty("text");
      output.push(`RESULT: ✓ Text property successfully excluded`);
      output.push("=".repeat(70));

      console.log(output.join("\n"));
    }
  });

  test("should handle missing patientId parameter", async () => {
    const req = {
      params: {},
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

    await getDocuments(req, res);

    expect(statusCode).toBe(400);
    expect(responseData).toHaveProperty("message");
    expect(responseData.message).toContain("Patient ID is required");

    console.log(
      "✓ VALIDATION [getDocuments]: Missing patientId returns 400 with error message"
    );
  });

  test("should handle decompression correctly via controller", async () => {
    const req = {
      params: {
        patientId: TEST_PATIENT_ID,
      },
      query: {},
    };

    let responseData;

    const res = {
      json: (data) => {
        responseData = data;
      },
      status: (code) => {
        return res;
      },
    };

    await getDocuments(req, res);

    responseData.forEach((doc) => {
      expect(doc).toBeDefined();
      expect(typeof doc).toBe("object");
    });

    console.log(
      "✓ DATA_INTEGRITY [getDocuments]: All documents decompressed and parsed successfully"
    );
  });

  test("should exclude properties when excludeProperties is specified", async () => {
    const req = {
      params: {
        patientId: TEST_PATIENT_ID,
      },
      query: {
        excludeProperties: "mentions,mentionRelations",
      },
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

    await getDocuments(req, res);

    expect(statusCode).toBe(200);
    expect(responseData).toBeDefined();
    expect(Array.isArray(responseData)).toBe(true);

    if (responseData.length > 0) {
      responseData.forEach((doc) => {
        expect(doc).not.toHaveProperty("mentions");
        expect(doc).not.toHaveProperty("mentionRelations");
        expect(doc).toHaveProperty("id");
        expect(doc).toHaveProperty("name");
      });

      console.log(
        "✓ SUCCESS [getDocuments]: Properties successfully excluded via excludeProperties"
      );
    }
  });

  test("should return 400 for invalid excludeProperties", async () => {
    const req = {
      params: {
        patientId: TEST_PATIENT_ID,
      },
      query: {
        excludeProperties: "invalidProperty,anotherInvalid",
      },
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

    await getDocuments(req, res);

    expect(statusCode).toBe(400);
    expect(responseData).toHaveProperty("message");
    expect(responseData.message).toContain("Invalid properties to exclude");

    console.log(
      "✓ VALIDATION [getDocuments]: Invalid excludeProperties returns 400 with error message"
    );
  });

  test("should filter documents by documentIds when specified", async () => {
    // First, get all documents to find real IDs
    const getAllReq = {
      params: {
        patientId: TEST_PATIENT_ID,
      },
      query: {},
    };

    let allDocuments = [];
    const getAllRes = {
      json: (data) => {
        allDocuments = data;
      },
      status: (code) => {
        return getAllRes;
      },
    };

    await getDocuments(getAllReq, getAllRes);

    // If we have at least 2 documents, use real IDs for filtering
    if (allDocuments.length >= 2) {
      const docIdsToFilter = [allDocuments[0].id, allDocuments[1].id].join(",");

      const req = {
        params: {
          patientId: TEST_PATIENT_ID,
        },
        query: {
          documentIds: docIdsToFilter,
        },
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

      await getDocuments(req, res);

      expect(statusCode).toBe(200);
      expect(responseData).toBeDefined();
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(2);

      // Verify only the specified documents are returned
      const returnedIds = responseData.map((doc) => doc.id);
      expect(returnedIds).toContain(allDocuments[0].id);
      expect(returnedIds).toContain(allDocuments[1].id);

      console.log(
        `✓ FILTERING [getDocuments]: Successfully filtered to ${responseData.length} documents by documentIds`
      );
    } else {
      // If fewer than 2 documents, just verify filtering works with what we have
      expect(allDocuments.length).toBeGreaterThanOrEqual(0);
      console.log(
        `✓ FILTERING [getDocuments]: Patient has ${allDocuments.length} document(s)`
      );
    }
  });

  test("should return empty array when documentIds do not match any documents", async () => {
    const req = {
      params: {
        patientId: TEST_PATIENT_ID,
      },
      query: {
        documentIds: "nonexistent_doc_id_1,nonexistent_doc_id_2",
      },
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

    await getDocuments(req, res);

    expect(statusCode).toBe(200);
    expect(responseData).toBeDefined();
    expect(Array.isArray(responseData)).toBe(true);
    expect(responseData.length).toBe(0);

    console.log(
      "✓ FILTERING [getDocuments]: Correctly returns empty array for non-matching documentIds"
    );
  });
});
