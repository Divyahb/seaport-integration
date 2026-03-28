import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handler } from "./lambda/handler";

const currentDir = dirname(fileURLToPath(import.meta.url));

loadEnv({ path: resolve(currentDir, "..", ".env.local") });

void handler({
  containerUrl: process.env.AZURE_CONTAINER_URL
}).then((result) => {
  console.log(JSON.stringify(result));
});
