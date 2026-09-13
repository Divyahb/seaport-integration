import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { runEtlWithRealDependencies } from "./lambda/handler";

loadEnv({ path: resolve(__dirname, "..", ".env.local") });

void runEtlWithRealDependencies({
  containerUrl: process.env.AZURE_CONTAINER_URL
}).then((result) => {
  console.log(JSON.stringify(result));
});
