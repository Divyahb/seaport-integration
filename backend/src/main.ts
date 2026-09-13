import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

function getCorsOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN;

  if (!configured) {
    return ["http://localhost:3000"];
  }

  return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Apollo-Require-Preflight"]
  });
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
