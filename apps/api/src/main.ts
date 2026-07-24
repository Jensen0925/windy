import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { parseApiPort, parseCorsOrigins } from "./runtime-config";

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: parseCorsOrigins(process.env.WEB_ORIGIN),
    methods: ["GET"],
  });
  app.setGlobalPrefix("api");

  const port = parseApiPort(process.env.API_PORT);
  await app.listen(port, "0.0.0.0");
  console.info(`Weather API listening on http://localhost:${port}/api`);
}

if (import.meta.main) {
  await bootstrap();
}
