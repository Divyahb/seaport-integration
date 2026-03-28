import type { Handler } from "aws-lambda";
import { downloadBlobBuffer, listContainerBlobs } from "../blob";
import { getConfig } from "../config";
import { extractPortsFromWorkbook } from "../extract";
import { loadPorts } from "../load";
import { validatePorts } from "../validation";

type EtlEvent = {
  containerUrl?: string;
};

export const handler: Handler<EtlEvent> = async (event = {}) => {
  const config = getConfig(event);
  const blobs = await listContainerBlobs(config.containerUrl);
  const workbookBlobs = blobs.filter((blob) => /\.xlsx?$/i.test(blob.name));
  let totalValidRows = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  const processedBlobs: string[] = [];
  const validationErrors: Array<{ blobName: string; errors: string[] }> = [];

  for (const blob of workbookBlobs) {
    const workbookBuffer = await downloadBlobBuffer(config.containerUrl, blob.name);
    const extractedRows = await extractPortsFromWorkbook(workbookBuffer);
    const { validRows, errors } = validatePorts(extractedRows);
    console.log("valid rows:", validRows.length)
    console.log("invalid rows:", errors.length)

    if (errors.length > 0) {
      validationErrors.push({
        blobName: blob.name,
        errors
      });
    }

    if (validRows.length === 0) {
      processedBlobs.push(blob.name);
      continue;
    }

    const summary = await loadPorts(config.databaseUrl, validRows);
    totalValidRows += validRows.length;
    totalInserted += summary.inserted;
    totalUpdated += summary.updated;
    processedBlobs.push(blob.name);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: validationErrors.length > 0 ? "Ports loaded with errors" : "Ports loaded successfully.",
      recordCount: totalValidRows,
      inserted: totalInserted,
      updated: totalUpdated,
      processedBlobs,
      validationErrors
    })
  };
};
