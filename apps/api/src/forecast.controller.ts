import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import {
  createForecastCatalog,
  createForecastRuns,
  createPointForecast,
  ForecastQueryError,
} from "./forecast";

@Controller("forecast")
export class ForecastController {
  @Get("catalog")
  getCatalog() {
    return createForecastCatalog();
  }

  @Get("point")
  getPoint(
    @Query("lon") longitude?: string,
    @Query("lat") latitude?: string,
    @Query("time") validTime?: string,
    @Query("model") model?: string,
  ) {
    try {
      return createPointForecast({ longitude, latitude, validTime, model });
    } catch (error) {
      if (error instanceof ForecastQueryError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get("runs")
  getRuns() {
    return createForecastRuns();
  }
}
