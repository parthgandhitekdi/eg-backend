import { HttpService } from '@nestjs/axios';
import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createObjectCsvStringifier } from 'csv-writer';
import { S3Service } from 'src/services/s3/s3.service';
import { UserService } from 'src/user/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { UserHelperService } from '../helper/userHelper.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { KeycloakService } from '../services/keycloak/keycloak.service';
@Injectable()
export class BeneficiariesService {
	public url = process.env.HASURA_BASE_URL;

	constructor(
		private readonly s3Service: S3Service,
		private readonly httpService: HttpService,
		private userService: UserService,
		private helper: UserHelperService,
		private hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private keycloakService: KeycloakService,
		private configService: ConfigService,
	) {}

	public returnFields = [
		'status',
		'user_id',
		'enrollment_number',
		'beneficiaries_found_at',
		'documents_status',
		'enrollment_status',
		'enrolled_for_board',
		'type_of_enrollement',
		'academic_year_id',
		'payment_receipt_document_id',
		'facilitator_id',
		'documents_status',
		'program_id',
		'reason_for_status_update',
		'created_by',
		'updated_by',
	];

	async isEnrollmentNumberExists(beneficiaryId: string, body: any) {
		const query = `
				query MyQuery {
					program_beneficiaries_aggregate(where: {enrollment_number: {_eq: ${body.enrollment_number}}, id: {_neq: ${beneficiaryId}}}) {
						aggregate {
							count
						}
					}
				}
			`;

		const data_exist = (
			await this.hasuraServiceFromServices.getData({ query })
		)?.data?.program_beneficiaries_aggregate;

		// Check wheather user is exist or not based on response
		if (data_exist && data_exist.aggregate.count > 0) {
			return {
				success: false,
				message: 'Enrollment number exist!',
				isUserExist: true,
			};
		} else {
			return {
				success: true,
				message: 'Enrollment number not exist',
				isUserExist: false,
			};
		}
	}

	async exportCsv(req: any, body: any, resp: any) {
		try {
			const user = await this.userService.ipUserInfo(req);

			const data = {
				query: `query MyQuery {
					users(where: {
						_and: [
							{ program_beneficiaries: { facilitator_user: { program_faciltators: { parent_ip: { _eq: "${user?.data?.program_users[0]?.organisation_id}" } } } } }
						]
					}){
						first_name
						last_name
						dob
						aadhar_no
						aadhar_verified
						aadhaar_verification_mode
						village
						mobile
						block
						district
						program_beneficiaries{
						status
						enrollment_number
						facilitator_user{
							first_name
							id
							last_name
						}
					  }
					}
				  }
				  `,
			};
			const hasuraResponse = await this.hasuraServiceFromServices.getData(
				data,
			);
			const allBeneficiaries = hasuraResponse?.data?.users;
			const csvStringifier = createObjectCsvStringifier({
				header: [
					{ id: 'name', title: 'Name' },
					{ id: 'district', title: 'District' },
					{ id: 'block', title: 'Block' },
					{ id: 'village', title: 'Village' },
					{ id: 'dob', title: 'DOB' },
					{ id: 'prerak', title: 'Prerak' },
					{ id: 'mobile', title: 'Mobile Number' },
					{ id: 'status', title: 'Status' },
					{ id: 'enrollment_number', title: 'Enrollment Number' },
					{ id: 'aadhar_no', title: 'Aadhaar Number' },
					{ id: 'aadhar_verified', title: 'Aadhaar Number Verified' },
					{ id: 'aadhaar_verification_mode', title: 'Aadhaar Verification Mode' },
				],
			});

			const records = [];
			for (let data of allBeneficiaries) {
				const dataObject = {};
				dataObject['name'] = data?.first_name + ' ' + data?.last_name;
				dataObject['district'] = data?.district;
				dataObject['block'] = data?.block;
				dataObject['village'] = data?.village;
				dataObject['dob'] = data?.dob;
				dataObject['prerak'] =
					data?.program_beneficiaries[0]?.facilitator_user
						?.first_name +
					' ' +
					data?.program_beneficiaries[0]?.facilitator_user?.last_name;
				dataObject['mobile'] = data?.mobile;
				dataObject['status'] = data?.program_beneficiaries[0]?.status;
				dataObject['enrollment_number'] =
					data?.program_beneficiaries[0]?.enrollment_number;
				records.push(dataObject);
				dataObject['aadhar_no']=data?.aadhar_no; 
				dataObject['aadhar_verified']=data?.aadhar_verified ? data?.aadhar_verified:'no';
				dataObject['aadhaar_verification_mode']=data?.aadhaar_verification_mode;
			}
			let fileName = `${
				user?.data?.first_name + '_' + user?.data?.last_name
			}_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
			const fileData =
				csvStringifier.getHeaderString() +
				csvStringifier.stringifyRecords(records);
			resp.header('Content-Type', 'text/csv');
			return resp.attachment(fileName).send(fileData);
		} catch (error) {
			return resp.status(500).json({
				success: false,
				message: 'File Does Not Export!',
				data: {},
			});
		}
	}

	//status count
	public async getStatuswiseCount(req: any, resp: any) {
		const user = await this.userService.ipUserInfo(req);
		const status = [
			'identified',
			'ready_to_enroll',
			'enrolled',
			'duplicated',
			'enrolled_ip_verified',
			'registered_in_camp',
			'rejected',
			'ineligible_for_pragati_camp',
			'dropout',
			'10th_passed',
		];
		let qury = `query MyQuery {
        ${status.map(
			(item) => `${
				!isNaN(Number(item[0])) ? '_' + item : item
			}:program_beneficiaries_aggregate(where: {
            _and: [
              {
                facilitator_id: {_eq: ${user.data.id}}
              },{
              status: {_eq: "${item}"}
            },
				{ user:	{ id: { _is_null: false } } }
			
                                     ]
        }) {
        aggregate {
          count
        }
      }`,
		)}
    }`;
		const data = { query: qury };
		const response = await this.hasuraServiceFromServices.getData(data);
		const newQdata = response?.data;
		const res = status.map((item) => {
			return {
				status: item,
				count: newQdata?.[!isNaN(Number(item[0])) ? '_' + item : item]
					?.aggregate?.count,
			};
		});
		return resp.status(200).json({
			success: true,
			message: 'Data found successfully!',
			data: {
				data: res,
			},
		});
	}

	public async getList(body: any, req: any, resp: any) {
		const user = await this.userService.ipUserInfo(req);
		if (!user?.data?.program_users?.[0]?.organisation_id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Ip',
				data: {},
			});
		}
		const sortType = body?.sortType ? body?.sortType : 'desc';
		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 15 : parseInt(body.limit);
		let offset = page > 1 ? limit * (page - 1) : 0;
		let status = body?.status;
		let filterQueryArray = [];
		filterQueryArray.push(
			`{ program_beneficiaries: { facilitator_user: { program_faciltators: { parent_ip: { _eq: "${user?.data?.program_users[0]?.organisation_id}" } } } } }`,
		);
		if (body?.district && body?.district.length > 0) {
			filterQueryArray.push(
				`{district:{_in: ${JSON.stringify(body?.district)}}}`,
			);
		}

		if (body?.block && body?.block.length > 0) {
			filterQueryArray.push(
				`{block:{_in: ${JSON.stringify(body?.block)}}}`,
			);
		}

		if (body.facilitator && body.facilitator.length > 0) {
			filterQueryArray.push(
				`{program_beneficiaries: {facilitator_id:{_in: ${JSON.stringify(
					body.facilitator,
				)}}}}`,
			);
		}

		if (status && status !== '') {
			if (status === 'identified') {
				filterQueryArray.push(`{
					_or: [
						{ program_beneficiaries: { status: { _eq: "identified" } } },
						{ program_beneficiaries: { status: { _is_null: true } } },
						{ program_beneficiaries: { status: { _eq: "" } } },
					]
				}`);
			} else {
				filterQueryArray.push(
					`{program_beneficiaries:{status:{_eq:${status}}}}`,
				);
			}
		}

		let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';
		var data = {
			query: `query MyQuery($limit:Int, $offset:Int) {
				users_aggregate(where:${filterQuery}) {
				  aggregate {
					count
				  }
				}
				users(where: ${filterQuery},
				limit: $limit,
                      offset: $offset,
                      order_by: {
                        created_at: ${sortType}
                      }
				) {
					id
					first_name
					last_name
					district
					block
					mobile
				    program_beneficiaries {
					id
					facilitator_id
					status
					
				  }
				}
			  }`,
			variables: {
				limit: limit,
				offset: offset,
			},
		};

		const response = await this.hasuraServiceFromServices.getData(data);
		let result = response?.data?.users;
		let mappedResponse = result;
		const count = response?.data?.users_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);
		if (!mappedResponse || mappedResponse.length < 1) {
			return resp.status(200).send({
				success: false,
				status: 'Not Found',
				message: 'Beneficiaries Not Found',
				data: {},
			});
		} else {
			return resp.status(200).json({
				success: true,
				message: 'Benificiaries found success!',
				data: {
					totalCount: count,
					data: mappedResponse?.map((e) => ({
						...e,
						['program_beneficiaries']:
							e?.['program_beneficiaries']?.[0],
					})),
					limit,
					currentPage: page,
					totalPages: `${totalPages}`,
				},
			});
		}
	}
	public async findAll(body: any, req: any, resp: any) {
		const user = await this.userService.ipUserInfo(req);
		if (!user?.data?.id) {
			return resp.status(404).send({
				success: false,
				message: 'Invalid Facilitator',
				data: {},
			});
		}
		const status = body?.status;
		const sortType = body?.sortType ? body?.sortType : 'desc';
		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 15 : parseInt(body.limit);

		let offset = page > 1 ? limit * (page - 1) : 0;

		let query = '';
		if (status && status !== '') {
			if (status === 'identified') {
				query = `{
					_or: [
						{ program_beneficiaries: { status: { _eq: "identified" } } },
						{ program_beneficiaries: { status: { _is_null: true } } },
						{ program_beneficiaries: { status: { _eq: "" } } },
					]
				}`;
			} else {
				query = `{program_beneficiaries:{status:{_eq:${status}}}}`;
			}
		}
		let search = '';

		if (body.search && body.search !== '') {
			search = `{_or: [
        { first_name: { _ilike: "%${body.search}%" } },
        { last_name: { _ilike: "%${body.search}%" } }
      ]} `;
		}

		var data = {
			query: `query MyQuery($limit:Int, $offset:Int) {
                    users_aggregate( where:
                        {
                          _and: [
                              {
                                program_beneficiaries: {facilitator_id: {_eq: ${user.data.id}}}
                              },
                             ${query},
                             ${search}

                          ]
                        }){
                          aggregate{
                            count
                          }
                            }
                    users(
                      where:
                      {
                        _and: [
                            {
                              program_beneficiaries: {facilitator_id: {_eq: ${user.data.id}}}
                            },
                            ${query},
                            ${search}

                        ]
                      },
                      limit: $limit,
                      offset: $offset,
                      order_by: {
                        created_at: ${sortType}
                      }
                    ) {
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
						password
						pincode
						profile_photo_1: documents (where: { document_sub_type: {_eq: "profile_photo_1"}}) {
							id
							name
							doument_type
							document_sub_type
							path
						}
						profile_photo_2: documents (where: { document_sub_type: {_eq: "profile_photo_2"}}) {
							id
							name
							doument_type
							document_sub_type
							path
						}
						profile_photo_3: documents (where: { document_sub_type: {_eq: "profile_photo_3"}}) {
							id
							name
							doument_type
							document_sub_type
							path
						}
						profile_url
						state
						state_id
						updated_at
						updated_by
						village
						username
						documents{
						context
						context_id
						created_by
						document_sub_type
						doument_type
						id
						name
						path
						provider
						updated_by
						user_id
						  }
                        program_beneficiaries{
                        id
                        enrollment_status
                        enrolled_for_board
                        type_of_enrollement
                        subjects
                        academic_year_id
                        payment_receipt_document_id
                        program_id
                        enrollment_number
                        status
                        reason_for_status_update
                        documents_status
                        document_checklist
                        updated_by
                        user_id
                        facilitator_id
                        created_by
                        beneficiaries_found_at
						enrollment_date
						enrollment_first_name
						enrollment_middle_name
						enrollment_last_name
						enrollment_dob
						enrollment_aadhaar_no
						is_eligible
						document {
							context
							context_id
							created_by
							document_sub_type
							doument_type
							id
							name
							path
							provider
							updated_by
							user_id
						  }
                          }
                          core_beneficiaries {
                        career_aspiration
                        updated_by
                        mark_as_whatsapp_number
                        alternative_device_ownership
                        alternative_device_type
                        father_first_name
                        father_middle_name
                        father_last_name
                        mother_first_name
                        mother_last_name
                        mother_middle_name
                        career_aspiration_details
                        enrollment_number
                        type_of_learner
                        status
                        reason_of_leaving_education
                        previous_school_type
                        mobile_ownership
                        learner_wish_to_pursue_education
                        last_standard_of_education_year
                        last_standard_of_education
                        last_school_type
                        id
                        connect_via_refrence
                        created_by
                        device_ownership
                        device_type
                        document_id
                        enrolled_for_board
                        enrollement_status
                      }
                      extended_users {
                        marital_status
                        designation
                        created_by
                        id
                        user_id
                        updated_by
                        social_category
                        qualification_id
                      }

                    }


                  }`,
			variables: {
				limit: limit,
				offset: offset,
			},
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		let result = response?.data?.users;

		let mappedResponse = result;
		const count = response?.data?.users_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);

		if (!mappedResponse || mappedResponse.length < 1) {
			return resp.status(200).send({
				success: false,
				status: 'Not Found',
				message: 'Beneficiaries Not Found',
				data: {},
			});
		} else {
			return resp.status(200).json({
				success: true,
				message: 'Benificiaries found success!',
				data: {
					totalCount: count,
					data: mappedResponse?.map((e) => ({
						...e,
						['program_faciltators']:
							e?.['program_faciltators']?.[0],
						['program_beneficiaries']:
							e?.['program_beneficiaries']?.[0],
						['profile_photo_1']: e?.['profile_photo_1']?.[0] || {},
						['profile_photo_2']: e?.['profile_photo_2']?.[0] || {},
						['profile_photo_3']: e?.['profile_photo_3']?.[0] || {},
					})),
					limit,
					currentPage: page,
					totalPages: `${totalPages}`,
				},
			});
		}
	}

	public async findOne(id: number, resp: any) {
		console.log('id', id);
		var data = {
			query: `query searchById {
            users_by_pk(id: ${id}) {
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
				password
				pincode
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
				profile_url
				state
				state_id
				updated_at
				updated_by
				village
				username
				documents{
				context
				context_id
				created_by
				document_sub_type
				doument_type
				id
				name
				path
				provider
				updated_by
				user_id
				  }
                program_beneficiaries {
                id
                enrollment_status
                enrolled_for_board
                subjects
                academic_year_id
                payment_receipt_document_id
                program_id
                enrollment_number
                status
				type_of_enrollement
                reason_for_status_update
                documents_status
                document_checklist
                updated_by
                user_id
                facilitator_id
                created_by
                beneficiaries_found_at
				enrollment_date
				enrollment_first_name
				enrollment_middle_name
				enrollment_last_name
				enrollment_dob
				enrollment_aadhaar_no
				is_eligible
				document {
					context
					context_id
					created_by
					document_sub_type
					doument_type
					id
					name
					path
					provider
					updated_by
					user_id
				  }
                type_of_support_needed
                learning_motivation
                learning_level
              }
              core_beneficiaries {
                career_aspiration
                updated_by
                mark_as_whatsapp_number
                alternative_device_ownership
                alternative_device_type
                father_first_name
				type_of_enrollement
                father_middle_name
                father_last_name
                mother_first_name
                mother_last_name
                mother_middle_name
                career_aspiration_details
                enrollment_number
                type_of_learner
                status
                reason_of_leaving_education
                previous_school_type
                mobile_ownership
                learner_wish_to_pursue_education
                last_standard_of_education_year
                last_standard_of_education
                last_school_type
                id
                connect_via_refrence
                created_by
                device_ownership
                device_type
                document_id
                enrolled_for_board
                enrollement_status
              }
              references {
                id
                name
                first_name
                last_name
                middle_name
                relation
                contact_number
                designation
                document_id
                type_of_document
                context
                context_id
              }
              extended_users {
                marital_status
                designation
                created_by
                id
                user_id
                updated_by
                social_category
                qualification_id
              }
            }
          }
          `,
		};

		const response = await this.hasuraServiceFromServices.getData(data);
		let result: any = response?.data?.users_by_pk;
		if (!result) {
			return resp.status(404).send({
				success: false,
				status: 'Not Found',
				message: 'Benificiaries Not Found',
				data: {},
			});
		} else {
			result.program_beneficiaries =
				result?.program_beneficiaries?.[0] ?? {};
			//response mapping convert array to object
			for (const key of [
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
			return resp.status(200).json({
				success: true,
				message: 'Benificiaries found successfully!',
				data: { result: result },
			});
		}
	}

	update(id: number, req: any) {
		// return this.hasuraService.update(+id, this.table, req, this.returnFields);
	}

	remove(id: number) {
		// return this.hasuraService.delete(this.table, { id: +id });
	}

	public async statusUpdate(body: any, request: any) {
		const { data: updatedUser } = await this.userById(body?.user_id);
		if (
			body.status !== 'dropout' &&
			body.status !== 'rejected' &&
			body.status !== 'enrolled' &&
			updatedUser?.program_beneficiaries?.status == 'duplicated'
		) {
			return {
				status: 400,
				success: false,
				message: `You cant update status to ${body.status} `,
				data: {},
			};
		}
		const res = await this.hasuraService.update(
			updatedUser?.program_beneficiaries?.id,
			'program_beneficiaries',
			{
				...body,
				reason_for_status_update: body.reason_for_status_update?.trim()
					? body.reason_for_status_update?.trim()
					: body.status,
			},
			this.returnFields,
			[...this.returnFields, 'id'],
		);

		const newdata = (
			await this.userById(res?.program_beneficiaries?.user_id)
		).data;
		const audit = await this.userService.addAuditLog(
			body?.user_id,
			request.mw_userid,
			'program_beneficiaries.status',
			updatedUser?.program_beneficiaries?.id,
			{
				status: updatedUser?.program_beneficiaries?.status,
				reason_for_status_update:
					updatedUser?.program_beneficiaries
						?.reason_for_status_update,
			},
			{
				status: newdata?.program_beneficiaries?.status,
				reason_for_status_update:
					newdata?.program_beneficiaries?.reason_for_status_update,
			},
			['status', 'reason_for_status_update'],
		);
		return {
			status: 200,
			success: true,
			message: 'Status Updated successfully!',
			data: (await this.userById(res?.program_beneficiaries?.user_id))
				.data,
		};
	}

	public async registerBeneficiary(body, request) {
		const user = await this.userService.ipUserInfo(request);
		const password = body.mobile;
		let username = body.first_name;
		username += `_${body.mobile}`;

		const data_to_create_user = {
			enabled: 'true',
			firstName: body.first_name,
			username: username.toLowerCase(),
			credentials: [
				{
					type: 'password',
					value: password,
					temporary: false,
				},
			],
			groups: ['beneficiaries'],
		};

		try {
			const { headers, status } = await this.keycloakService.createUser(
				data_to_create_user,
			);

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
	}

	async create(req: any, request, response, update = false) {
		const user = await this.userService.ipUserInfo(request);
		const { data: beneficiaryUser } = await this.userById(req.id);
		if (!beneficiaryUser) {
			return response.status(400).json({
				success: false,
				message: 'Invalid user_id!',
			});
		}
		const user_id = req?.id;
		const PAGE_WISE_UPDATE_TABLE_DETAILS = {
			edit_basic: {
				users: ['first_name', 'last_name', 'middle_name', 'dob'],
			},
			add_ag_duplication: {
				users: ['aadhar_no', 'is_duplicate', 'duplicate_reason'],
			},
			add_aadhaar_verification: {
				users: ['aadhar_verified'],
			},
			add_contact: {
				core_beneficiaries: [
					'user_id',
					'device_ownership',
					'device_type',
				],
			},
			edit_contact: {
				users: ['mobile', 'alternative_mobile_number', 'email_id'],
				core_beneficiaries: [
					'user_id',
					'mark_as_whatsapp_number',
					'device_ownership',
					'device_type',
					'alternative_device_ownership',
					'alternative_device_type',
				],
			},
			add_address: {
				users: [
					'lat',
					'long',
					'address',
					'address_line_1',
					'address_line_2',
					'state',
					'district',
					'block',
					'village',
					'grampanchayat',
				],
			},
			edit_address: {
				users: [
					'state',
					'district',
					'block',
					'village',
					'grampanchayat',
					'address',
				],
			},
			personal: {
				extended_users: [
					'user_id',
					'social_category',
					'marital_status',
				],
			},
			edit_family: {
				core_beneficiaries: [
					'user_id',
					'father_first_name',
					'father_middle_name',
					'father_last_name',
					'mother_first_name',
					'mother_middle_name',
					'mother_last_name',
				],
			},
			add_education: {
				core_beneficiaries: [
					'user_id',
					'type_of_learner',
					'last_standard_of_education',
					'last_standard_of_education_year',
					'previous_school_type',
					'reason_of_leaving_education',
				],
				program_beneficiaries: ['learning_level'],
			},
			edit_education: {
				core_beneficiaries: [
					'user_id',
					'type_of_learner',
					'last_standard_of_education',
					'last_standard_of_education_year',
					'previous_school_type',
					'reason_of_leaving_education',
				],
				program_beneficiaries: ['learning_level'],
			},
			add_other_details: {
				program_beneficiaries: [
					'learning_motivation',
					'type_of_support_needed',
				],
			},
			edit_other_details: {
				program_beneficiaries: [
					'learning_motivation',
					'type_of_support_needed',
				],
			},
			edit_further_studies: {
				core_beneficiaries: [
					'user_id',
					'career_aspiration',
					'career_aspiration_details',
				],
				program_beneficiaries: [
					'learning_motivation',
					'type_of_support_needed',
				],
			},
			edit_enrollement: {
				program_beneficiaries: [
					'enrollment_number',
					'enrollment_status',
					'enrolled_for_board',
					'type_of_enrollement',
					'subjects',
					'program_id',
					'facilitator_id',
					'academic_year_id',
					'payment_receipt_document_id',
					'enrollment_date',
					'enrollment_first_name',
					'enrollment_middle_name',
					'enrollment_last_name',
					'enrollment_dob',
					'enrollment_aadhaar_no',
					'is_eligible',
				],
			},
			edit_enrollement_details: {
				program_beneficiaries: [
					'enrollment_first_name',
					'enrollment_middle_name',
					'enrollment_last_name',
					'enrollment_dob',
					'enrollment_aadhaar_no',
					'is_eligible',
				],
			},
			//update document status
			document_status: {
				program_beneficiaries: [
					'user_id',
					'program_id',
					'academic_year_id',
					'documents_status',
				],
			},
			edit_reference: {
				references: [
					'first_name',
					'middle_name',
					'last_name',
					'relation',
					'contact_number',
					'context',
					'context_id',
				],
			},
		};

		switch (req.edit_page_type) {
			case 'edit_basic': {
				// Update Users table data
				const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.edit_basic.users;
				const tableName = 'users';
				const newReq = { ...req, ...(req?.dob == '' && { dob: null }) };
				await this.hasuraService.q(tableName, newReq, userArr, update);
				break;
			}

			case 'add_ag_duplication': {
				const aadhaar_no = req.aadhar_no;

				if (!aadhaar_no) {
					return response.status(400).json({
						success: false,
						message: 'Invalid Aadhaar number!',
					});
				}

				// Check if aadhaar already exists or not
				let hasuraResponse =
					await this.hasuraServiceFromServices.findAll('users', {
						aadhar_no: aadhaar_no,
					});

				if (
					hasuraResponse?.data?.users_aggregate?.aggregate.count >
						0 &&
					req.is_duplicate !== 'yes'
				) {
					return response.status(400).json({
						success: false,
						message: 'Duplicate AG detected!',
					});
				}

				if (
					hasuraResponse?.data?.users_aggregate?.aggregate.count <=
						0 &&
					req.is_duplicate === 'yes'
				) {
					return response.status(400).json({
						success: false,
						message: 'Invalid duplicate flag!',
					});
				}

				// Update Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_ag_duplication.users;
				const tableName = 'users';
				await this.hasuraService.q(tableName, req, userArr, update);

				if (req.is_duplicate === 'yes') {
					// Mark other AGs as duplicate where duplicate reason is null
					let updateQuery = `
						mutation MyMutation {
							update_users(
								where: {
									_and: [
										{ id: { _neq: ${beneficiaryUser.id} } },
										{ aadhar_no: { _eq: "${aadhaar_no}" } },
										{
											_or: [
												{ is_duplicate: { _neq: "yes" } },
												{ is_duplicate: { _is_null: true } }
												{ duplicate_reason: { _is_null: true } }
											]
										}
									]
								},
								_set: {
									is_duplicate: "yes",
									duplicate_reason: "SYSTEM_DETECTED_DUPLICATES"
								}
							) {
								affected_rows
								returning {
								id
								aadhar_no
								is_duplicate
								duplicate_reason
								}
							}
						}
					`;

					const data = {
						query: updateQuery,
					};

					await this.hasuraServiceFromServices.getData(data);
					const data1 = {
						query: `mutation MyMutation {
							update_program_beneficiaries(where:{_and:[{user:{aadhar_no:{_eq:"${aadhaar_no}"}}},{user:{id:{_neq:${user_id}}}}]} ,_set:{status:"duplicated",reason_for_status_update:"SYSTEM_DETECTED_DUPLICATES"}){
							  returning{
								status
								reason_for_status_update
							  }
							}
							update_new_ag_status: update_program_beneficiaries(where: {user_id: {_eq:${user_id}}},_set:{status:"duplicated",reason_for_status_update:"duplicated"}){
							  returning{
								status
								reason_for_status_update
							  }
							}
						  }
						  `,
					};
					const result = await this.hasuraServiceFromServices.getData(
						data1,
					);
				}
				break;
			}

			case 'add_aadhaar_verification': {
				// Update Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_aadhaar_verification
						.users;
				const tableName = 'users';
				await this.hasuraService.q(tableName, req, userArr, update);
				break;
			}

			case 'add_contact': {
				// Update Core Beneficiaries table data
				const coreBeneficiaryArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_contact
						.core_beneficiaries;
				const tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id: user_id,
					},
					coreBeneficiaryArr,
					update,
				);

				break;
			}

			case 'edit_contact': {
				// Update Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_contact.users;
				let tableName = 'users';
				await this.hasuraService.q(tableName, req, userArr, update);

				// Update Core Beneficiaries table data
				const coreBeneficiaryArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_contact
						.core_beneficiaries;
				tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id: user_id,
					},
					coreBeneficiaryArr,
					update,
				);

				break;
			}

			case 'add_address': {
				// Update Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_address.users;
				let tableName = 'users';
				await this.hasuraService.q(tableName, req, userArr, update);
				break;
			}

			case 'edit_address': {
				// Update Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_address.users;
				let tableName = 'users';
				await this.hasuraService.q(tableName, req, userArr, update);
				break;
			}

			case 'personal': {
				// Update Extended Users table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.personal.extended_users;
				let tableName = 'extended_users';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.extended_users?.id
							? beneficiaryUser?.extended_users?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);
				break;
			}

			case 'edit_family': {
				// Update Core beneficiaries table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_family
						.core_beneficiaries;
				let tableName = 'core_beneficiaries';
				console.log(beneficiaryUser?.core_beneficiaries?.id);
				await this.hasuraService.q(
					tableName,
					{
						...req.father_details,
						...req.mother_details,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);
				break;
			}

			case 'add_education': {
				// Update Core beneficiaries table data
				let userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_education
						.core_beneficiaries;
				let tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);

				// Update educational data in program_beneficiaries table
				userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_education
						.program_beneficiaries;
				const programDetails = beneficiaryUser?.program_beneficiaries;
				tableName = 'program_beneficiaries';

				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr,
					update,
				);
				break;
			}

			case 'edit_education': {
				// Update Core beneficiaries table data
				let userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_education
						.core_beneficiaries;
				let tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);

				// Update educational data in program_beneficiaries table
				userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_education
						.program_beneficiaries;
				const programDetails = beneficiaryUser.program_beneficiaries;
				tableName = 'program_beneficiaries';

				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr,
					update,
				);

				break;
			}

			case 'add_other_details': {
				// Update other details in program_beneficiaries table
				let userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_other_details
						.program_beneficiaries;
				const programDetails = beneficiaryUser.program_beneficiaries;
				let tableName = 'program_beneficiaries';

				req.learning_motivation = req.learning_motivation.length
					? JSON.stringify(req.learning_motivation).replace(
							/"/g,
							'\\"',
					  )
					: null;
				req.type_of_support_needed = req.type_of_support_needed.length
					? JSON.stringify(req.type_of_support_needed).replace(
							/"/g,
							'\\"',
					  )
					: null;

				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr,
					update,
				);
				break;
			}

			case 'edit_other_details': {
				// Update other details in program_beneficiaries table
				let userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_other_details
						.program_beneficiaries;
				const programDetails = beneficiaryUser.program_beneficiaries;
				let tableName = 'program_beneficiaries';

				req.learning_motivation = req.learning_motivation.length
					? JSON.stringify(req.learning_motivation).replace(
							/"/g,
							'\\"',
					  )
					: null;
				req.type_of_support_needed = req.type_of_support_needed.length
					? JSON.stringify(req.type_of_support_needed).replace(
							/"/g,
							'\\"',
					  )
					: null;

				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr,
					update,
				);
				break;
			}

			case 'edit_further_studies': {
				// Update Core beneficiaries table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_further_studies
						.core_beneficiaries;
				const userArr2 =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_further_studies
						.program_beneficiaries;
				const convertToJsonStr = (arr) =>
					arr.length
						? JSON.stringify(arr).replace(/"/g, '\\"')
						: null;
				req.career_aspiration = req?.career_aspiration;
				let tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						career_aspiration: req?.career_aspiration,
						career_aspiration_details:
							req?.career_aspiration_details,
						id: beneficiaryUser?.core_beneficiaries?.id
							? beneficiaryUser?.core_beneficiaries?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);
				const programDetails = beneficiaryUser.program_beneficiaries;
				//update further_studies in program_beneficiaries table
				req.aspiration_mapping.learning_motivation = convertToJsonStr(
					req.aspiration_mapping.learning_motivation,
				);
				req.aspiration_mapping.type_of_support_needed =
					convertToJsonStr(
						req.aspiration_mapping.type_of_support_needed,
					);

				await this.hasuraService.q(
					'program_beneficiaries',
					{
						learning_motivation:
							req?.aspiration_mapping.learning_motivation,
						type_of_support_needed:
							req?.aspiration_mapping.type_of_support_needed,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr2,
					update,
				);

				break;
			}
			case 'edit_enrollement': {
				// Check enrollment_number duplication
				if (req.enrollment_number) {
					const enrollmentExists =
						await this.isEnrollmentNumberExists(
							req.id,
							req,
						);
					if (enrollmentExists.isUserExist) {
						return response.status(422).json(enrollmentExists);
					}
				}

				// Update enrollement data in Beneficiaries table
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_enrollement
						.program_beneficiaries;
				// const programDetails = beneficiaryUser.program_beneficiaries.find(
				//   (data) =>
				//     req.id == data.user_id &&
				//     req.academic_year_id == 1,
				// );
				const programDetails = beneficiaryUser.program_beneficiaries;
				let tableName = 'program_beneficiaries';
				let myRequest = {};
				if (req.enrollment_status == 'enrolled') {
					let messageArray = [];
					let tempArray = [
						'enrollment_number',
						'enrollment_status',
						'enrolled_for_board',
						'subjects',
						'enrollment_date',
						'payment_receipt_document_id',
					];
					for (let info of tempArray) {
						if (req[info] === undefined || req[info] === '') {
							messageArray.push(`please send ${info} `);
						}
					}
					if (messageArray.length > 0) {
						return response.status(400).send({
							success: false,
							message: messageArray,
							data: {},
						});
					} else {
						myRequest = {
							...req,
							subjects:
								typeof req.subjects == 'object'
									? JSON.stringify(req.subjects).replace(
											/"/g,
											'\\"',
									  )
									: null,
						};
					}
				}
				if (req.enrollment_status == 'not_enrolled') {
					myRequest['enrollment_status'] = req?.enrollment_status;
					myRequest['enrollment_number'] = null;
					myRequest['enrolled_for_board'] = null;
					myRequest['subjects'] = null;
					myRequest['payment_receipt_document_id'] = null;
					myRequest['enrollment_date'] = null;
					myRequest['enrollment_first_name'] = null;
					myRequest['enrollment_middle_name'] = null;
					myRequest['enrollment_last_name'] = null;
					myRequest['enrollment_dob'] = null;
					myRequest['enrollment_aadhaar_no'] = null;
					myRequest['is_eligible'] = null;
					const data = {
						query: `query searchById {
							users_by_pk(id: ${req.id}) {
								id
								program_beneficiaries{
									payment_receipt_document_id
									document {
										id
										name
								  }
							  }
							}
				    }`,
					};
					const response =
						await this.hasuraServiceFromServices.getData(data);
					const documentDetails =
						response?.data?.users_by_pk?.program_beneficiaries[0]
							?.document;
					if (documentDetails?.id) {
						//delete document from documnet table
						await this.hasuraService.delete('documents', {
							id: documentDetails?.id,
						});
					}
					if (documentDetails?.name) {
						//delete document from s3 bucket
						await this.s3Service.deletePhoto(documentDetails?.name);
					}
					const allDocumentStatus =
						beneficiaryUser?.program_beneficiaries
							?.documents_status;

					let allDocumentsCompleted = false;
					if (allDocumentStatus && allDocumentStatus !== null) {
						allDocumentsCompleted = Object.values(
							JSON.parse(allDocumentStatus),
						).every((element: any) => {
							return (
								element === 'complete' ||
								element === 'not_applicable'
							);
						});
					}
					const status = await this.statusUpdate(
						{
							user_id: req.id,
							status: allDocumentsCompleted
								? 'ready_to_enrolled'
								: 'identified',
							reason_for_status_update: allDocumentsCompleted
								? 'documents_completed'
								: 'identified',
						},
						request,
					);
				}
				if (
					req.enrollment_status == 'applied_but_pending' ||
					req.enrollment_status == 'enrollment_rejected' 
				) {
					myRequest['enrolled_for_board'] = req?.enrolled_for_board;
					myRequest['enrollment_status'] = req?.enrollment_status;
				}
				await this.hasuraService.q(
					tableName,
					{
						...myRequest,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr,
					update,
				);
				break;
			}

			case 'edit_enrollement_details': {
				// Update enrollement data in Beneficiaries table
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_enrollement_details
						.program_beneficiaries;
				// const programDetails = beneficiaryUser.program_beneficiaries.find(
				//   (data) =>
				//     req.id == data.user_id &&
				//     req.academic_year_id == 1,
				// );
				const programDetails = beneficiaryUser.program_beneficiaries;
				let tableName = 'program_beneficiaries';
				let myRequest = {};
				if (req.enrollment_status == 'enrolled') {
					let messageArray = [];
					let tempArray = [
						'enrollment_first_name',
						'enrollment_dob',
						'enrollment_aadhaar_no',
						'is_eligible',
					];
					for (let info of tempArray) {
						if (req[info] === undefined || req[info] === '') {
							messageArray.push(`please send ${info} `);
						}
					}
					if (messageArray.length > 0) {
						return response.status(400).send({
							success: false,
							message: messageArray,
							data: {},
						});
					} else {
						myRequest = {
							...req,
							...(req?.enrollment_middle_name == '' && {
								enrollment_middle_name: null,
							}),
							...(req?.enrollment_last_name == '' && {
								enrollment_last_name: null,
							}),
						};
					}
				}
				await this.hasuraService.q(
					tableName,
					{
						...myRequest,
						id: programDetails?.id ? programDetails.id : null,
					},
					userArr,
					update,
				);

				const { data: updatedUser } = await this.userById(req.id);
				if (updatedUser.program_beneficiaries.enrollment_number) {
					if (req?.is_eligible === 'no') {
						const status = await this.statusUpdate(
							{
								user_id: req.id,
								status: 'ineligible_for_pragati_camp',
								reason_for_status_update:
									'The age of the learner should not be 14 to 29',
							},
							request,
						);
					} else if (
						req?.enrollment_aadhaar_no === updatedUser?.aadhar_no
					) {
						const status = await this.statusUpdate(
							{
								user_id: req.id,
								status: 'enrolled',
								reason_for_status_update: 'enrolled',
							},
							request,
						);
					}
				}

				break;
			}

			case 'document_status': {
				// Update Document status data in Beneficiaries table
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.document_status
						.program_beneficiaries;
				// const programDetails = beneficiaryUser.program_beneficiaries.find(
				//   (data) =>
				//     req.id == data.user_id &&
				//     req.academic_year_id == 1,
				// );
				const programDetails = beneficiaryUser.program_beneficiaries;
				let tableName = 'program_beneficiaries';

				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: programDetails?.id ? programDetails.id : null,
						user_id: user_id,
						documents_status:
							typeof req?.documents_status == 'object'
								? JSON.stringify(req?.documents_status).replace(
										/"/g,
										'\\"',
								  )
								: null,
					},
					userArr,
					update,
				);
				break;
			}
			case 'edit_reference': {
				// Update References table data
				const referencesArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_reference.references;
				const tableName = 'references';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.references?.[0]?.id ?? null,
						...(!beneficiaryUser?.references?.[0]?.id && {
							context: 'users',
						}),
						...(!beneficiaryUser?.references?.[0]?.id && {
							context_id: user_id,
						}),
					},
					referencesArr,
					update,
				);
				break;
			}
		}
		const { data: updatedUser } = await this.userById(user_id);
		return response.status(200).json({
			success: true,
			message: 'User data fetched successfully!',
			data: updatedUser,
		});
	}

	async newCreate(req: any) {
		const tableName = 'users';
		const newR = await this.hasuraService.q(tableName, req, [
			'first_name',
			'last_name',
			'mobile',
			'lat',
			'long',
			'keycloak_id',
		]);
		const user_id = newR[tableName]?.id;
		if (user_id) {
			await this.hasuraService.q(
				`program_beneficiaries`,
				{ ...req, user_id },
				['facilitator_id', 'user_id'],
			);
			await this.hasuraService.q(
				`core_beneficiaries`,
				{ ...req, user_id },
				['device_ownership', 'device_type', 'user_id'],
			);
		}
		return await this.userById(user_id);
	}

	async userById(id: any) {
		var data = {
			query: `query searchById {
            users_by_pk(id: ${id}) {
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
			profile_photo_1
			profile_photo_2
			profile_photo_3
			profile_url
			state
			state_id
			updated_at
			updated_by
			village
			username
            program_beneficiaries {
            beneficiaries_found_at
            created_by
            facilitator_id
            id
            status
            reason_for_status_update
            academic_year_id
            user_id
            enrollment_number
            enrollment_status
            enrolled_for_board
            type_of_enrollement
            subjects
            payment_receipt_document_id
            program_id
            updated_by
            documents_status
            learning_motivation
            type_of_support_needed
			learning_level
			enrollment_date
			enrollment_first_name
			enrollment_middle_name
			enrollment_last_name
			enrollment_dob
			enrollment_aadhaar_no
			is_eligible
			document {
				context
				context_id
				created_by
				document_sub_type
				doument_type
				id
				name
				path
				provider
				updated_by
				user_id
			  }
          }
            core_beneficiaries {
            career_aspiration
            updated_by
            type_of_learner
            status
			type_of_enrollement
            reason_of_leaving_education
            previous_school_type
            mobile_ownership
            learner_wish_to_pursue_education
            last_standard_of_education_year
            last_standard_of_education
            last_school_type
            id
            connect_via_refrence
            created_by
            device_ownership
            device_type
            document_id
            enrolled_for_board
            enrollement_status
            father_first_name
            father_middle_name
            father_last_name
            mother_first_name
            mother_middle_name
            mother_last_name
            career_aspiration_details
            alternative_device_ownership
            alternative_device_type
            mark_as_whatsapp_number
          }
          references {
            id
            name
            first_name
            last_name
            middle_name
            relation
            contact_number
            designation
            document_id
            type_of_document
            context
            context_id
          }
          extended_users {
            marital_status
            designation
            created_by
            id
            user_id
            updated_by
            social_category
            qualification_id
          }
        }}`,
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		let result = response?.data?.users_by_pk;
		if (result) {
			result.program_beneficiaries = result?.program_beneficiaries?.[0];
		}
		return {
			message: 'User data fetched successfully.',
			data: result,
		};
	}
}
