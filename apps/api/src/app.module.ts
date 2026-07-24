import { Module } from "@nestjs/common";
import { ForecastController } from "./forecast.controller";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController, ForecastController],
})
export class AppModule {}
