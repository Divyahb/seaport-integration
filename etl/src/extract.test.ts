import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { extractPortsFromWorkbook } from "./extract";

async function buildWorkbookBuffer(rows: Array<Array<string | number | null | undefined>>) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Ports");

  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

test("extractPortsFromWorkbook maps and sanitizes rows from the sample layout", async () => {
  const buffer = await buildWorkbookBuffer([
    [
      undefined,
      "portId",
      "portName",
      "portCode",
      "country",
      "airportId",
      "unLocCode",
      "latitude",
      "latDegree",
      "latMinutes",
      "latDirection",
      "longitude",
      "lonDegree",
      "lonMinutes",
      "lonDirection",
      "appTimeZone",
      "portTemplt",
      "countryId",
      "unloccode"
    ],
    [
      undefined,
      5444,
      "  Buhl {DEBUL}",
      "DEBUL",
      "Germany",
      -1,
      "DEBUL",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "<div>ignored</div>",
      29
    ],
    [
      undefined,
      1666,
      " Akure{JPKRE}",
      "NGAKR",
      "Nigeria",
      -1,
      "JPKRE",
      34.25,
      34,
      15,
      "N",
      132.55,
      132,
      33,
      "E",
      undefined,
      "<div>ignored</div>",
      140
    ],
    [
      undefined,
      2706,
      " St Catharines",
      "CASCA",
      "Canada",
      8834,
      undefined,
      43.16667,
      43,
      10,
      "N",
      -79.23333,
      79,
      14,
      "W",
      undefined,
      "<div>ignored</div>",
      53
    ],
    [
      undefined,
      830,
      "(Ghent)",
      "USGHE",
      "UNITED STATES",
      -1,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "<div>ignored</div>",
      192
    ]
  ]);

  const result = await extractPortsFromWorkbook(buffer);

  assert.deepEqual(result, [
    {
      portName: "Buhl",
      locode: "DEBUL",
      latitude: Number.NaN,
      longitude: Number.NaN,
      timezoneOlson: null,
      countryIso: null
    },
    {
      portName: "Akure",
      locode: "JPKRE",
      latitude: 34.25,
      longitude: 132.55,
      timezoneOlson: null,
      countryIso: null
    },
    {
      portName: "St Catharines",
      locode: "CASCA",
      latitude: 43.16667,
      longitude: -79.23333,
      timezoneOlson: null,
      countryIso: null
    },
    {
      portName: "(Ghent)",
      locode: "USGHE",
      latitude: Number.NaN,
      longitude: Number.NaN,
      timezoneOlson: null,
      countryIso: null
    }
  ]);
});

test("extractPortsFromWorkbook derives coordinates from degree and direction columns", async () => {
  const buffer = await buildWorkbookBuffer([
    [
      undefined,
      "portId",
      "portName",
      "portCode",
      "country",
      "airportId",
      "unLocCode",
      "latitude",
      "latDegree",
      "latMinutes",
      "latDirection",
      "longitude",
      "lonDegree",
      "lonMinutes",
      "lonDirection",
      "appTimeZone"
    ],
    [
      undefined,
      8719,
      "Aber Soch (Abersoch){GBABS}",
      "GBABS",
      "United Kingdom",
      -1,
      "GBABS",
      undefined,
      52,
      49,
      "N",
      undefined,
      4,
      30,
      "W",
      "Europe/London"
    ]
  ]);

  const [row] = await extractPortsFromWorkbook(buffer);

  assert.equal(row.portName, "Aber Soch (Abersoch)");
  assert.equal(row.locode, "GBABS");
  assert.equal(row.latitude, 52 + 49 / 60);
  assert.equal(row.longitude, -(4 + 30 / 60));
  assert.equal(row.timezoneOlson, "Europe/London");
});
