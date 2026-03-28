import Ajv from "ajv";
import type { PortRow } from "./types";

const schema = {
  type: "object",
  required: ["portName", "locode", "latitude", "longitude"],
  properties: {
    portName: { type: "string", minLength: 1 },
    locode: { type: "string", minLength: 1 },
    latitude: { type: "number" },
    longitude: { type: "number" },
    timezoneOlson: { type: ["string", "null"] },
    countryIso: { type: ["string", "null"], minLength: 2, maxLength: 2 }
  },
  additionalProperties: false
} as const;

const ajv = new Ajv({ allErrors: true });
const validatePort = ajv.compile<PortRow>(schema);

export function validatePorts(rows: PortRow[]) {
  const validRows: PortRow[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    if (validatePort(row)) {
      validRows.push(row);
      return;
    }

    const rowErrors = (validatePort.errors ?? []).map((error) => `row ${index + 1}: ${error.instancePath || "/"} ${error.message}`);
    errors.push(...rowErrors);
  });

  return { validRows, errors };
}
