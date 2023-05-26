import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { Response } from 'express';
import { BeneficiariesService } from './beneficiaries.service';
import { RegisterBeneficiaryDto } from './dto/register-beneficiary.dto';

import { StatusUpdateDTO } from './dto/status-update.dto';
@Controller('beneficiaries')
export class BeneficiariesController {

  constructor(private beneficiariesService:BeneficiariesService){}

    // @Get('/list')
    // public async getAgList(
    //   @Body() request: Record<string, any>,
    //   @Req() req:any
    // ) {
    //    return this.beneficiariesService.getAgList(request,req);
    // }
    
  // @Post('/create')
  // create(@Body() createEventDto: CreateEventDto) {
  //   return this.beneficiariesService.create(createEventDto);
  // }

  @Post()
  findAll(@Body() request: Record<string, any>,
  @Req() req:any, @Res() response: Response) {
    return this.beneficiariesService.findAll(request,req,response);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Res() response: Response) {
    return this.beneficiariesService.findOne(+id,response);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.beneficiariesService.remove(+id);
  }

  @Post('/register')
  @UsePipes(ValidationPipe)
  private async registerBeneficiary (
      @Body() body: RegisterBeneficiaryDto,
      @Req() request:any
  ) {
      return this.beneficiariesService.registerBeneficiary(body, request);
  }

  @Patch(':id')
  public async updateBeneficiary(
    @Param('id') id: string,
    @Body() req: Record<string, any>,
    @Req() request:any
  ) {
      return this.beneficiariesService.create({ ...req, id: id }, true, request);
  }
  
  @Put('statusUpdate')
  @UsePipes(ValidationPipe)
  statusUpdate( @Body() request: StatusUpdateDTO) {
    return this.beneficiariesService.statusUpdate( request);
  }
}
