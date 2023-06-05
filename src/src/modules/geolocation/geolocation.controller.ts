import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { GeolocationService } from './geolocation.service';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';

@UseInterceptors(SentryInterceptor)
@Controller('/locationmaster')
export class GeolocationController {
	constructor(private geolocationService: GeolocationService) {}

	// states list API filter pagination
	@Get('/states')
	public async states() {
		const tableName = 'address';
		const response = await this.geolocationService.states();
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

	// districts list API filter pagination
	@Get('/districts/:name')
	public async districts(@Param('name') name: string, state_id: string) {
		const tableName = 'address';
		const response = await this.geolocationService.districts(name);
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

	// blocks list API filter pagination
	@Get('/blocks/:name')
	public async blocks(@Param('name') name: string) {
		const tableName = 'address';
		const response = await this.geolocationService.blocks(name);
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

	// villages list API filter pagination
	@Get('/villages/:name')
	public async villages(@Param('name') name: string) {
		const tableName = 'address';
		const response = await this.geolocationService.villages(name);
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
