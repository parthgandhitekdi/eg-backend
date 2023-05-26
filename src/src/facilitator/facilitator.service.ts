import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';
import { EnumService } from '../enum/enum.service';
import { HasuraService } from '../services/hasura/hasura.service';

@Injectable()
export class FacilitatorService {
  constructor(
    private readonly httpService: HttpService,
    private enumService: EnumService,
    private hasuraService: HasuraService,
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

  async getFacilitators(body: any) {
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

    filterQueryArray.unshift('{core_faciltator: {}}');

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

        users (where: ${filterQuery}) {
          id
          first_name
          last_name
          email_id
          dob
          gender
          village
          block
          district
          state
          core_faciltator {
            pan_no
          }
          program_faciltators {
            id
            has_social_work_exp
            form_step_number
            status
            status_reason
            program {
              id
              name
            }
          }
          qualifications {
            institution
            qualification_master {
              name
            }
          }
          experience {
            type
            experience_in_years
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
