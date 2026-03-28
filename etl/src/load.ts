import { Pool, type PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import type { PortRow } from "./types";

type PortDiff = {
  toInsert: PortRow[];
  toUpdate: PortRow[];
};

function createComparableHash(row: PortRow) {
  return JSON.stringify({
    portName: row.portName,
    locode: row.locode,
    latitude: row.latitude,
    longitude: row.longitude,
    timezoneOlson: row.timezoneOlson ?? null,
    countryIso: row.countryIso ?? null
  });
}

async function fetchExistingPorts(client: PoolClient) {
  const result = await client.query(
    `select "portName", "locode", "latitude", "longitude", "timezoneOlson", "countryIso"
     from "Port"`
  );

  return result.rows as PortRow[];
}

function diffPorts(existingRows: PortRow[], incomingRows: PortRow[]): PortDiff {
  const existingByLocode = new Map(
    existingRows.map((row) => [row.locode, createComparableHash(row)])
  );
  const toInsert: PortRow[] = [];
  const toUpdate: PortRow[] = [];

  for (const row of incomingRows) {
    const existingHash = existingByLocode.get(row.locode);

    if (!existingHash) {
      toInsert.push(row);
      continue;
    }

    if (existingHash !== createComparableHash(row)) {
      toUpdate.push(row);
    }
  }

  return { toInsert, toUpdate };
}

export async function loadPorts(databaseUrl: string, rows: PortRow[]) {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingRows = await fetchExistingPorts(client);
    const diff = diffPorts(existingRows, rows);

    for (const row of [...diff.toInsert, ...diff.toUpdate]) {
      await client.query(
        `insert into "Port" ("id", "portName", "locode", "latitude", "longitude", "timezoneOlson", "countryIso", "createdAt", "updatedAt")
         values ($1, $2, $3, $4, $5, $6, $7, now(), now())
         on conflict ("locode")
         do update set
           "portName" = excluded."portName",
           "latitude" = excluded."latitude",
           "longitude" = excluded."longitude",
           "timezoneOlson" = excluded."timezoneOlson",
           "countryIso" = excluded."countryIso",
           "updatedAt" = now()`,
        [randomUUID(), row.portName, row.locode, row.latitude, row.longitude, row.timezoneOlson, row.countryIso]
      );
    }

    await client.query("COMMIT");

    return {
      inserted: diff.toInsert.length,
      updated: diff.toUpdate.length
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
