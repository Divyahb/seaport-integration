import test from "node:test";
import assert from "node:assert/strict";
import { runEtl, type EtlDependencies } from "./run-etl.ts";
import type { PortRow } from "../types.ts";

const samplePort: PortRow = {
  portName: "Chennai Port",
  locode: "INMAA",
  latitude: 13.0827,
  longitude: 80.2707,
  timezoneOlson: "Asia/Kolkata",
  countryIso: "IN"
};

function buildDeps(overrides: Partial<EtlDependencies> = {}): EtlDependencies {
  return {
    getConfig: () => ({ databaseUrl: "postgresql://fake", containerUrl: "https://fake" }),
    listContainerBlobs: async () => [
      { name: "good.xlsx", size: 1, lastModified: null },
      { name: "bad.xlsx", size: 1, lastModified: null }
    ],
    downloadBlobBuffer: async (_containerUrl, blobName) => {
      if (blobName === "bad.xlsx") {
        throw new Error("simulated download failure");
      }

      return Buffer.from("fake workbook");
    },
    extractPortsFromWorkbook: async () => [samplePort],
    validatePorts: (rows) => ({ validRows: rows, errors: [] }),
    loadPorts: async () => ({ inserted: 1, updated: 0 }),
    ...overrides
  };
}

test("isolates a failing blob so other blobs in the batch still get processed", async () => {
  const result = await runEtl({ containerUrl: "https://fake" }, buildDeps());
  const body = JSON.parse(result.body);

  assert.deepEqual(body.processedBlobs, ["good.xlsx"]);
  assert.equal(body.failedBlobs.length, 1);
  assert.equal(body.failedBlobs[0].blobName, "bad.xlsx");
  assert.match(body.failedBlobs[0].error, /simulated download failure/);
  assert.equal(body.inserted, 1);
  assert.equal(body.recordCount, 1);
  assert.equal(body.message, "Ports loaded with errors");
});

test("reports success with no failures or validation errors", async () => {
  const deps = buildDeps({
    listContainerBlobs: async () => [{ name: "good.xlsx", size: 1, lastModified: null }]
  });

  const result = await runEtl({ containerUrl: "https://fake" }, deps);
  const body = JSON.parse(result.body);

  assert.deepEqual(body.processedBlobs, ["good.xlsx"]);
  assert.deepEqual(body.failedBlobs, []);
  assert.deepEqual(body.validationErrors, []);
  assert.equal(body.message, "Ports loaded successfully.");
});

test("ignores non-xlsx blobs in the container", async () => {
  const listContainerBlobs = async () => [
    { name: "readme.txt", size: 1, lastModified: null },
    { name: "good.xlsx", size: 1, lastModified: null }
  ];
  const downloaded: string[] = [];
  const deps = buildDeps({
    listContainerBlobs,
    downloadBlobBuffer: async (_containerUrl, blobName) => {
      downloaded.push(blobName);
      return Buffer.from("fake workbook");
    }
  });

  await runEtl({ containerUrl: "https://fake" }, deps);

  assert.deepEqual(downloaded, ["good.xlsx"]);
});
