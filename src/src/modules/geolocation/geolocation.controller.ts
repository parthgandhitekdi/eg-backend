import { Controller, Get, Param, UseInterceptors } from "@nestjs/common";
import { SentryInterceptor } from "src/common/interceptors/sentry.interceptor";
import { GeolocationService } from "./geolocation.service";

@UseInterceptors(SentryInterceptor)
@Controller('/locationmaster')
export class GeolocationController {
	constructor(private geolocationService: GeolocationService) {}

	// Get states list
	@Get('/states')
	public async getStates() {
		const tableName = 'address';
		const response = await this.geolocationService.getStates();
		let mappedResponse = response?.data[tableName];
		const count =
			response?.data[`${tableName}_aggregate`]?.aggregate?.count;

		return {
			success: 'true',
			data: {
				totalCount: count,
				states: mappedResponse,
			},
		};
	}

	// Get districts list
	@Get('/districts/:name')
	public async getDistricts(@Param('name') name: string, state_id: string) {
		const tableName = 'address';
		const response = await this.geolocationService.getDistricts(name);
		let mappedResponse = response?.data[tableName];
		const count =
			response?.data[`${tableName}_aggregate`]?.aggregate?.count;

		return {
			success: 'true',
			data: {
				totalCount: count,
				districts: mappedResponse,
			},
		};
	}

	// Get blocks list
	@Get('/blocks/:name')
	public async getBlocks(@Param('name') name: string) {
		const tableName = 'address';
		const response = await this.geolocationService.getBlocks(name);
		let mappedResponse = response?.data[tableName];
		const count =
			response?.data[`${tableName}_aggregate`]?.aggregate?.count;

		return {
			success: 'true',
			data: {
				totalCount: count,
				blocks: mappedResponse,
			},
		};
	}

	// Get villages list
	@Get('/villages/:name')
	public async getVillages(@Param('name') name: string) {
		const tableName = 'address';
		const response = await this.geolocationService.getVillages(name);
		let mappedResponse = response?.data[tableName];
		const count =
			response?.data[`${tableName}_aggregate`]?.aggregate?.count;

		return {
			success: 'true',
			data: {
				totalCount: count,
				villages: mappedResponse,
			},
		};
	}
}
