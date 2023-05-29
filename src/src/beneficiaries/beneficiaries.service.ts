import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user.service';
import { HasuraService } from '../hasura/hasura.service';
import { UserHelperService } from '../helper/userHelper.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';
import { KeycloakService } from '../services/keycloak/keycloak.service';
@Injectable()
export class BeneficiariesService {
    public url = process.env.HASURA_BASE_URL;

 
    constructor(
       
      private readonly httpService: HttpService,
      private userService:UserService,
      private helper: UserHelperService,
      private hasuraService: HasuraService,
      private hasuraServiceFromServices: HasuraServiceFromServices,
      private keycloakService: KeycloakService,
      private configService: ConfigService
    ){}

    public returnFields=[
        "status",
        "user_id",
        "enrollment_number",
        "beneficiaries_found_at",
        "documents_status",
        "enrollment_status",
        "enrolled_for_board",
        "type_of_enrollement",
        "academic_year_id",
        "payment_receipt_document_id",
        "facilitator_id",
        "documents_status",
        "program_id",
        "reason_for_status_update",   
        "created_by",
        "updated_by",
        
    ]
      
    public async findAll(body: any,req:any,resp:any) {
        const user=await this.userService.ipUserInfo(req)
            const { status,sortType } = body;
            const page = body.page ? body.page : '1';
            const limit = body?.limit ? body?.limit : '10';
        
            let offset = 0;
            if (page > 1 && limit) {
              offset = parseInt(limit) * (page - 1);
            }
            let query =''
        if(status){
          let query = `{beneficiaries:{status:{_eq:${status}}}}`;
        }
            var data={
                query:`query MyQuery($limit:Int, $offset:Int) {
                    users_aggregate( where:   
                        {
                          _and: [
                              {
                                beneficiaries: {facilitator_id: {_eq: ${user.data.id}}}
                              },
                             ${query}
                                                  
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
                              beneficiaries: {facilitator_id: {_eq: ${user.data.id}}}
                            },
                            ${query} 
                            
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
                        beneficiaries{
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
                        documents_status
                          updated_by
                          user_id
                          facilitator_id
                          created_by
                          beneficiaries_found_at
                          }
                      core_beneficiaries {
                        career_aspiration
                        connect_via_refrence
                        created_by
                        device_ownership
                        enrollement_status
                        enrolled_for_board
                        document_id
                        device_type
                        status
                        reason_of_leaving_education
                        previous_school_type
                        mobile_ownership
                        learner_wish_to_pursue_education
                        last_standard_of_education_year
                        last_standard_of_education
                        last_school_type
                        id
                        updated_by
                        type_of_learner
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
                    
                         
                  }`
            }
            const response = await this.hasuraServiceFromServices.getData(data);
            let result = response?.data?.users;
        
            let mappedResponse = result;
            const count = response?.data?.users_aggregate?.aggregate?.count;
            const totalPages = Math.ceil(count / limit);
        
            if(!mappedResponse || mappedResponse.length<1){
              return resp.status(404).send({
                success: false,
                status: 'Not Found',
                message: 'Benificiaries Not Found',
                data: {},
              });
            }else {
                  return  resp.status(200).json({
                    success: true,
                    message: 'Benificiaries found successfully!',
                    data: {
                      totalCount: count,
                    data: mappedResponse?.map((e) => ({
                      ...e,
                      ['program_faciltators']: e?.['program_faciltators']?.[0],
                    })),
                    limit,
                    currentPage: page,
                    totalPages: `${totalPages}`,
                    },
            })
            }
            
          }    


 public async findOne(id: number,resp:any) {
     var data={
        query:`query searchById {
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
              documents_status
                updated_by
                user_id
                facilitator_id
                created_by
                beneficiaries_found_at
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
            }
          }
          `        
        }

        const response = await this.hasuraServiceFromServices.getData(data);
          let result = response?.data?.users_by_pk;
if(!result){
return resp.status(404).send({
    success: false,
    status: 'Not Found',
    message: 'Benificiaries Not Found',
    data: {},
  });

}else {
     return  resp.status(200).json({
        success: true,
        message: 'Benificiaries found successfully!',
        data: {result:result},
})
          
     }
    }
     
     
  

  update(id: number, req: any) {
    // return this.hasuraService.update(+id, this.table, req, this.returnFields);
  }

  remove(id: number) {
    // return this.hasuraService.delete(this.table, { id: +id });
  }
  
 public async statusUpdate(req:any){
  return await this.hasuraService.update(req.id, 'beneficiaries',req,this.returnFields,[...this.returnFields,"id"]);

  }

  public async registerBeneficiary(body, request) {
    const user=await this.userService.ipUserInfo(request);
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
      const { headers, status } = await this.keycloakService.createUser(data_to_create_user);
      
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
  }

  async create(req: any, request, response, update = false) {
    const user=await this.userService.ipUserInfo(request);
    const { data: beneficiaryUser} = await this.userById(req.id);
    const user_id = req?.id;
    const PAGE_WISE_UPDATE_TABLE_DETAILS = {
      'edit_basic': {
        'users': [
          'first_name',
          'last_name',
          'middle_name',
          'dob'
        ]
      },
      'add_contact': {
        'core_beneficiaries': [
          'user_id',
          'device_ownership',
          'device_type'
        ]
      },
      'edit_contact': {
        'users': [
          'mobile',
          'alternative_mobile_number',
          'email_id'
        ],
        'core_beneficiaries': [
          'user_id',
          'mark_as_whatsapp_number',
          'device_ownership',
          'device_type',
          'alternative_device_ownership',
          'alternative_device_type'
        ]
      },
      'add_address': {
        'users': [
          'lat',
          'long',
          'state',
          'district',
          'block',
          'village',
          'grampanchayat',
        ]
      },
      'edit_address': {
        'users': [
          'state',
          'district',
          'block',
          'village',
          'grampanchayat',
          'address'
        ]
      },
      'personal': {
        'extended_users': [
          'user_id',
          'social_category',
          'marital_status'
        ]
      },
      'edit_family': {
        'core_beneficiaries': [
          'user_id',
          'father_first_name',
          'father_middle_name',
          'father_last_name',
          'mother_first_name',
          'mother_middle_name',
          'mother_last_name'
        ]
      },
      'add_education': {
        'core_beneficiaries': [
          'user_id',
          'type_of_learner',
          'last_standard_of_education',
          'last_standard_of_education_year',
          'reason_of_leaving_education'
        ]
      },
      'edit_education': {
        'core_beneficiaries': [
          'user_id',
          'last_standard_of_education',
          'last_standard_of_education_year',
          'previous_school_type',
          'reason_of_leaving_education'
        ]
      },
      'edit_further_studies': {
        'core_beneficiaries': [
          'user_id',
          'career_aspiration',
          'career_aspiration_details'
        ]
      },
      'edit_enrollement':{
        'beneficiaries':[
          "enrollment_number",
          "user_id",
          "enrollment_status",
          "enrolled_for_board",
          "type_of_enrollement", 
          "subjects" ,
          "program_id",
          "facilitator_id",
          'academic_year_id',
          "payment_receipt_document_id"
        ]
      }
    }
    
    switch(req.edit_page_type) {
      case 'edit_basic': {
        // Update Users table data
        const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.edit_basic.users;
        const tableName = 'users';
        await this.hasuraService.q(tableName, req, userArr, update);
        break;
      }

      case 'add_contact': {
        // Update Core Beneficiaries table data
        const coreBeneficiaryArr = PAGE_WISE_UPDATE_TABLE_DETAILS.add_contact.core_beneficiaries;
        const tableName = 'core_beneficiaries';
        await this.hasuraService.q(
          tableName,
          {
            ...req,
            id: beneficiaryUser?.core_beneficiaries[0]?.id
              ? beneficiaryUser?.core_beneficiaries[0]?.id
              : null,
            user_id: user_id,
          },
          coreBeneficiaryArr,
          update
        );

        break;
      }
      
      case 'edit_contact': {
        // Update Users table data
        const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.edit_contact.users;
        let tableName = 'users';
        await this.hasuraService.q(tableName, req, userArr, update);

        // Update Core Beneficiaries table data
        const coreBeneficiaryArr = PAGE_WISE_UPDATE_TABLE_DETAILS.edit_contact.core_beneficiaries;
        tableName = 'core_beneficiaries';
        await this.hasuraService.q(
          tableName,
          {
            ...req,
            id: beneficiaryUser?.core_beneficiaries[0]?.id
              ? beneficiaryUser?.core_beneficiaries[0]?.id
              : null,
            user_id: user_id,
          },
          coreBeneficiaryArr,
          update
        );

        break;
      }

      case 'add_address': {
        // Update Users table data
        const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.add_address.users;
        let tableName = 'users';
        await this.hasuraService.q(tableName, req, userArr, update);
        break;
      }

      case 'edit_address': {
        // Update Users table data
        const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.edit_address.users;
        let tableName = 'users';
        await this.hasuraService.q(tableName, req, userArr, update);
        break;
      }

      case 'personal': {
        // Update Extended Users table data
        const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.personal.extended_users;
        let tableName = 'extended_users';
        await this.hasuraService.q(
          tableName,
          {
            ...req,
            id: beneficiaryUser?.extended_users[0]?.id
              ? beneficiaryUser?.extended_users[0]?.id
              : null,
            user_id,
          },
          userArr,
          update
        );
        break;
      }

      case 'edit_family': {
        // Update Core beneficiaries table data
        const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.edit_family.core_beneficiaries;
        let tableName = 'core_beneficiaries';
        await this.hasuraService.q(
          tableName,
          {
            ...req,
            id: beneficiaryUser?.core_beneficiaries[0]?.id
              ? beneficiaryUser?.core_beneficiaries[0]?.id
              : null,
            user_id,
          },
          userArr,
          update
        );
        break;
      }

      case 'add_education': {
        // Update Core beneficiaries table data
        const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.add_education.core_beneficiaries;
        let tableName = 'core_beneficiaries';
        await this.hasuraService.q(
          tableName,
          {
            ...req,
            id: beneficiaryUser?.core_beneficiaries[0]?.id
              ? beneficiaryUser?.core_beneficiaries[0]?.id
              : null,
            user_id,
          },
          userArr,
          update
        );
        break;
      }

      case 'edit_education': {
        // Update Core beneficiaries table data
        const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.edit_education.core_beneficiaries;
        let tableName = 'core_beneficiaries';
        await this.hasuraService.q(
          tableName,
          {
            ...req,
            id: beneficiaryUser?.core_beneficiaries[0]?.id
              ? beneficiaryUser?.core_beneficiaries[0]?.id
              : null,
            user_id,
          },
          userArr,
          update
        );
        break;
      }

      case 'edit_further_studies': {
        // Update Core beneficiaries table data
        const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.edit_further_studies.core_beneficiaries;
        let tableName = 'core_beneficiaries';
        await this.hasuraService.q(
          tableName,
          {
            ...req,
            id: beneficiaryUser?.core_beneficiaries[0]?.id
              ? beneficiaryUser?.core_beneficiaries[0]?.id
              : null,
            user_id,
          },
          userArr,
          update
        );
        break;
      }
      case 'edit_enrollement':{
        // Update enrollement data in Beneficiaries table 
                const userArr = PAGE_WISE_UPDATE_TABLE_DETAILS.edit_enrollement.beneficiaries;
              const programDetails=beneficiaryUser.beneficiaries.find((data) => req.id==data.user_id&&req.academic_year_id==data.academic_year_id)
              let tableName = 'beneficiaries';
             
                 await this.hasuraService.q(
                  tableName,
                  {
                  ...req,
                    id: programDetails?.id
                      ? programDetails.id
                      : null,
                    user_id: user_id,
        
                    subjects:JSON.stringify(req.subjects)
                  },
                  userArr,
                  update,
                );
                
              }  
        
    }
    const { data: updatedUser} = await this.userById(user_id);
    return response.status(200).json({
      success: true,
      message: "User data fetched successfully!",
      data: updatedUser
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
    let mappedResponse = result;
    return {
      message: 'User data fetched successfully.',
      data: mappedResponse,
    };
  }
}
