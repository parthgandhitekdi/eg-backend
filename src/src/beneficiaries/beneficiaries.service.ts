import { HttpService } from '@nestjs/axios';
import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { UserHelperService } from '../helper/userHelper.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { KeycloakService } from '../services/keycloak/keycloak.service';
@Injectable()
export class BeneficiariesService {
	public url = process.env.HASURA_BASE_URL;

	constructor(
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

	//status count
	public async getStatuswiseCount(req: any, resp: any) {
		const user = await this.userService.ipUserInfo(req);
		const status = [
			'identified',
			'ready_to_enroll',
			'enrolled',
			'approved_ip',
			'registered_in_camp',
			'pragati_syc',
			'rejected',
			'dropout',
		];
		let qury = `query MyQuery {
      ${status.map(
			(item) => `${item}:program_beneficiaries_aggregate(where: {
          _and: [
              {
                facilitator_id: {_eq: ${user.data.id}}
              },{
              status: {_eq: ${item}}
            }
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
				count: newQdata?.[item]?.aggregate?.count,
			};
		});

		return resp.status(200).json({
			success: true,
			message: 'Benificiaries found successfully!',
			data: {
				data: res,
			},
		});
	}

	public async findAll(body: any, req: any, resp: any) {
		const user = await this.userService.ipUserInfo(req);
		const status = body?.status;
		const sortType = body?.sortType ? body?.sortType : 'desc';
		const page = body?.page ? body?.page : '1';
		const limit = body?.limit ? body?.limit : '10';
		let offset = 0;
		if (page > 1 && limit) {
			offset = parseInt(limit) * (page - 1);
		}
		let query = '';
		if (status && status !== '') {
			query = `{program_beneficiaries:{status:{_eq:${status}}}}`;
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
                        id
                        first_name
                        last_name
                        dob
                        aadhar_token
                        address
                        district_id
                         email_id
                        block_id
                        block_village_id
                        created_by
                        gender
                        lat
                        state
                        grampanchayat
                          village
                          block
                          district
                        long
                        mobile
                        password
                        state_id
                        updated_by
                        profile_url
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
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		let result = response?.data?.users;

		let mappedResponse = result;
		const count = response?.data?.users_aggregate?.aggregate?.count;
		const totalPages = Math.ceil(count / limit);

		if (!mappedResponse || mappedResponse.length < 1) {
			return resp.status(404).send({
				success: false,
				status: 'Not Found',
				message: 'Benificiaries Not Found',
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
              id
              first_name
              middle_name
              last_name
              dob
              mobile
            grampanchayat
              village
              block
              district
              state
              state_id
              aadhar_no
              aadhar_token
              aadhar_verified
              address
              address_line_1
              address_line_2
              alternative_mobile_number
              block
              profile_url
              block_id
              district_id
              email_id
              gender
              lat
              long
              block_village_id
              is_duplicate
              duplicate_reason
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
                reason_for_status_update
                documents_status
                document_checklist
                updated_by
                user_id
                facilitator_id
                created_by
                beneficiaries_found_at
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
		let result = response?.data?.users_by_pk;
		result.program_beneficiaries = result.program_beneficiaries?.[0];
		if (!result) {
			return resp.status(404).send({
				success: false,
				status: 'Not Found',
				message: 'Benificiaries Not Found',
				data: {},
			});
		} else {
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

	public async statusUpdate(req: any) {
		return await this.hasuraService.update(
			req.id,
			'program_beneficiaries',
			req,
			this.returnFields,
			[...this.returnFields, 'id'],
		);
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
		const user_id = req?.id;
		const PAGE_WISE_UPDATE_TABLE_DETAILS = {
			edit_basic: {
				users: ['first_name', 'last_name', 'middle_name', 'dob'],
			},
			add_ag_duplication: {
				users: ['is_duplicate', 'duplicate_reason'],
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
					'reason_of_leaving_education',
				],
			},
			edit_education: {
				core_beneficiaries: [
					'user_id',
					'last_standard_of_education',
					'last_standard_of_education_year',
					'previous_school_type',
					'reason_of_leaving_education',
				],
			},
			edit_further_studies: {
				core_beneficiaries: [
					'user_id',
					'career_aspiration',
					'career_aspiration_details',
				],
			},
			edit_enrollement: {
				program_beneficiaries: [
					'enrollment_number',
					'user_id',
					'enrollment_status',
					'enrolled_for_board',
					'type_of_enrollement',
					'subjects',
					'program_id',
					'facilitator_id',
					'academic_year_id',
					'payment_receipt_document_id',
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
				await this.hasuraService.q(tableName, req, userArr, update);
				break;
			}

			case 'add_ag_duplication': {
				const aadhaar_no = beneficiaryUser.aadhar_no;

				if (!aadhaar_no) {
					return response.status(400).json({
						success: false,
						message: 'Aadhaar number not found!',
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
					req.is_duplicate === 'yes'
				) {
					// Update Users table data
					const userArr =
						PAGE_WISE_UPDATE_TABLE_DETAILS.add_ag_duplication.users;
					const tableName = 'users';
					await this.hasuraService.q(tableName, req, userArr, update);

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
				} else {
					return response.status(400).json({
						success: false,
						message: 'Duplicate AG detected!',
					});
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
						id: beneficiaryUser?.core_beneficiaries?.[0]?.id
							? beneficiaryUser?.core_beneficiaries?.[0]?.id
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
						id: beneficiaryUser?.core_beneficiaries?.[0]?.id
							? beneficiaryUser?.core_beneficiaries?.[0]?.id
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
						id: beneficiaryUser?.extended_users?.[0]?.id
							? beneficiaryUser?.extended_users?.[0]?.id
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
				await this.hasuraService.q(
					tableName,
					{
						...req.father_details,
						...req.mother_details,
						id: beneficiaryUser?.core_beneficiaries?.[0]?.id
							? beneficiaryUser?.core_beneficiaries?.[0]?.id
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
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.add_education
						.core_beneficiaries;
				let tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.core_beneficiaries?.[0]?.id
							? beneficiaryUser?.core_beneficiaries?.[0]?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);
				break;
			}

			case 'edit_education': {
				// Update Core beneficiaries table data
				const userArr =
					PAGE_WISE_UPDATE_TABLE_DETAILS.edit_education
						.core_beneficiaries;
				let tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.core_beneficiaries?.[0]?.id
							? beneficiaryUser?.core_beneficiaries?.[0]?.id
							: null,
						user_id,
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
				let tableName = 'core_beneficiaries';
				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: beneficiaryUser?.core_beneficiaries?.[0]?.id
							? beneficiaryUser?.core_beneficiaries?.[0]?.id
							: null,
						user_id,
					},
					userArr,
					update,
				);
				break;
			}
			case 'edit_enrollement': {
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

				await this.hasuraService.q(
					tableName,
					{
						...req,
						id: programDetails?.id ? programDetails.id : null,
						user_id: user_id,

						subjects: JSON.stringify(req.subjects).replace(
							/"/g,
							'\\"',
						),
					},
					userArr,
					update,
				);
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
						documents_status: JSON.stringify(
							req.documents_status,
						).replace(/"/g, '\\"'),
					},
					userArr,
					update,
				);
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
          id
          first_name
          middle_name
          last_name
          dob
          mobile
          grampanchayat
          village
          block
          district
          state
          state_id
          aadhar_no
          aadhar_token
          aadhar_verified
          address
          address_line_1
          address_line_2
          alternative_mobile_number
          block
          profile_url
          block_id
          district_id
          email_id
          gender
          lat
          long
          block_village_id
          is_duplicate
          duplicate_reason
          program_beneficiaries {
            beneficiaries_found_at
            created_by
            facilitator_id
            id
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
		result.program_beneficiaries = result.program_beneficiaries?.[0];
		return {
			message: 'User data fetched successfully.',
			data: result,
		};
	}
}
