import ExcelJS from "exceljs";
import type { PortRow } from "./types";

type HeaderMap = Map<string, number>;

function normalizeText(value: ExcelJS.CellValue): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim() || null;
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      const text = value.richText.map((part) => part.text).join("").trim();
      return text || null;
    }

    if ("result" in value) {
      return normalizeText(value.result ?? null);
    }
  }

  return String(value).trim() || null;
}

function normalizeNumber(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const parsed = Number(text.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizePortName(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const withoutCode = value.replace(/\s*\{[^}]+\}\s*/g, " ");
  const sanitized = sanitizeWhitespace(withoutCode);
  return sanitized || null;
}

function normalizeLocode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return sanitized || null;
}

function extractLocodeFromPortName(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/\{([^}]+)\}/);
  return normalizeLocode(match?.[1] ?? null);
}

function buildHeaderMap(headerRow: ExcelJS.Row): HeaderMap {
  const headers = new Map<string, number>();

  headerRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const header = normalizeText(cell.value)?.toLowerCase();

    if (!header || headers.has(header)) {
      return;
    }

    headers.set(header, columnNumber);
  });

  return headers;
}

function getCell(row: ExcelJS.Row, headers: HeaderMap, ...headerNames: string[]) {
  for (const headerName of headerNames) {
    const column = headers.get(headerName.toLowerCase());

    if (column) {
      return row.getCell(column).value;
    }
  }

  return null;
}

function coordinateFromParts(
  degreeValue: ExcelJS.CellValue,
  minuteValue: ExcelJS.CellValue,
  directionValue: ExcelJS.CellValue
): number | null {
  const degrees = normalizeNumber(degreeValue);
  const minutes = normalizeNumber(minuteValue);
  const direction = normalizeText(directionValue)?.toUpperCase();

  if (degrees == null || minutes == null || !direction) {
    return null;
  }

  const absolute = Math.abs(degrees) + minutes / 60;

  if (direction === "S" || direction === "W") {
    return -absolute;
  }

  if (direction === "N" || direction === "E") {
    return absolute;
  }

  return null;
}

function getCoordinate(row: ExcelJS.Row, headers: HeaderMap, type: "lat" | "lon"): number | null {
  if (type === "lat") {
    return (
      normalizeNumber(getCell(row, headers, "latitude")) ??
      coordinateFromParts(
        getCell(row, headers, "latdegree"),
        getCell(row, headers, "latminutes"),
        getCell(row, headers, "latdirection")
      )
    );
  }

  return (
    normalizeNumber(getCell(row, headers, "longitude")) ??
    coordinateFromParts(
      getCell(row, headers, "londegree"),
      getCell(row, headers, "lonminutes"),
      getCell(row, headers, "londirection")
    )
  );
}

function toPortRow(row: ExcelJS.Row, headers: HeaderMap): PortRow | null {
  const rawPortName = normalizeText(getCell(row, headers, "portname"));
  const rawUnLocode = normalizeText(getCell(row, headers, "unloccode", "unlocode"));
  const rawPortCode = normalizeText(getCell(row, headers, "portcode"));
  const portName = sanitizePortName(rawPortName) ?? "";
  const locode =
    normalizeLocode(rawUnLocode) ??
    extractLocodeFromPortName(rawPortName) ??
    normalizeLocode(rawPortCode) ??
    "";
  const latitude = getCoordinate(row, headers, "lat") ?? Number.NaN;
  const longitude = getCoordinate(row, headers, "lon") ?? Number.NaN;
  const timezoneOlson = normalizeText(getCell(row, headers, "apptimezone"));

  if (
    !portName &&
    !locode &&
    Number.isNaN(latitude) &&
    Number.isNaN(longitude) &&
    timezoneOlson == null
  ) {
    return null;
  }

  return {
    portName,
    locode,
    latitude,
    longitude,
    timezoneOlson,
    countryIso: null
  };
}

export async function extractPortsFromWorkbook(buffer: Buffer): Promise<PortRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("Workbook does not contain any worksheets.");
  }

  const headerRow = worksheet.getRow(1);
  const headers = buildHeaderMap(headerRow);

  if (!headers.has("portname") || !headers.has("latitude") || !headers.has("longitude")) {
    throw new Error("Worksheet is missing one or more required headers.");
  }

  const rows: PortRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    try {
      const extracted = toPortRow(row, headers);

      if (extracted) {
        rows.push(extracted);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Skipping row ${rowNumber}: ${message}`);
    }
  });

  return rows;
}
