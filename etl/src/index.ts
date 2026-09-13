import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { handler } from "./lambda/handler";

loadEnv({ path: resolve(__dirname, "..", ".env.local") });

type LocalEtlHandler = (event: { containerUrl?: string }) => Promise<unknown>;

void (handler as LocalEtlHandler)({
  containerUrl: process.env.AZURE_CONTAINER_URL
}).then((result) => {
  console.log(JSON.stringify(result));
});
