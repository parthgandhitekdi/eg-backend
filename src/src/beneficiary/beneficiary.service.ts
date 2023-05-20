import { HttpService } from '@nestjs/axios';
import {
    Injectable,
    BadRequestException,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import { lastValueFrom, map } from 'rxjs';
import { UserHelperService } from '../helper/userHelper.service';
import { HasuraService } from '../hasura/hasura.service';

@Injectable()
export class BeneficiaryService {
  public url = process.env.HASURA_BASE_URL;
  constructor(
    private readonly httpService: HttpService,
    private helper: UserHelperService,
    private hasuraService: HasuraService,
  ) {
  }

  public async registerBeneficiary(body) {
    const axios = require('axios');
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
    const adminResult = await this.helper.getAdminKeycloakToken();
    
    if (adminResult?.data?.access_token) {
      var config = {
        method: 'post',
        url: `${process.env.KEYCLOAK_URL}/admin/realms/eg-sso/users`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminResult.data.access_token}`,
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
            },
          };
        } else {
          throw new BadRequestException('Error while generating admin token !');
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

  async create(req: any, update = false) {
    let i = 0,
    response = [];
    let objKey = Object.keys(req);
    const userArr = [
      'first_name',
      'last_name',
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
      'grampanchayat'
    ];
    let user_id = req?.id ? req?.id : null;
    const keyExist = userArr.filter((e) => objKey.includes(e));
    if (keyExist.length > 0) {
      const tableName = 'users';
      const newR = await this.hasuraService.q(tableName, req, userArr, update);
      user_id = newR[tableName]?.id ? newR[tableName]?.id : user_id;
      response[i++] = newR;
    }
    if (user_id) {
      const extendedUserArr = [
        'user_id',
        'social_category',
        'marital_status'
      ];
      const extendedUserkeyExist = extendedUserArr.filter((e) => objKey.includes(e));
      if (extendedUserkeyExist.length > 0) {
        response[i++] = await this.hasuraService.q(
          'extended_users',
          {
            ...req,
            id: req?.extended_users?.id ? req?.extended_users?.id : null,
            user_id,
          },
          extendedUserArr,
          update,
        );
      }
      const coreBeneficiariesArr = [
        'type_of_learner',
        'last_standard_of_education_year',
        'last_standard_of_education',
        'reason_of_leaving_education',
        'user_id',
        'connect_via_refrence',
        'mobile_ownership',
        'last_school_type',
        'previous_school_type',
        'enrollement_status',
        'document_id',
        'device_type',
        'device_ownership',
        'enrolled_for_board',
        'career_aspiration',
        'learner_wish_to_pursue_education'
      ];
      const coreBeneficiarieskeyExist = coreBeneficiariesArr.filter((e) => objKey.includes(e));
      if (coreBeneficiarieskeyExist.length > 0) {
        response[i++] = await this.hasuraService.q(
          'core_beneficiaries',
          {
            ...req,
            id: req?.core_beneficiaries?.id
              ? req?.core_beneficiaries?.id
              : null,
            user_id: user_id,
          },
          coreBeneficiariesArr,
          update,
        );
      }
    }
    return this.userById(user_id);
  }

  async newCreate(req: any) {
    const tableName = 'users';
    const newR = await this.hasuraService.q(tableName, req, [
      'first_name',
      'last_name',
      'mobile',
      'keycloak_id',
    ]);
    const user_id = newR[tableName]?.id;
    if (user_id) {
      await this.hasuraService.q(`beneficiaries`, { ...req, user_id }, [
        'facilitator_id',
        'user_id',
      ]);
      await this.hasuraService.q(`core_beneficiaries`, { ...req, user_id }, [
        'device_ownership',
        'device_type',
        'user_id',
      ]);
    }
    return await this.userById(user_id);
  }

  async userById(id: any) {
    var data = {
      query: `query searchById {        
        users_by_pk(id: ${id}) {
          id
          first_name
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
          beneficiaries {
            beneficiaries_found_at
            created_by
            facilitator_id
            id
            program_id
            rsos_id
            updated_by
          }
          core_beneficiaries {
            career_aspiration
            updated_by
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
        }}`,
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
    let result = response?.data?.users_by_pk;
    if (result?.beneficiaries && result?.beneficiaries[0]) {
      result.beneficiaries = result.beneficiaries[0];
    } else {
      result = { ...result, beneficiaries: {} };
    }
    let mappedResponse = result;

    return {
      message: 'User data fetched successfully.',
      data: mappedResponse,
    };
  }
}
