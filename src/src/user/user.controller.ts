import { HttpService } from '@nestjs/axios';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    Post,
    Put,
    Query,
    Req,
    Res, UseInterceptors, UsePipes,
    ValidationPipe
} from '@nestjs/common';
import { Response } from 'express';
import { lastValueFrom, map } from 'rxjs';
import { HasuraService } from '../hasura/hasura.service';
import { CreateUserDto } from '../helper/dto/create-user.dto';
import { RegisterFacilitatorDto } from '../helper/dto/register-facilitator.dto';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { UserService } from './user.service';


@UseInterceptors(SentryInterceptor)
@Controller('/users')
export class UserController {
  public url = process.env.HASURA_BASE_URL;
  constructor(
    private readonly httpService: HttpService,
    public hasuraService: HasuraService,
    public userService: UserService,
  ) {}

  @Get('/qualification')
  async getQualifications() {
    const data = await lastValueFrom(
      this.httpService
        .post(
          this.url,
          {
            query: `query MyQuery {
              qualification_masters {
                id
                name
                type
              }
            }`,
          },
          {
            headers: {
              'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
              'Content-Type': 'application/json',
            },
          },
        )
        .pipe(map((res) => res.data)),
    );
    return {
      statusCode: 200,
      message: 'Ok.',
      data: this.hasuraService.getResponce(
        data,
        'qualification_masters',
        'data',
      ),
    };
  }

  // users/create API
  @Post('/create')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  public async create(@Body() req: CreateUserDto) {
    return this.userService.create(req);
  }

  @Put('/update/:id')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  public async update(
    @Param('id') id: number,
    @Body() req: Record<string, any>,
  ) {
    return this.userService.create({ ...req, id: id }, true);
  }

  // users/list API filter pagination
  @Post('/list')
  public async searchAttendance(
    @Body() request: Record<string, any>,
    @Req() req: any,
  ) {
    return this.userService.list(request, req);
  }

  // users/list by ID API filter pagination
  @Get('/info/:id')
  public async searchById(@Param('id') id: number, @Res() response: Response) {
    return this.userService.userById(id,response);
  }

  // users/is_user_exist by mobile and adhaar etc filter.
  @Post('/is_user_exist')
  public async isUserExist(@Body() req: Record<string, any>) {
    return this.userService.isUserExist(req);
  }

  // users/update_facilitator/:id update facilitator status.
  @Put('update_facilitator/:id')
  public async updateUser(
    @Param('id') id: string,
    @Body() req: Record<string, any>,
  ) {
    return this.userService.update(id, req, 'program_faciltators');
  }

  // users/login by username and password.
  @Post('/login')
  login(
    @Query('username') username: string,
    @Query('password') password: string,
    @Res() response: Response,
  ) {
    return this.userService.login(username, password, response);
  }

  // users/ip_user_info by auth token.
  @Get('/ip_user_info')
  ipUserInfo(@Req() request: Request) {
    return this.userService.ipUserInfo(request);
  }

  @Get('/organization/:id')
  organizationInfo(@Param('id') id: string) {
    return this.userService.organizationInfo(id);
  }

  // users/register on keycloak and hasura both side.
  @Post('/register')
  @HttpCode(200)
  @UsePipes(ValidationPipe)
  public async register(
    @Body() body: RegisterFacilitatorDto,
    @Req() request: Request,
  ) {
    return this.userService.register(body, request);
  }
}
