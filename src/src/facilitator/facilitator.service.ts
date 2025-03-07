import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';
import { EnumService } from '../enum/enum.service';

@Injectable()
export class FacilitatorService {
  public url = process.env.HASURA_BASE_URL;
  constructor(
    private readonly httpService: HttpService,
    private enumService: EnumService
  ) {
  }

  allStatus = this.enumService.getEnumValue('FACILITATOR_STATUS').data;

  private isValidString(str: String) {
    return typeof str === 'string' && str.trim();
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
      filterQueryArray.push('{user: {qualifications: {qualification_master_id: {_in: $qualificationIds}}}}');
      variables.qualificationIds = body.qualificationIds;
    }

    if (
      body.hasOwnProperty('status')
      && this.isValidString(body.status)
      && this.allStatus.map(obj => obj.value).includes(body.status)
    ) {
      paramsQueryArray.push('$status: String');
      filterQueryArray.push('{user: {program_faciltators: {status: {_eq: $status}}}}');
      variables.status = body.status;
    }

    if (
      body.hasOwnProperty('district')
      && this.isValidString(body.district)
    ) {
      paramsQueryArray.push('$district: String');
      filterQueryArray.push('{user: {district: { _eq: $district }}}');
      variables.district = body.district.toUpperCase();
    }

    let filterQuery = '{ _and: [' + filterQueryArray.join(',') + '] }';
    let paramsQuery = '';
    if (paramsQueryArray.length) {
      paramsQuery = '(' + paramsQueryArray.join(',') + ')';
    }

    const data = {
      query: `query MyQuery ${paramsQuery} {
        core_faciltators_aggregate {
          aggregate {
            count
          }
        }
        core_faciltators (where: ${filterQuery}) {
          id
          pan_no
          user {
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
        }
      }`,
      variables: variables
    };

    const response = await lastValueFrom(
      this.httpService
        .post(this.url, data, {
          headers: {
            'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
            'Content-Type': 'application/json',
          },
        })
        .pipe(map((res) => res.data)),
    );

    let mappedResponse = response?.data?.core_faciltators;
    
    if (
      mappedResponse
      && body.hasOwnProperty('work_experience')
      && this.isValidString(body.work_experience)
    ) {
      const isValidNumberFilter = !isNaN(parseInt(body.work_experience)) || body.work_experience === '5+';
      if (isValidNumberFilter) {
        mappedResponse = mappedResponse.filter(facilitator => {
          if (facilitator.user?.experience && facilitator.user?.experience.length) {
            const sum = facilitator.user?.experience.reduce((acc, curr) => {
              if (curr.type === 'experience') {
                acc += parseInt(curr.experience_in_years);
              }
              return acc;
            }, 0);
            if (body.work_experience === '5+' && sum > 5) {
              return true;
            } else if (parseInt(body.work_experience) === sum) {
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        });
      }
    }

    if (
      mappedResponse
      && body.hasOwnProperty('vo_experience')
      && this.isValidString(body.vo_experience)
    ) {
      const isValidNumberFilter = !isNaN(parseInt(body.vo_experience)) || body.vo_experience === '5+';
      if (isValidNumberFilter) {
        mappedResponse = mappedResponse.filter(facilitator => {
          if (facilitator.user?.experience && facilitator.user?.experience.length) {
            const sum = facilitator.user?.experience.reduce((acc, curr) => {
              if (curr.type === 'vo_experience') {
                acc += parseInt(curr.experience_in_years);
              }
              return acc;
            }, 0);
            if (body.vo_experience === '5+' && sum > 5) {
              return true;
            } else if (parseInt(body.vo_experience) === sum) {
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        });
      }
    }

    let responseWithPagination = mappedResponse.slice(skip, skip + limit);

    responseWithPagination = responseWithPagination.map(obj => {
        const user_id = obj.user.id;
        delete obj.user.id;
        const res = {
            ...obj,
            'user_id': user_id,
            ...obj.user     
        };
        delete res.user;
        return res;
    });

    const count = mappedResponse.length;
    const totalPages = Math.ceil(count / limit);

    return {
      statusCode: 200,
      message: 'Ok.',
      totalCount: count,
      data: responseWithPagination,
      limit,
      currentPage: page,
      totalPages: `${totalPages}`,
    };
  }
}
