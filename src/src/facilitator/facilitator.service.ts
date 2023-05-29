import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';
import { EnumService } from '../enum/enum.service';
import { HasuraService } from '../services/hasura/hasura.service';
import { UserService } from 'src/user.service';

@Injectable()
export class FacilitatorService {
  constructor(
    private readonly httpService: HttpService,
    private enumService: EnumService,
    private hasuraService: HasuraService,
    private userService:UserService,
  ) {
  }

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

  update(id: number, req: any) {
    // return this.hasuraService.update(+id, this.table, req, this.returnFields);
  }

  remove(id: number) {
    // return this.hasuraService.delete(this.table, { id: +id });
  }

  filterFacilitatorsBasedOnExperience(arr, experience_type, experience_value) {
    return arr.filter(facilitator => {
      if (facilitator?.experience && Array.isArray(facilitator?.experience)) {
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

    const variables: any = {
    };

    let filterQueryArray = [];
    let paramsQueryArray = [];

    if (body.hasOwnProperty('qualificationIds') && body.qualificationIds.length) {
      paramsQueryArray.push('$qualificationIds: [Int!]');
      filterQueryArray.push('{qualifications: {qualification_master_id: {_in: $qualificationIds}}}');
      variables.qualificationIds = body.qualificationIds;
    }

    if (
      body.hasOwnProperty('status')
      && this.isValidString(body.status)
      && this.allStatus.map(obj => obj.value).includes(body.status)
    ) {
      paramsQueryArray.push('$status: String');
      filterQueryArray.push('{program_faciltators: {status: {_eq: $status}}}');
      variables.status = body.status;
    }

    if (
      body.hasOwnProperty('district')
    ) {
      paramsQueryArray.push('$district: [String!]');
      filterQueryArray.push('{district: { _in: $district }}');
      variables.district = body.district;
    }

    filterQueryArray.unshift(`{program_faciltators: {id: {_is_null: false}, parent_ip: {_eq: "${user?.data?.program_users[0]?.organisation_id}"}}}`);

    let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';
    let paramsQuery = '';
    if (paramsQueryArray.length) {
      paramsQuery = '(' + paramsQueryArray.join(',') + ')';
    }

    const data = {
      query: `query MyQuery ${paramsQuery} {
        users_aggregate (where: ${filterQuery}) {
          aggregate {
            count
          }
        }

        users (where: ${filterQuery}, order_by: {created_at: desc}) {
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
      variables: variables
    };

    let response;
    try {
      response = await this.hasuraService.getData(data);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }

    let mappedResponse = response?.data?.users;
    
    if (
      mappedResponse
      && body.hasOwnProperty('work_experience')
      && this.isValidString(body.work_experience)
    ) {
      const isValidNumberFilter = !isNaN(Number(body.work_experience)) || body.work_experience === '5+';
      if (isValidNumberFilter) {
        mappedResponse = this.filterFacilitatorsBasedOnExperience(mappedResponse, 'experience', body.work_experience);
      }
    }

    if (
      mappedResponse
      && body.hasOwnProperty('vo_experience')
      && this.isValidString(body.vo_experience)
    ) {
      const isValidNumberFilter = !isNaN(Number(body.vo_experience)) || body.vo_experience === '5+';
      if (isValidNumberFilter) {
        mappedResponse = this.filterFacilitatorsBasedOnExperience(mappedResponse, 'vo_experience', body.vo_experience);
      }
    }

    let responseWithPagination = mappedResponse.slice(skip, skip + limit);

    responseWithPagination = responseWithPagination.map(obj => {
      const res = {
        ...obj,
        ...obj.core_faciltator,
      };
      delete res.core_faciltator;
      return res;
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
      }
    };
  }
}
