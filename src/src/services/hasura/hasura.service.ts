import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import { lastValueFrom, map } from 'rxjs';
import { QueryGeneratorService } from 'src/helper/queryGenerator.service';

@Injectable()
export class HasuraService {
	public url = this.configService.get<string>('HASURA_BASE_URL');

	constructor(
		private configService: ConfigService,
		private readonly httpService: HttpService,
		private qgService: QueryGeneratorService,
	) {}

	public async postData(query) {
		const data = JSON.stringify(query);

		const url = this.configService.get<string>('HASURA_BASE_URL');

		const config: AxiosRequestConfig = {
			headers: {
				'x-hasura-admin-secret': this.configService.get<string>(
					'HASURA_ADMIN_SECRET',
				),
				'Content-Type': 'application/json',
			},
		};

		try {
			const observable = this.httpService.post(url, data, config);

			const promise = observable.toPromise();

			const response = await promise;

			return response.data;
		} catch (e) {
			console.log('post data error', e.message);
		}
	}

	public async getData(data) {
		try {
			let url = this.configService.get<string>('HASURA_BASE_URL');
			let admin_secret = this.configService.get<string>(
				'HASURA_ADMIN_SECRET',
			);
			return await lastValueFrom(
				this.httpService
					.post(url, data, {
						headers: {
							'x-hasura-admin-secret': admin_secret,
							'Content-Type': 'application/json',
						},
					})
					.pipe(map((res) => res.data)),
			);
		} catch (e) {
			console.log('get data error', e.message);
		}
	}

	public async findAll(tableName: String, filters: Object = {}) {
		let query = '';
		if (filters) {
			Object.keys(filters).forEach((e) => {
				if (filters[e] && filters[e] != '') {
					query += `${e}:{_eq:"${filters[e]}"}`;
				}
			});
		}

		var data = {
			query: `query SearchUser {
            ${tableName}_aggregate(where:{${query}}) {
              aggregate {
                count
              }
            }
            ${tableName}(where:{${query}}) {
              mobile
              aadhar_token
            }}`,
		};

		return await lastValueFrom(
			this.httpService
				.post(this.url, data, {
					headers: {
						'x-hasura-admin-secret':
							process.env.HASURA_ADMIN_SECRET,
						'Content-Type': 'application/json',
					},
				})
				.pipe(map((res) => res.data)),
		);
	}

	public async getAll(
		tableName: String,
		onlyFields: any = [],
		request: any = { filters: {}, page: '0', limit: '0' },
	) {
		const { data, errors } = await lastValueFrom(
			this.httpService
				.post(
					this.url,
					{
						query: this.qgService.query(
							tableName,
							onlyFields,
							request,
						),
					},
					{
						headers: {
							'x-hasura-admin-secret':
								process.env.HASURA_ADMIN_SECRET,
							'Content-Type': 'application/json',
						},
					},
				)
				.pipe(map((res) => res.data)),
		);
		let obj: any = { data: {} };
		if (!errors) {
			const { limit, page } = request;
			let mappedResponse = data?.[`${tableName}`];
			if (limit) {
				const totalCount =
					data?.[`${tableName}_aggregate`]?.aggregate?.count;
				const totalPages = limit ? Math.ceil(totalCount / limit) : 0;
				obj = {
					...obj,
					totalCount: `${totalCount}`,
					limit: `${limit}`,
					currentPage: page ? `${page}` : '1',
					totalPages: `${totalPages}`,
				};
			}
			obj = {
				...obj,
				data: mappedResponse,
			};
		} else {
			obj = { errors };
		}
		return {
			statusCode: 200,
			message: 'Ok.',
			...obj,
		};
	}

	public async getOne(id: number, tableName: String, onlyFields: any = []) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: this.qgService.findOne(
								id,
								tableName,
								onlyFields,
							),
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async create(
		tableName: String,
		item: Object,
		onlyFields: any = [],
		fields: any = [],
	) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: this.qgService.create(
								tableName,
								item,
								onlyFields,
								fields,
							),
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async update(
		id: number,
		tableName: String,
		item: Object,
		onlyFields: any = [],
		fields: any = [],
	) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: this.qgService.update(
								id,
								tableName,
								item,
								onlyFields,
								fields,
							),
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async delete(tableName: String, item: Object, onlyFields: any = [], returnFields: any = null) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: this.qgService.deleteQuery(
								tableName,
								item,
								onlyFields,
								returnFields
							),
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async q(
		tableName: String,
		item: Object,
		onlyFields: any = [],
		update: boolean = false,
		fields: any = [],
	) {
		let query = this.qgService.mutation(
			tableName,
			item,
			onlyFields,
			update,
			fields,
		);

		console.log('GQL: ' + query);

		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: query,
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public async qM(
		tableName: String,
		item: any,
		fields: any,
		onlyFields: any = [],
	) {
		return this.getResponce(
			await lastValueFrom(
				this.httpService
					.post(
						this.url,
						{
							query: this.qgService.queryMulti(
								tableName,
								item,
								fields,
								onlyFields,
							),
						},
						{
							headers: {
								'x-hasura-admin-secret':
									process.env.HASURA_ADMIN_SECRET,
								'Content-Type': 'application/json',
							},
						},
					)
					.pipe(map((res) => res.data)),
			),
			tableName,
		);
	}

	public getResponce = (
		{ data, errors }: any,
		tableName: any,
		response = 'table',
	) => {
		let result = null;
		if (data) {
			if (data[`${tableName}_by_pk`]) {
				result = data[`${tableName}_by_pk`];
			} else if (data[`insert_${tableName}_one`]) {
				result = data[`insert_${tableName}_one`];
			} else if (data[`update_${tableName}`]) {
				result = data[`update_${tableName}`];
				if (result['returning'] && result['returning'][0]) {
					result = result['returning'][0];
				}
			} else if (data[`delete_${tableName}`]) {
				result = data[`delete_${tableName}`];
			} else {
				result = data[tableName];
			}
		}
		result = result ? result : errors ? errors[0] : {};
		if (response === 'data') {
			return result;
		} else {
			return { [tableName]: result };
		}
	};
}
