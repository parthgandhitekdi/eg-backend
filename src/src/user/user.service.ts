import { HttpService } from '@nestjs/axios';
import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Injectable,
} from '@nestjs/common';
import { Response } from 'express';
import jwt_decode from 'jwt-decode';
import { lastValueFrom, map } from 'rxjs';
import { HasuraService } from '../hasura/hasura.service';
import { UserHelperService } from '../helper/userHelper.service';
@Injectable()
export class UserService {
	public url = process.env.HASURA_BASE_URL;
	constructor(
		private readonly httpService: HttpService,
		private helper: UserHelperService,
		private hasuraService: HasuraService,
	) {}
	public async update(userId: string, request: any, tableName: String) {
		try {
			var axios = require('axios');
			const userDataSchema = request;
			let userData = request;
			let query = '';
			Object.keys(userData).forEach((e) => {
				if (
					userData[e] &&
					userData[e] != '' &&
					Object.keys(userDataSchema).includes(e)
				) {
					query += `${e}: "${userData[e]}", `;
				}
			});

			var data = {
				query: `mutation update($id:Int) {
			update_${tableName}(where: {id: {_eq: $id}}, _set: {${query}}) {
				affected_rows
			}
		}`,
				variables: {
					id: userId,
				},
			};
			var config = {
				method: 'post',
				url: this.url,
				headers: {
					'Content-Type': 'application/json',
					'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
				},
				data: data,
			};

			const response = await axios(config);
			const result = response.data.data;
			if (response.data.data) {
				return {
					statusCode: response.status,
					message: `${tableName} details updated !`,
					data: result,
				};
			} else {
				return {
					statusCode: 400,
					message: `Erorr while updating ${tableName} !`,
					data: response.data,
				};
			}
		} catch (error) {
			throw new HttpException(
				{
					status: HttpStatus.FORBIDDEN,
					error: `Erorr while updating ${tableName} !`,
				},
				HttpStatus.FORBIDDEN,
				{
					cause: error,
				},
			);
		}
	}

	public async login(username: string, password: string, response: Response) {
		var axios = require('axios');
		var loginData = {
			username: username,
			password: password,
			grant_type: 'password',
			client_id: 'hasura',
		};
		var configData = {
			method: 'post',
			url: `${process.env.KEYCLOAK_URL}/realms/eg-sso/protocol/openid-connect/token`,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			data: loginData,
		};
		try {
			const res = await axios(configData);
			if (res) {
				//return res.data;
				return response.status(200).send({
					success: true,
					status: 'Authenticated',
					message: 'LOGGEDIN_SUCCESSFULLY',
					data: res.data,
				});
			} else {
				console.log('inside else');
			}
		} catch (err) {
			console.log('login api err', err);
			return response.status(401).send({
				success: false,
				status: 'Unauthorized',
				message: 'INVALID_USERNAME_PASSWORD_MESSAGE',
				data: null,
			});
		}
	}

	public async ipUserInfo(request: any) {
		// Get userid from  auth/login jwt token
		const authToken = request?.headers?.authorization;
		const decoded: any = jwt_decode(authToken);
		let keycloak_id = decoded.sub;

		var axios = require('axios');
		// Set query for getting data info
		var queryData = {
			query: `
		query GetUserDetails($keycloak_id:uuid) {
		  users(where: {keycloak_id: {_eq: $keycloak_id}}) {
			id
		  }
		}
	  `,
			variables: { keycloak_id: keycloak_id },
		};
		// Initialize config
		var configData = {
			method: 'post',
			url: this.url,
			headers: {
				'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
				'Content-Type': 'application/json',
			},
			data: queryData,
		};

		const response = await axios(configData);

		let userData = null;
		if (response?.data?.data?.users[0]) {
			userData = (await this.userById(+response?.data?.data?.users[0].id))
				.data;
		}

		return {
			status: response?.status,
			data: userData,
		};
	}

	public async register(body: any, request: any) {
		const axios = require('axios');
		//const password = `@${this.helper.generateRandomPassword()}`;
		const password = body?.mobile;
		let username = `${body.first_name}`;
		if (body?.last_name) {
			username += `_${body.last_name.charAt(0)}`;
		}
		username += `_${body.mobile}`;
		const data_to_create_user = {
			enabled: 'true',
			firstName: body?.first_name,
			lastName: body?.last_name,
			username: username.toLowerCase(),
			email: body?.email_id,
			credentials: [
				{
					type: 'password',
					value: password,
					temporary: false,
				},
			],
			groups: ['facilitators'],
		};
		const adminResult = await this.helper.getAdminKeycloakToken();

		if (adminResult?.data?.access_token) {
			var config = {
				method: 'post',
				url: `${process.env.KEYCLOAK_URL}/admin/realms/eg-sso/users`,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${adminResult?.data?.access_token}`,
				},
				data: data_to_create_user,
			};

			try {
				const { headers, status } = await axios(config);
				if (headers.location) {
					const split = headers.location.split('/');
					const keycloak_id = split[split.length - 1];
					body.keycloak_id = keycloak_id;
					const result = await this.newCreate(body);

					return {
						status,
						message: 'User created successfully',
						data: {
							user: result?.data,
							keycloak_id: keycloak_id,
							username: username,
							password: password,
						},
					};
				} else {
					throw new BadRequestException(
						'Error while generating admin token !',
					);
				}
			} catch (e) {
				throw new HttpException(e.message, HttpStatus.CONFLICT, {
					cause: e,
				});
			}
		} else {
			throw new BadRequestException('Error while creating user !');
		}
	}

	async newCreate(req: any) {
		const tableName = 'users';
		const newR = await this.hasuraService.q(tableName, req, [
			'first_name',
			'last_name',
			'mobile',
			'email_id',
			'keycloak_id',
		]);
		const user_id = newR[tableName]?.id;
		if (user_id) {
			await this.hasuraService.q(
				`program_faciltators`,
				{ ...req, user_id },
				['parent_ip', 'user_id'],
			);
		}
		return await this.userById(user_id);
	}

	async create(req: any, update = false) {
		let i = 0,
			response = [];
		let objKey = Object.keys(req);
		const userArr = [
			'first_name',
			'last_name',
			'email_id',
			'gender',
			'dob',
			'address',
			'aadhar_token',
			'keycloak_id',
			'profile_url',
			'block',
			'district',
			'state',
			'village',
		];
		let user_id = req?.id ? req?.id : null;
		const keyExist = userArr.filter((e) => objKey.includes(e));
		if (keyExist.length > 0) {
			const tableName = 'users';
			const newR = await this.hasuraService.q(
				tableName,
				req,
				userArr,
				update,
			);
			user_id = newR[tableName]?.id ? newR[tableName]?.id : user_id;
			response[i++] = newR;
		}
		if (user_id) {
			const cFArr = [
				'pan_no',
				'device_type',
				'device_ownership',
				'sourcing_channel',
				'refreere',
				'user_id',
			];
			const cFkeyExist = cFArr.filter((e) => objKey.includes(e));
			if (cFkeyExist.length > 0) {
				response[i++] = await this.hasuraService.q(
					'core_faciltators',
					{
						...req,
						id: req?.core_faciltators?.id
							? req?.core_faciltators?.id
							: null,
						user_id,
					},
					cFArr,
					update,
				);
			}
			const pFArr = [
				'availability',
				'program_id',
				'parent_ip',
				'has_social_work_exp',
				'social_background_verified_by_neighbours',
				'village_knowledge_test',
				'police_verification_done',
				'user_id',
				'form_step_number',
				'status',
			];
			const pFkeyExist = pFArr.filter((e) => objKey.includes(e));
			if (pFkeyExist.length > 0) {
				response[i++] = await this.hasuraService.q(
					'program_faciltators',
					{
						...req,
						id: req?.program_faciltators?.id
							? req?.program_faciltators?.id
							: null,
						status: 'lead',
						user_id: user_id,
					},
					pFArr,
					update,
				);
			}
			const fillKeys = ['qualification', 'degree'];
			const qkeyExist = fillKeys.filter((e) => objKey.includes(e));
			if (qkeyExist.length > 0) {
				await this.hasuraService.delete('qualifications', {
					user_id,
				});
				response[i++] = await Promise.all(
					fillKeys
						.map(async (e) =>
							req[e]
								? await this.hasuraService.q(
										'qualifications',
										{
											qualification_master_id: req[e],
											user_id,
										},
										['qualification_master_id', 'user_id'],
								  )
								: null,
						)
						.filter((e) => e),
				);
			}

			if (req['experience']) {
				await this.hasuraService.delete('experience', {
					user_id,
					type: 'experience',
				});
				await Promise.all(
					req['experience'].map(
						async (e: Object) =>
							this.hasuraService.q(
								'experience',
								{ ...e, type: 'experience', user_id },
								[
									'type',
									'description',
									'user_id',
									'role_title',
									'organization',
									'institution',
									'start_year',
									'end_year',
									'experience_in_years',
								],
							),
						update,
					),
				);
			}
			if (req['vo_experience']) {
				await this.hasuraService.delete('experience', {
					user_id,
					type: 'vo_experience',
				});
				await Promise.all(
					req['vo_experience'].map(
						async (e: Object) =>
							this.hasuraService.q(
								'experience',
								{ ...e, type: 'vo_experience', user_id },
								[
									'type',
									'description',
									'user_id',
									'role_title',
									'organization',
									'institution',
									'start_year',
									'end_year',
									'experience_in_years',
								],
							),
						update,
					),
				);
			}
		}
		return this.userById(user_id);
	}

	// organizationInfo
	async organizationInfo(id: any) {
		const data = {
			query: `query MyQuery {
		organisations_by_pk(id:"${id}") {
		  address
		  contact_person
		  gst_no
		  mobile
		  id
		  name
		}
	  }
	  `,
		};

		const response = await lastValueFrom(
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
		let result = response?.data?.organisations_by_pk;
		const mappedResponse = result;

		return {
			statusCode: 200,
			message: 'Ok.',
			data: mappedResponse,
		};
	}

	async userById(id: any, resp?: any) {
		var data = {
			query: `query searchById {
		users_by_pk(id:${id}) {
		  aadhaar_verification_mode
		  aadhar_no
		  aadhar_token
		  aadhar_verified
		  address
		  address_line_1
		  address_line_2
		  alternative_mobile_number
		  block
		  block_id
		  block_village_id
		  created_at
		  created_by
		  district
		  district_id
		  dob
		  duplicate_reason
		  email_id
		  email_verified
		  first_name
		  gender
		  grampanchayat
		  id
		  is_duplicate
		  keycloak_id
		  last_name
		  lat
		  long
		  middle_name
		  mobile
		  mobile_no_verified
		  pincode
		  profile_url
		  state
		  state_id
		  updated_at
		  updated_by
		  village
		  username
		  aadhaar_front: documents(where: {document_sub_type: {_eq: "aadhaar_front"}}) {
			id
			name
			doument_type
			document_sub_type
			path
		  }
		  aadhaar_back: documents(where: {document_sub_type: {_eq: "aadhaar_back"}}) {
			id
			name
			doument_type
			document_sub_type
			path
		  }
		  profile_photo_1: documents(where: {document_sub_type: {_eq: "profile_photo_1"}}) {
			id
			name
			doument_type
			document_sub_type
			path
		  }
		  profile_photo_2: documents(where: {document_sub_type: {_eq: "profile_photo_2"}}) {
			id
			name
			doument_type
			document_sub_type
			path
		  }
		  profile_photo_3: documents(where: {document_sub_type: {_eq: "profile_photo_3"}}) {
			id
			name
			doument_type
			document_sub_type
			path
		  }
		  program_users {
			id
			organisation_id
			academic_year_id
			program_id
			role_id
			status
			user_id
		  }
		  extended_users{
			id
			user_id
			marital_status
			qualification_id
			designation
			social_category
			created_by
			updated_by
		  }
		  core_faciltator {
			created_by
			device_ownership
			device_type
			id
			pan_no
			refreere
			sourcing_channel
			updated_by
			user_id
		  }
		  experience {
			id
			description
			end_year
			experience_in_years
			institution
			start_year
			organization
			role_title
			user_id
			type
			related_to_teaching
			reference {
			  id
			  name
			  context
			  context_id
			  contact_number
			  document_id
			  type_of_document
			  designation
			  document_reference {
				id
				user_id
				name
				doument_type
				document_sub_type
				provider
				path
			  }
			}
		  }
		  program_faciltators {
			parent_ip
			documents_status
			availability
			has_social_work_exp
			id
			police_verification_done
			program_id
			social_background_verified_by_neighbours
			user_id
			village_knowledge_test
			status
			form_step_number
			created_by
			updated_by
			academic_year_id
			qualification_ids
		  }
		  qualifications {
			created_by
			end_year
			id
			institution
			qualification_master_id
			start_year
			updated_by
			user_id
			qualification_reference_document_id
			qualification_master {
			  context
			  context_id
			  created_by
			  id
			  name
			  type
			  updated_by
			}
			document_reference {
			  id
			  user_id
			  name
			  context
			  context_id
			  doument_type
			  document_sub_type
			  provider
			  path
			}
		  }
		  interviews {
			id
			owner_user_id
			end_date_time
			comment
			created_at
			created_by
			start_date_time
			status
			title
			updated_at
			updated_by
			user_id
			location_type
			location
			owner {
			  first_name
			  last_name
			  id
			}
		  }
		  events {
			context
			context_id
			created_by
			end_date
			end_time
			id
			location
			location_type
			start_date
			start_time
			updated_by
			user_id
		  }
		  documents(order_by: {id: desc}) {
			id
			created_by
			path
			provider
			updated_by
			user_id
			name
			doument_type
			document_sub_type
			context
			context_id
		  }
		  references {
			id
			name
			contact_number
			designation
		  }
		}}`,
		};

		const response = await lastValueFrom(
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
		let result = response?.data?.users_by_pk;

		for (const key of [
			'references',
			'qualifications',
			'program_faciltators',
			'profile_photo_1',
			'profile_photo_2',
			'profile_photo_3',
			'aadhaar_front',
			'aadhaar_back',
		]) {
			if (result?.[key] && result?.[key][0]) {
				result[key] = result[key][0];
			} else {
				result = { ...result, [key]: {} };
			}
		}

		let mappedResponse = result;

		if (result?.experience) {
			mappedResponse = {
				...mappedResponse,
				['experience']: result?.experience.filter(
					(e: any) => e.type == 'experience',
				),
			};

			mappedResponse = {
				...mappedResponse,
				['vo_experience']: result?.experience.filter(
					(e: any) => e.type == 'vo_experience',
				),
			};
		}

		if (mappedResponse.program_faciltators?.qualification_ids) {
			mappedResponse.program_faciltators.qualification_ids =
				mappedResponse.program_faciltators.qualification_ids.replace(
					/\"/g,
					'',
				);
		}

		if (resp) {
			return resp.status(200).send({
				success: true,
				message: 'Data Fetched Successfully',
				data: {
					data: mappedResponse,
				},
			});
		} else {
			return {
				statusCode: 200,
				message: 'Ok.',
				data: mappedResponse,
			};
		}
	}

	async list(request: any, req: any) {
		const { filters } = request;
		const page = request.page ? request.page : '1';
		const limit = request?.limit ? request?.limit : '10';

		let offset = 0;
		if (page > 1 && limit) {
			offset = parseInt(limit) * (page - 1);
		}

		let query = '';
		if (filters) {
			Object.keys(filters).forEach((e) => {
				if (filters[e] && filters[e] != '') {
					query += `${e}:{_eq:"${filters[e]}"}`;
				}
			});
		}
		const user = await this.ipUserInfo(req);
		query += `program_faciltators: {id: {_is_null: false}, parent_ip: {_eq: "${user?.data?.program_users[0]?.organisation_id}"}}`;
		var data = {
			query: `query SearchAttendance($limit:Int, $offset:Int) {
		users_aggregate(where:{${query}}) {
		  aggregate {
			count
		  }
		}
		users(where:{${query}}, limit: $limit, offset: $offset, order_by: {created_at: desc}) {
		  first_name
		  id
		  last_name
		  dob
		  aadhar_token
		  address
		  block_id
		  block_village_id
		  created_by
		  district_id
		  email_id
		  gender
		  lat
		  long
		  mobile
		  state_id
		  updated_by
		  profile_url
		  program_users {
			id
			organisation_id
			academic_year_id
			program_id
			role_id
			status
			user_id
		  }
		  core_faciltator {
			created_by
			device_ownership
			device_type
			id
			pan_no
			refreere
			sourcing_channel
			updated_by
			user_id
		  }
		  experience {
			description
			end_year
			experience_in_years
			institution
			start_year
			organization
			role_title
			user_id
			type
		  }
		  program_faciltators {
			parent_ip
			availability
			has_social_work_exp
			id
			police_verification_done
			program_id
			social_background_verified_by_neighbours
			user_id
			village_knowledge_test
			status
			form_step_number
			created_by
			updated_by
		  }
		  qualifications {
			created_by
			end_year
			id
			institution
			qualification_master_id
			start_year
			updated_by
			user_id
			qualification_master {
			  context
			  context_id
			  created_by
			  id
			  name
			  type
			  updated_by
			}
		  }
		  interviews {
			id
			owner_user_id
			end_date_time
			comment
			created_at
			created_by
			start_date_time
			status
			title
			updated_at
			updated_by
			user_id
			location_type
			location
			owner {
			  first_name
			  last_name
			  id
			}
		  }
		  events {
			context
			context_id
			created_by
			end_date
			end_time
			id
			location
			location_type
			start_date
			start_time
			updated_by
			user_id
		  }
		  documents(order_by: {id: desc}){
			id
			user_id
			name
			doument_type
			document_sub_type
		  }
		}}`,
			variables: {
				limit: parseInt(limit),
				offset: offset,
			},
		};

		const response = await lastValueFrom(
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

		let result = response?.data?.users;

		let mappedResponse = result;
		const count = response?.data?.users_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);

		return {
			statusCode: 200,
			message: 'Ok.',
			totalCount: count,
			data: mappedResponse?.map((e) => ({
				...e,
				['program_faciltators']: e?.['program_faciltators']?.[0],
				['qualifications']: e?.['qualifications']?.[0],
			})),
			limit,
			currentPage: page,
			totalPages: `${totalPages}`,
		};
	}

	async isUserExist(req: any) {
		// Set User table name
		const tableName = 'users';

		// Calling hasura common method find all
		const data_exist = await this.hasuraService.findAll(tableName, req);
		let response = data_exist.data.users;

		// Check wheather user is exist or not based on response
		if (response.length > 0) {
			return {
				status: 422,
				message: 'User exist',
				isUserExist: true,
			};
		} else {
			return {
				status: 200,
				message: 'User not exist',
				isUserExist: false,
			};
		}
	}
}
