import type { Handler } from "aws-lambda";
import { downloadBlobBuffer, listContainerBlobs } from "../blob";
import { getConfig } from "../config";
import { extractPortsFromWorkbook } from "../extract";
import { loadPorts } from "../load";
import { validatePorts } from "../validation";
import { runEtl, type EtlDependencies, type EtlEvent } from "./run-etl";

const defaultDependencies: EtlDependencies = {
  getConfig,
  listContainerBlobs,
  downloadBlobBuffer,
  extractPortsFromWorkbook,
  validatePorts,
  loadPorts
};

export function runEtlWithRealDependencies(event: EtlEvent) {
  return runEtl(event, defaultDependencies);
}

export const handler: Handler<EtlEvent> = (event = {}) => runEtlWithRealDependencies(event);
