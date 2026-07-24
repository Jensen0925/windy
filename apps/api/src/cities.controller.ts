import { LocationQueryError } from "@china-weather/locations";
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import { createCityDetailsResponse, createCitySearchResponse } from "./cities";

@Controller("cities")
export class CitiesController {
  @Get("search")
  search(@Query("q") query?: string, @Query("limit") limit?: string) {
    try {
      return createCitySearchResponse(query, limit);
    } catch (error) {
      if (error instanceof LocationQueryError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    const result = createCityDetailsResponse(id);
    if (!result) {
      throw new NotFoundException(`city location ${id} was not found`);
    }
    return result;
  }
}
