import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res } from '@nestjs/common';
import { EnumService } from './enum.service';

@Controller('enum')
export class EnumController {
  constructor(private readonly enumService: EnumService) {}
 
  @Get('/enum_value_list')
  getEnumValue(@Query('key') key: string,) {
    return this.enumService.getEnumValue(key);
  }

  @Get('/list')
  getAllEnums(@Res() res: Response) {
    return this.enumService.getAllEnums(res);
  }

}
