export type EtlConfig = {
  databaseUrl: string;
  containerUrl: string;
};

export function getConfig(overrides?: Partial<Pick<EtlConfig, "containerUrl">>): EtlConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const containerUrl = overrides?.containerUrl ?? process.env.AZURE_CONTAINER_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  if (!containerUrl) {
    throw new Error("AZURE_CONTAINER_URL is required.");
  }

  return {
    databaseUrl,
    containerUrl
  };
}
