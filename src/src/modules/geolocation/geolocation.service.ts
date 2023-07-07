import { Injectable } from "@nestjs/common";
import { HasuraService } from "src/services/hasura/hasura.service";

@Injectable()
export class GeolocationService {
	constructor(private readonly hasuraService: HasuraService) {}

	public async findAll(tableName: string, filters: Object = {}) {
		let query = '';
		if (filters) {
			Object.keys(filters).forEach((e) => {
				if (filters[e] && filters[e] != '') {
					query += `${e}:{_eq:"${filters[e]}"}`;
				}
			});
		}

		let data = {
			query: `
			query SearchAddress {
				${tableName}_aggregate(where:{${query}}) {
					aggregate {
						count
					}
				}

				${tableName}(where:{${query}}) {
					id
					state_name
					state_cd
					district_name
					district_cd
					block_name
					grampanchayat_name
					village_ward_name
					udise_block_code
				}
			}`,
		};

		return await this.hasuraService.postData(data);
	}

	async getStates() {
		let data = {
			query: `
			query MyQuery {
				address_aggregate(distinct_on: [state_name]) {
					aggregate {
						count
					}
				}

				address(distinct_on: [state_name]) {
					state_name
					state_cd
				}
			}`,
		};

		return await this.hasuraService.postData(data);
	}

	async getDistricts(state: string) {
		let data = {
			query: `
			query MyQuery {
				address_aggregate(
					distinct_on: [district_name],
					where: {
						state_name: {_eq: "${state}"}
					}
				) {
					aggregate {
						count
					}
				}

				address(
					distinct_on: [district_name],
					where: {
						state_name: {_eq: "${state}"}
					}
				) {
					district_cd
					district_name
				}
			}`,
		};

		return await this.hasuraService.postData(data);
	}

	async getBlocks(district: string) {
		let data = {
			query: `
			query MyQuery {
				address_aggregate(
					distinct_on: [block_name],
					where: {
						district_name: {_eq: "${district}"}
					}
				) {
					aggregate {
						count
					}
				}

				address(
					distinct_on: [block_name],
					where: {
						district_name: {_eq: "${district}"}
					}
				) {
					block_name
				}
			}`,
		};

		return await this.hasuraService.postData(data);
	}

	async getVillages(block: string) {
		let data = {
			query: `
			query MyQuery {
				address_aggregate(
					distinct_on: [village_ward_name],
					where: {
						block_name: {_eq: "${block}"}
					}
				) {
					aggregate {
						count
					}
				}

				address(
					distinct_on: [village_ward_name],
					where: {
						block_name: {_eq: "${block}"}
					}
				) {
					village_ward_name
				}
			}`,
		};

		return await this.hasuraService.postData(data);
	}
}
