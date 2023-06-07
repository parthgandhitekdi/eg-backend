import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { EnumService } from '../enum/enum.service';
import { HasuraService } from '../services/hasura/hasura.service';

@Injectable()
export class FacilitatorService {
	constructor(
		private readonly httpService: HttpService,
		private enumService: EnumService,
		private hasuraService: HasuraService,
		private userService: UserService,
	) {}

	allStatus = this.enumService.getEnumValue('FACILITATOR_STATUS').data;

	private isValidString(str: String) {
		return typeof str === 'string' && str.trim();
	}

	public table = 'core_faciltators';
	public fillable = [
		'user_id',
		'pan_no',
		'device_type',
		'device_ownership',
		'sourcing_channel',
		'refreere',
		'updated_by',
		'created_by',
	];
	public returnFields = [
		'id',
		'user_id',
		'pan_no',
		'device_type',
		'device_ownership',
		'sourcing_channel',
		'refreere',
		'updated_by',
		'created_by',
	];

	create(req: any) {
		// return this.hasuraService.create(this.table, req, this.returnFields);
	}

	findAll(request: any) {
		// return this.hasuraService.getAll(this.table, this.returnFields, request);
	}

	findOne(id: number) {
		// return this.hasuraService.getOne(+id, this.table, this.returnFields);
	}

	async updateBasicDetails(id: number, body: any) {
		// Update Users table data
		const userArr = ['first_name', 'last_name', 'middle_name', 'dob'];
		const keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			body.id = id;
			await this.hasuraService.q(tableName, body, userArr, true);
		}
	}

	async updateContactDetails(id: number, body: any, facilitatorUser: any) {
		// Update Users table data
		const userArr = ['mobile', 'alternative_mobile_number', 'email_id'];
		let keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			body.id = id;
			await this.hasuraService.q(tableName, body, userArr, true);
		}

		// Update core_facilitators table data
		const coreFacilitatorsArr = [
			'user_id',
			'device_ownership',
			'device_type',
		];
		keyExist = coreFacilitatorsArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		if (keyExist.length) {
			const tableName = 'core_faciltators';
			await this.hasuraService.q(
				tableName,
				{
					...body,
					id: facilitatorUser?.core_faciltator?.id ?? null,
					user_id: id,
				},
				coreFacilitatorsArr,
				true,
			);
		}
	}

	async updateAddressDetails(id: number, body: any) {
		// Update Users table data
		const userArr = [
			'state',
			'district',
			'block',
			'village',
			'grampanchayat',
		];
		const keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			body.id = id;
			await this.hasuraService.q(tableName, body, userArr, true);
		}
	}

	async updatePersonalDetails(id: number, body: any, facilitatorUser: any) {
		// Update Users table data
		const userArr = ['gender'];
		let keyExist = userArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			const tableName = 'users';
			body.id = id;
			await this.hasuraService.q(tableName, body, userArr, true);
		}

		// Update Extended Users table data
		const extendedUserArr = [
			...(!facilitatorUser?.extended_users ? ['user_id'] : []),
			'social_category',
			'marital_status',
		];
		keyExist = extendedUserArr.filter((e) => Object.keys(body).includes(e));
		if (keyExist.length) {
			let tableName = 'extended_users';
			await this.hasuraService.q(
				tableName,
				{
					...body,
					id: facilitatorUser?.extended_users.id ?? null,
					user_id: id,
				},
				extendedUserArr,
				true,
			);
		}
	}

	async updateWorkExperienceDetails(
		id: number,
		body: any,
		facilitatorUser: any,
	) {
		if (!['experience', 'vo_experience'].includes(body.type)) {
			return {
				errorMessage: 'Invalid experience type!',
			};
		}
		if (
			body.experience_id &&
			!facilitatorUser.experience.find(
				(data) => data.id == body.experience_id,
			)
		) {
			return {
				errorMessage: "Invalid 'experience_id'!",
			};
		}
		// Update experience table data
		const experienceArr = [
			'role_title',
			'organization',
			'description',
			'experience_in_years',
			'related_to_teaching',
			'user_id',
			'type',
		];
		let keyExist = experienceArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		let experienceInfo;
		if (keyExist.length) {
			const tableName = 'experience';
			// If body has 'experience_id' field, then update. Otherwise create a new record.
			experienceInfo = await this.hasuraService.q(
				tableName,
				{
					...body,
					id: body.experience_id ? body.experience_id : null,
					user_id: id,
				},
				experienceArr,
				true,
			);
			experienceInfo = experienceInfo.experience;
		}

		// Update Reference table data
		const referencesArr = [
			'name',
			'contact_number',
			'type_of_document',
			'document_id',
			'context',
			'context_id',
		];
		keyExist = referencesArr.filter((e) => Object.keys(body).includes(e));
		let referenceInfo;
		if (keyExist.length) {
			let tableName = 'references';
			let referenceDetails;
			if (body.experience_id) {
				referenceDetails = facilitatorUser.experience.find(
					(data) => data.id == body.experience_id,
				)?.reference[0];
			}
			// If body has document_id field, then update else create
			referenceInfo = await this.hasuraService.q(
				tableName,
				{
					...body.reference_details,
					document_id: body.document_id,
					id: referenceDetails?.id ? referenceDetails?.id : null,

					// If 'experienceInfo' has id then a new experience record has created
					...(experienceInfo?.id && { context: 'experience' }),
					...(experienceInfo?.id && {
						context_id: experienceInfo.id,
					}),
				},
				referencesArr,
				true,
			);
			referenceInfo = referenceInfo.references;
		}

		// Update Documents table data
		if (referenceInfo?.id && body?.document_id) {
			const documentsArr = ['context', 'context_id'];
			let tableName = 'documents';
			await this.hasuraService.q(
				tableName,
				{
					id: body?.document_id ?? null,
					context: 'references',
					context_id: referenceInfo?.id,
				},
				documentsArr,
				true,
			);
		}
	}

	async updateWorkAvailabilityDetails(
		id: number,
		body: any,
		facilitatorUser: any,
	) {
		// Update Program facilitators table data
		const programFacilitatorArr = ['availability'];
		let keyExist = programFacilitatorArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		if (keyExist.length) {
			const tableName = 'program_faciltators';
			const programDetails = facilitatorUser.program_faciltators;
			await this.hasuraService.q(
				tableName,
				{
					...body,
					id: programDetails?.id ?? null,
				},
				programFacilitatorArr,
				true,
			);
		}
	}

	async updateQualificationDetails(
		id: number,
		body: any,
		facilitatorUser: any,
	) {
		// Update Qualifications table data
		const qualificationsArr = [
			'user_id',
			'qualification_master_id',
			'qualification_reference_document_id',
		];
		let keyExist = qualificationsArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		const qualificationDetails = facilitatorUser.qualifications[0];
		if (keyExist.length) {
			const tableName = 'qualifications';
			await this.hasuraService.q(
				tableName,
				{
					...body,
					id: qualificationDetails?.id ?? null,
					user_id: id,
				},
				qualificationsArr,
				true,
			);
		}

		// Update Program facilitators table data
		const programFacilitatorsArr = ['qualification_ids'];
		const programDetails = facilitatorUser.program_faciltators;
		keyExist = qualificationsArr.filter((e) =>
			Object.keys(body).includes(e),
		);
		if (keyExist.length) {
			const tableName = 'program_faciltators';
			await this.hasuraService.q(
				tableName,
				{
					qualification_ids: JSON.stringify(body.qualification_ids),
					id: programDetails.id,
				},
				programFacilitatorsArr,
				true,
			);
		}
	}

	async updateReferenceDetails(id: number, body: any, facilitatorUser: any) {
		if (
			body.id &&
			!facilitatorUser.references.find((data) => data.id == body.id)
		) {
			return {
				errorMessage: 'Invalid reference id!',
			};
		}
		// Update References table data
		const referencesArr = [
			'name',
			'contact_number',
			'designation',
			'context',
			'context_id',
		];
		const tableName = 'references';
		await this.hasuraService.q(
			tableName,
			{
				...body,
				id: body.id ?? null,
				...(!body.id && { context: 'users' }),
				...(!body.id && { context_id: id }),
			},
			referencesArr,
			true,
		);
	}

	// async updatePhotoDetails(id: number, body: any) {
	//   // Update Users table data
	//   const userArr = [
	//     body.photo_type
	//   ];
	//   body[body.photo_type] = body.url;
	//   delete body.url;
	//   let keyExist = userArr.filter((e) => Object.keys(body).includes(e));
	//   if (keyExist.length) {
	//     const tableName = 'users';
	//     body.id = id;
	//     await this.hasuraService.q(tableName, body, userArr, true);
	//   }
	// }

	async update(id: number, body: any, response: any) {
		const { data: facilitatorUser } = await this.userById(id);
		switch (body.page_type) {
			case 'basic_details': {
				await this.updateBasicDetails(id, body);
				break;
			}
			case 'contact_details': {
				await this.updateContactDetails(id, body, facilitatorUser);
				break;
			}
			case 'address_details': {
				await this.updateAddressDetails(id, body);
				break;
			}
			case 'personal_details': {
				await this.updatePersonalDetails(id, body, facilitatorUser);
				break;
			}
			case 'work_availability_details': {
				await this.updateWorkAvailabilityDetails(
					id,
					body,
					facilitatorUser,
				);
				break;
			}
			case 'work_experience_details': {
				const result = await this.updateWorkExperienceDetails(
					id,
					body,
					facilitatorUser,
				);
				if (result?.errorMessage) {
					return response.status(400).json({
						success: false,
						message: result.errorMessage,
					});
				}
				break;
			}
			case 'qualification_details': {
				await this.updateQualificationDetails(
					id,
					body,
					facilitatorUser,
				);
				break;
			}
			case 'reference_details': {
				const result = await this.updateReferenceDetails(
					id,
					body,
					facilitatorUser,
				);
				if (result?.errorMessage) {
					return response.status(400).json({
						success: false,
						message: result.errorMessage,
					});
				}
				break;
			}
			case 'documents_checklist': {
				// Update Document status data in program_faciltators table
				const userArr = ['documents_status'];
				const facilitatorId = facilitatorUser.program_faciltators.id;
				let tableName = 'program_faciltators';
				if (body.documents_status) {
					await this.hasuraService.q(
						tableName,
						{
							...body,
							id: facilitatorId,
							user_id: id,
							documents_status: JSON.stringify(
								body.documents_status,
							).replace(/"/g, '\\"'),
						},
						userArr,
						true,
					);
				}
				break;
			}
			// case 'profile_photos': {
			//   await this.updatePhotoDetails(id, body);
			//   break;
			// }
		}
		const { data: updatedUser } = await this.userById(id);
		return response.status(200).json({
			success: true,
			message: 'User data fetched successfully!',
			data: updatedUser,
		});
	}

	remove(id: number) {
		// return this.hasuraService.delete(this.table, { id: +id });
	}

	filterFacilitatorsBasedOnExperience(
		arr,
		experience_type,
		experience_value,
	) {
		return arr.filter((facilitator) => {
			if (
				facilitator?.experience &&
				Array.isArray(facilitator?.experience)
			) {
				if (facilitator.experience.length) {
					const sum = facilitator?.experience.reduce((acc, curr) => {
						if (curr.type === experience_type) {
							acc += Number(curr.experience_in_years);
						}
						return acc;
					}, 0);
					if (experience_value === '5+' && sum > 5) {
						return true;
					} else if (Number(experience_value) <= sum) {
						return true;
					} else {
						return false;
					}
				} else {
					if (Number(experience_value) === 0) {
						return true;
					} else {
						return false;
					}
				}
			} else {
				return false;
			}
		});
	}

	async getFacilitators(req: any, body: any) {
		const user = await this.userService.ipUserInfo(req);
		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 15 : parseInt(body.limit);

		let skip = page > 1 ? limit * (page - 1) : 0;

		const variables: any = {};

		let filterQueryArray = [];
		let paramsQueryArray = [];

		if (
			body.hasOwnProperty('qualificationIds') &&
			body.qualificationIds.length
		) {
			paramsQueryArray.push('$qualificationIds: [Int!]');
			filterQueryArray.push(
				'{qualifications: {qualification_master_id: {_in: $qualificationIds}}}',
			);
			variables.qualificationIds = body.qualificationIds;
		}

		if (
			body.hasOwnProperty('status') &&
			this.isValidString(body.status) &&
			this.allStatus.map((obj) => obj.value).includes(body.status)
		) {
			paramsQueryArray.push('$status: String');
			filterQueryArray.push(
				'{program_faciltators: {status: {_eq: $status}}}',
			);
			variables.status = body.status;
		}

		if (body.hasOwnProperty('district')) {
			paramsQueryArray.push('$district: [String!]');
			filterQueryArray.push('{district: { _in: $district }}');
			variables.district = body.district;
		}

		filterQueryArray.unshift(
			`{program_faciltators: {id: {_is_null: false}, parent_ip: {_eq: "${user?.data?.program_users[0]?.organisation_id}"}}}`,
		);

		let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';
		let paramsQuery = '';
		if (paramsQueryArray.length) {
			paramsQuery = '(' + paramsQueryArray.join(',') + ')';
		}

		let sortQuery = `{ created_at: desc }`;

		if (body.hasOwnProperty('sort')) {
			// Supported sortings: name, qualification, region, eligibility, status, comments
			let sortField = body.sort.split('|')[0]?.trim();
			let sortType = body.sort.split('|')[1]?.trim();
			let possibleSortFields = [
				'name',
				'qualification',
				'region',
				'eligibility',
				'status',
				'comments',
			];
			let possibleSortTypes = ['asc', 'desc'];
			if (
				possibleSortFields.includes(sortField) &&
				possibleSortTypes.includes(sortType)
			) {
				switch (sortField) {
					case 'name': {
						sortQuery = `{ first_name: ${sortType} }`;
						break;
					}
					case 'qualification': {
						sortQuery = `{ qualifications_aggregate: { count: ${sortType} } }`;
						break;
					}
					case 'region': {
						sortQuery = `{ block: ${sortType} }`;
						break;
					}
					case 'eligibility': {
						break;
					}
					case 'status': {
						sortQuery = `{ program_faciltators_aggregate: { count: ${sortType} } }`;
						break;
					}
					case 'comments': {
						break;
					}
				}
			}
		}

		const data = {
			query: `query MyQuery ${paramsQuery} {
        users_aggregate (where: ${filterQuery}) {
          aggregate {
            count
          }
        }

        users ( where: ${filterQuery}, order_by: ${sortQuery} ) {
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
          password
          state_id
          updated_by
          profile_url
          state
          district
          block
          village
          grampanchayat
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
            academic_year_id
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
        }
      }`,
			variables: variables,
		};

		let response;
		try {
			response = await this.hasuraService.getData(data);
		} catch (error) {
			throw new InternalServerErrorException(error.message);
		}

		let mappedResponse = response?.data?.users;

		if (
			mappedResponse &&
			body.hasOwnProperty('work_experience') &&
			this.isValidString(body.work_experience)
		) {
			const isValidNumberFilter =
				!isNaN(Number(body.work_experience)) ||
				body.work_experience === '5+';
			if (isValidNumberFilter) {
				mappedResponse = this.filterFacilitatorsBasedOnExperience(
					mappedResponse,
					'experience',
					body.work_experience,
				);
			}
		}

		if (
			mappedResponse &&
			body.hasOwnProperty('vo_experience') &&
			this.isValidString(body.vo_experience)
		) {
			const isValidNumberFilter =
				!isNaN(Number(body.vo_experience)) ||
				body.vo_experience === '5+';
			if (isValidNumberFilter) {
				mappedResponse = this.filterFacilitatorsBasedOnExperience(
					mappedResponse,
					'vo_experience',
					body.vo_experience,
				);
			}
		}

		let responseWithPagination = mappedResponse.slice(skip, skip + limit);

		responseWithPagination = responseWithPagination.map((obj) => {
			obj.program_faciltators = obj.program_faciltators?.[0] || {};
			return obj;
		});

		const count = mappedResponse.length;
		const totalPages = Math.ceil(count / limit);

		return {
			message: 'Facilitator data fetched successfully.',
			data: {
				totalCount: count,
				data: responseWithPagination,
				limit,
				currentPage: page,
				totalPages: `${totalPages}`,
			},
		};
	}

	async userById(id: any) {
		const data = {
			query: `query searchById {        
        users_by_pk(id: ${id}) {
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
          password
          state_id
          updated_by
          profile_url
          state
          district
          block
          village
          grampanchayat
          alternative_mobile_number
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
            reference {
              id
              name
              contact_number
              type_of_document
              designation
              document_id
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
            availability
            has_social_work_exp
            id
            documents_status
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
          documents(order_by: {id: desc}){
            id
            user_id
            name
            doument_type
            document_sub_type
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
          references {
            id
            name
            contact_number
            designation
          }
        }}`,
		};

		const response = await this.hasuraService.getData(data);
		let userData = response?.data?.users_by_pk;
		userData.program_faciltators = userData?.program_faciltators?.[0];
		return {
			message: 'User data fetched successfully.',
			data: userData,
		};
	}
}
