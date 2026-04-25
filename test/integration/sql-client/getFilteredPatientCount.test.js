require("dotenv").config();
const axios = require("axios");
const BASE = process.env.API_BASE_URL || "http://localhost:3000/v1/deepphe-api";
// Give network + bitmap ops plenty of room
jest.setTimeout(30000);
/**
 * Pretty-print a timing table to the console.
 */
function logTiming(label, timing) {
  console.log(
    [
      "",
      "-".repeat(70),
      `  ${label}`,
      "-".repeat(70),
      `  queryMs   : ${timing.queryMs}`,
      `  bitmapMs  : ${timing.bitmapMs}`,
      `  resolveMs : ${timing.resolveMs}`,
      `  totalMs   : ${timing.totalMs}`,
      `  itemCounts: [${timing.itemCounts.join(", ")}]`,
      "-".repeat(70),
    ].join("\n")
  );
}
describe("POST /deepphe/filter/count  (integration)", () => {
  // Discovered from live API in beforeAll
  let omopRaceValues = [];
  let omopGenderValues = [];
  let attrClass = null;
  let attrValues = [];
  let cancerClass = null;
  let cancerValues = [];
  let conceptClass = null;
  let conceptValues = [];
  beforeAll(async () => {
    /* ── OMOP RACE ──────────────────────────────────────────────── */
    try {
      const { data: raceRows } = await axios.get(
        `${BASE}/omop/instances?attribute=RACE`
      );
      omopRaceValues = raceRows.map((r) => r.race).filter(Boolean);
      console.log(`RACE instances: ${omopRaceValues.join(", ")}`);
    } catch (e) {
      console.warn("Could not fetch OMOP RACE instances:", e.message);
    }
    /* ── OMOP GENDER ────────────────────────────────────────────── */
    try {
      const { data: genderRows } = await axios.get(
        `${BASE}/omop/instances?attribute=GENDER`
      );
      omopGenderValues = genderRows.map((r) => r.gender).filter(Boolean);
      console.log(`GENDER instances: ${omopGenderValues.join(", ")}`);
    } catch (e) {
      console.warn("Could not fetch OMOP GENDER instances:", e.message);
    }
    /* ── Attributes ─────────────────────────────────────────────── */
    try {
      const { data: classes } = await axios.get(
        `${BASE}/deepphe/attributes/classes`
      );
      if (classes.length > 0) {
        attrClass = classes[0];
        const { data: rows } = await axios.get(
          `${BASE}/deepphe/attributes/instances?groupname=${encodeURIComponent(attrClass)}`
        );
        attrValues = rows.map((r) => r.value).filter(Boolean);
        console.log(`Attribute "${attrClass}": ${attrValues.slice(0, 5).join(", ")}...`);
      }
    } catch (e) {
      console.warn("Could not fetch attribute data:", e.message);
    }
    /* ── Cancers ────────────────────────────────────────────────── */
    try {
      const { data: classes } = await axios.get(
        `${BASE}/deepphe/cancers/classes`
      );
      if (classes.length > 0) {
        cancerClass = classes[0];
        const { data: rows } = await axios.get(
          `${BASE}/deepphe/cancers/instances?classUri=${encodeURIComponent(cancerClass)}`
        );
        cancerValues = rows.map((r) => r.value).filter(Boolean);
        console.log(`Cancer "${cancerClass}": ${cancerValues.slice(0, 5).join(", ")}...`);
      }
    } catch (e) {
      console.warn("Could not fetch cancer data:", e.message);
    }
    /* ── Concepts ───────────────────────────────────────────────── */
    try {
      const { data: classes } = await axios.get(
        `${BASE}/deepphe/concepts/classes`
      );
      if (classes.length > 0) {
        conceptClass = classes[0];
        const { data: rows } = await axios.get(
          `${BASE}/deepphe/concepts/instances?dpheGroup=${encodeURIComponent(conceptClass)}`
        );
        conceptValues = rows.map((r) => r.value).filter(Boolean);
        console.log(`Concept "${conceptClass}": ${conceptValues.slice(0, 5).join(", ")}...`);
      }
    } catch (e) {
      console.warn("Could not fetch concept data:", e.message);
    }
  });
  /* ────────────────────────────────────────────────────────────── */
  /*  Functional tests                                             */
  /* ────────────────────────────────────────────────────────────── */
  test("single OMOP RACE filter returns count + timing", async () => {
    if (omopRaceValues.length === 0) return;
    const { data } = await axios.post(`${BASE}/deepphe/filter/count`, {
      filters: [
        { type: "omop", class: "RACE", instances: omopRaceValues.slice(0, 2) },
      ],
    });
    logTiming("Single RACE filter (HTTP)", data.timing);
    expect(data.count).toBeGreaterThanOrEqual(0);
    // patient_ids auto-included when count < 20 (default threshold)
    if (data.count < 20) {
      expect(data.patient_ids.length).toBe(data.count);
    } else {
      expect(data.patient_ids).toEqual([]);
    }
    expect(data.timing.totalMs).toBeGreaterThan(0);
  });
  test("single filter with includePatientIds=true", async () => {
    if (omopGenderValues.length === 0) return;
    const { data } = await axios.post(
      `${BASE}/deepphe/filter/count?includePatientIds=true`,
      {
        filters: [
          { type: "omop", class: "GENDER", instances: omopGenderValues.slice(0, 1) },
        ],
      }
    );
    logTiming("Single GENDER filter + patient_ids (HTTP)", data.timing);
    expect(data.patient_ids.length).toBe(data.count);
    expect(data.timing.resolveMs).toBeGreaterThan(0);
  });
  test("5-filter mixed-type AND returns count >= 0", async () => {
    const filters = [];
    if (omopRaceValues.length > 0)
      filters.push({ type: "omop", class: "RACE", instances: omopRaceValues.slice(0, 2) });
    if (omopGenderValues.length > 0)
      filters.push({ type: "omop", class: "GENDER", instances: omopGenderValues.slice(0, 2) });
    if (attrClass && attrValues.length > 0)
      filters.push({ type: "attributes", class: attrClass, instances: attrValues.slice(0, 2) });
    if (cancerClass && cancerValues.length > 0)
      filters.push({ type: "cancers", class: cancerClass, instances: cancerValues.slice(0, 2) });
    if (conceptClass && conceptValues.length > 0)
      filters.push({ type: "concepts", class: conceptClass, instances: conceptValues.slice(0, 2) });
    if (filters.length < 2) {
      console.log("Skipping 5-filter test — not enough data");
      return;
    }
    const { data } = await axios.post(`${BASE}/deepphe/filter/count`, { filters });
    logTiming(`${filters.length}-filter mixed-type (HTTP)`, data.timing);
    expect(data.count).toBeGreaterThanOrEqual(0);
    expect(data.timing.itemCounts.length).toBe(filters.length);
  });
  /* ────────────────────────────────────────────────────────────── */
  /*  Stress test — 50 filters                                     */
  /* ────────────────────────────────────────────────────────────── */
  test("50-filter stress test completes under 2 seconds", async () => {
    const pool = [];
    if (omopRaceValues.length > 0)
      pool.push({ type: "omop", class: "RACE", instances: omopRaceValues.slice(0, 2) });
    if (omopGenderValues.length > 0)
      pool.push({ type: "omop", class: "GENDER", instances: omopGenderValues.slice(0, 2) });
    if (attrClass && attrValues.length > 0)
      pool.push({ type: "attributes", class: attrClass, instances: attrValues.slice(0, 2) });
    if (cancerClass && cancerValues.length > 0)
      pool.push({ type: "cancers", class: cancerClass, instances: cancerValues.slice(0, 2) });
    if (conceptClass && conceptValues.length > 0)
      pool.push({ type: "concepts", class: conceptClass, instances: conceptValues.slice(0, 2) });
    if (pool.length === 0) {
      console.log("Skipping 50-filter stress test — no data");
      return;
    }
    const filters = [];
    for (let i = 0; i < 50; i++) {
      filters.push(pool[i % pool.length]);
    }
    const { data } = await axios.post(`${BASE}/deepphe/filter/count`, { filters });
    logTiming("50-filter stress test (HTTP)", data.timing);
    expect(data.count).toBeGreaterThanOrEqual(0);
    expect(data.timing.totalMs).toBeLessThan(2000);
  });
  /* ────────────────────────────────────────────────────────────── */
  /*  Validation / error tests                                     */
  /* ────────────────────────────────────────────────────────────── */
  test("empty filters array returns 400", async () => {
    try {
      await axios.post(`${BASE}/deepphe/filter/count`, { filters: [] });
      throw new Error("Should have returned 400");
    } catch (e) {
      expect(e.response.status).toBe(400);
    }
  });
  test("missing filters field returns 400", async () => {
    try {
      await axios.post(`${BASE}/deepphe/filter/count`, {});
      throw new Error("Should have returned 400");
    } catch (e) {
      expect(e.response.status).toBe(400);
    }
  });
  test("invalid type in filter returns 400", async () => {
    try {
      await axios.post(`${BASE}/deepphe/filter/count`, {
        filters: [{ type: "bogus", class: "X", instances: ["Y"] }],
      });
      throw new Error("Should have returned an error");
    } catch (e) {
      expect(e.response.status).toBe(400);
    }
  });
  test("filter missing instances returns 400", async () => {
    try {
      await axios.post(`${BASE}/deepphe/filter/count`, {
        filters: [{ type: "omop", class: "RACE" }],
      });
      throw new Error("Should have returned 400");
    } catch (e) {
      expect(e.response.status).toBe(400);
    }
  });
  /* ────────────────────────────────────────────────────────────── */
  /*  Auto-include threshold via query param                       */
  /* ────────────────────────────────────────────────────────────── */
  test("autoIncludeThreshold=0 disables auto-include of patient_ids", async () => {
    if (omopRaceValues.length === 0) return;
    const { data } = await axios.post(
      `${BASE}/deepphe/filter/count?autoIncludeThreshold=0`,
      {
        filters: [
          { type: "omop", class: "RACE", instances: omopRaceValues.slice(0, 2) },
        ],
      }
    );
    logTiming("RACE filter with autoIncludeThreshold=0 (HTTP)", data.timing);
    expect(data.count).toBeGreaterThanOrEqual(0);
    expect(data.patient_ids).toEqual([]);
  });
});
