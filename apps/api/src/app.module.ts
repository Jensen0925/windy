import { Module } from "@nestjs/common";
import { CitiesController } from "./cities.controller";
import { ForecastController } from "./forecast.controller";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController, ForecastController, CitiesController],
})
export class AppModule {}
