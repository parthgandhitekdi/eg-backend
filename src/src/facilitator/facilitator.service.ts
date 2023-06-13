import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { EnumService } from '../enum/enum.service';
import { HasuraService } from '../services/hasura/hasura.service';
import { S3Service } from '../services/s3/s3.service';

@Injectable()
export class FacilitatorService {
	constructor(
		private readonly httpService: HttpService,
		private enumService: EnumService,
		private hasuraService: HasuraService,
		private userService: UserService,
		private s3Service: S3Service,
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

	async getFacilitatorsForOrientation(
		request: any,
		body: any,
		response: any,
	) {
		const user = await this.userService.ipUserInfo(request);

		const page = isNaN(body.page) ? 1 : parseInt(body.page);
		const limit = isNaN(body.limit) ? 15 : parseInt(body.limit);

		let skip = page > 1 ? limit * (page - 1) : 0;

		const data = {
			query: `
				query MyQuery($limit:Int, $offset:Int) {
					users_aggregate (
						where: {
							_and: [
								{
									program_faciltators: {
										parent_ip: { _eq: "${user?.data?.program_users[0]?.organisation_id}" }
										status: { _eq: "shortlisted_for_orientation" }
									}
								},
								{
									attendances_aggregate: {
										count: { predicate: {_eq: 0} }
									}
								}
							]
						}
					) {
						aggregate {
						  count
						}
					}
					
					users(
						where: {
							_and: [
								{
									program_faciltators: {
										parent_ip: { _eq: "${user?.data?.program_users[0]?.organisation_id}" }
										status: { _eq: "shortlisted_for_orientation" }
									}
								},
								{
									attendances_aggregate: {
										count: { predicate: {_eq: 0} }
									}
								}
							]
						},
						limit: $limit,
						offset: $offset,
						order_by: {created_at: desc}
					) {
						id
						first_name
						middle_name
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
				}
			`,
			variables: {
				limit: limit,
				offset: skip,
			},
		};

		const hasuraResponse = await this.hasuraService.getData(data);

		let usersList = hasuraResponse?.data?.users;

		usersList = usersList.map((obj) => {
			obj.program_faciltators = obj.program_faciltators?.[0] || {};
			obj.qualifications = obj.qualifications?.[0] || {};
			return obj;
		});

		const count =
			hasuraResponse?.data?.users_aggregate?.aggregate?.count || 0;

		const totalPages = Math.ceil(count / limit);

		return response.status(200).json({
			status: true,
			message: 'Facilitators data fetched successfully.',
			data: {
				totalCount: count,
				data: usersList,
				limit,
				currentPage: page,
				totalPages: `${totalPages}`,
			},
		});
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
					id: facilitatorUser?.extended_users?.id ?? null,
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
		let experience_id = body.id;
		if (
			experience_id &&
			!facilitatorUser[body.type].find(
				(data) => data.id == experience_id,
			)
		) {
			return {
				errorMessage: "Invalid experience id!",
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
			// If 'experience_id' has any value, then update. Otherwise create a new record.
			experienceInfo = await this.hasuraService.q(
				tableName,
				{
					...body,
					id: experience_id ? experience_id : null,
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
		keyExist = referencesArr.filter((e) => Object.keys(body.reference_details).includes(e));
		let referenceInfo;
		let referenceDetails;
		if (keyExist.length) {
			let tableName = 'references';
			if (experience_id) {
				referenceDetails = facilitatorUser.experience.find(
					(data) => data.id == experience_id,
				)?.reference;

				if (referenceDetails.document_reference?.name) {
					await this.s3Service.deletePhoto(referenceDetails.document_reference.name);
				}
				
				await this.hasuraService.delete(
					'documents',
					{
						user_id: id,
						context: 'references',
						context_id: referenceDetails.id
					},
				);
			}
			referenceInfo = await this.hasuraService.q(
				tableName,
				{
					...body.reference_details,
					document_id: body.reference_details?.document_id,
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
		if (body?.reference_details?.document_id) {
			const documentsArr = ['context', 'context_id'];
			let tableName = 'documents';
			await this.hasuraService.q(
				tableName,
				{
					id: body?.reference_details?.document_id ?? null,
					context: 'references',
					context_id: referenceInfo?.id ? referenceInfo?.id : referenceDetails.id,
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
		let qualificationDetails = facilitatorUser.qualifications;

		if (qualificationDetails.id) {
			if (qualificationDetails.document_reference?.name) {
				await this.s3Service.deletePhoto(qualificationDetails.document_reference.name);
			}
				
			await this.hasuraService.delete(
				'documents',
				{
					user_id: id,
					context: 'qualifications',
					context_id: qualificationDetails.id
				},
			);
		}

		let newCreatedQualificationDetails;

		if (keyExist.length) {
			const tableName = 'qualifications';
			newCreatedQualificationDetails = (await this.hasuraService.q(
				tableName,
				{
					...body,
					id: qualificationDetails?.id ?? null,
					user_id: id,
				},
				qualificationsArr,
				true,
			)).qualifications;
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
					qualification_ids: JSON.stringify(body.qualification_ids).replace(/"/g, '\\"'),
					id: programDetails.id,
				},
				programFacilitatorsArr,
				true,
			);
		}

		// Update documents table data
		const documentsArr = ['context', 'context_id'];
		let tableName = 'documents';
		await this.hasuraService.q(
			tableName,
			{
				id: body.qualification_reference_document_id ?? null,
				context: 'qualifications',
				context_id: qualificationDetails.id
							? qualificationDetails.id
							: newCreatedQualificationDetails.id
							? newCreatedQualificationDetails.id
							: null,
			},
			documentsArr,
			true,
		);
	}

	async updateReferenceDetails(id: number, body: any, facilitatorUser: any) {
		const referenceDetails = facilitatorUser?.references;

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
				id: referenceDetails.id ?? null,
				...(!referenceDetails?.id && { context: 'users' }),
				...(!referenceDetails?.id && { context_id: id }),
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
				await this.updateReferenceDetails(id, body, facilitatorUser);
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

	async removeExperience(id: number, body: any, response: any) {
		try {
			const deletedExperienceData = (
				await this.hasuraService.delete('experience', { id })
			)?.experience;

			if (deletedExperienceData.affected_rows == 0) {
				return response.status(400).json({
					success: false,
					message: 'Experience Id does not exists!',
				});
			}

			const deletedReferenceData = (
				await this.hasuraService.delete(
					'references',
					{ context: 'experience', context_id: id },
					[],
					['id'],
				)
			)?.references;

			if (
				deletedReferenceData &&
				deletedReferenceData.affected_rows > 0
			) {
				const referenceId = deletedReferenceData.returning[0].id;

				const deletedDocumentData = (
					await this.hasuraService.delete(
						'documents',
						{ context: 'references', context_id: referenceId },
						[],
						['id', 'name'],
					)
				)?.documents;

				if (
					deletedDocumentData &&
					deletedDocumentData.affected_rows > 0
				) {
					const fileName = deletedDocumentData.returning[0].name;
					if (
						fileName &&
						typeof fileName === 'string' &&
						fileName.trim()
					) {
						await this.s3Service.deletePhoto(fileName);
					}
				}
			}

			return response.status(200).json({
				success: true,
				message: 'Experience deleted successfully!',
			});
		} catch (error) {
			return response.status(500).json({
				success: false,
				message: error.message,
			});
		}
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
		if (body.search && body.search !== '') {
			filterQueryArray.push(`{_or: [
        { first_name: { _ilike: "%${body.search}%" } },
        { last_name: { _ilike: "%${body.search}%" } },
        { email_id: { _ilike: "%${body.search}%" } }
      ]} `);
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

		if (body.hasOwnProperty('district') && body.district.length) {
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
          middle_name
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
			obj.qualifications = obj.qualifications?.[0] || {};
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
		const userData = (await this.userService.userById(+id)).data;

		return {
			message: 'User data fetched successfully.',
			data: userData,
		};
	}
}
