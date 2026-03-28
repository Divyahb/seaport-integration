import test from "node:test";
import assert from "node:assert/strict";
import { validatePorts } from "./validation";

test("validatePorts returns valid rows", () => {
  const result = validatePorts([
    {
      portName: "Chennai Port",
      locode: "INMAA",
      latitude: 13.0827,
      longitude: 80.2707,
      timezoneOlson: "Asia/Kolkata",
      countryIso: "IN"
    }
  ]);

  assert.equal(result.errors.length, 0);
  assert.equal(result.validRows.length, 1);
});

test("validatePorts reports invalid rows", () => {
  const result = validatePorts([
    {
      portName: "",
      locode: "",
      latitude: Number.NaN,
      longitude: 80.2707,
      timezoneOlson: null,
      countryIso: "IND"
    }
  ]);

  assert.ok(result.errors.length > 0);
  assert.equal(result.validRows.length, 0);
});
