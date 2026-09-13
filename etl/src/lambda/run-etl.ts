import type { BlobFile } from "../blob";
import type { PortRow } from "../types";

export type EtlEvent = {
  containerUrl?: string;
};

export type EtlConfig = {
  databaseUrl: string;
  containerUrl: string;
};

export type EtlDependencies = {
  getConfig: (event: EtlEvent) => EtlConfig;
  listContainerBlobs: (containerUrl: string) => Promise<BlobFile[]>;
  downloadBlobBuffer: (containerUrl: string, blobName: string) => Promise<Buffer>;
  extractPortsFromWorkbook: (buffer: Buffer) => Promise<PortRow[]>;
  validatePorts: (rows: PortRow[]) => { validRows: PortRow[]; errors: string[] };
  loadPorts: (databaseUrl: string, rows: PortRow[]) => Promise<{ inserted: number; updated: number }>;
};

export async function runEtl(event: EtlEvent, deps: EtlDependencies) {
  const config = deps.getConfig(event);
  const blobs = await deps.listContainerBlobs(config.containerUrl);
  const workbookBlobs = blobs.filter((blob) => /\.xlsx?$/i.test(blob.name));
  let totalValidRows = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  const processedBlobs: string[] = [];
  const failedBlobs: Array<{ blobName: string; error: string }> = [];
  const validationErrors: Array<{ blobName: string; errors: string[] }> = [];

  for (const blob of workbookBlobs) {
    try {
      const workbookBuffer = await deps.downloadBlobBuffer(config.containerUrl, blob.name);
      const extractedRows = await deps.extractPortsFromWorkbook(workbookBuffer);
      const { validRows, errors } = deps.validatePorts(extractedRows);
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

      const summary = await deps.loadPorts(config.databaseUrl, validRows);
      totalValidRows += validRows.length;
      totalInserted += summary.inserted;
      totalUpdated += summary.updated;
      processedBlobs.push(blob.name);
    } catch (error) {
      failedBlobs.push({
        blobName: blob.name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: failedBlobs.length > 0 || validationErrors.length > 0 ? "Ports loaded with errors" : "Ports loaded successfully.",
      recordCount: totalValidRows,
      inserted: totalInserted,
      updated: totalUpdated,
      processedBlobs,
      failedBlobs,
      validationErrors
    })
  };
}
