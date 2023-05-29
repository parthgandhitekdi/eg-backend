import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { CreateSubjectsDto } from './dto/create-subjects.dto';
import { UpdateSubjectsDto } from './dto/update-subjects.dto';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly SubjectsService: SubjectsService) {}

  // @Post('/create')
  // create(@Body() createSubjectsDto: CreateSubjectsDto) {
  //   return this.SubjectsService.create(createSubjectsDto);
  // }

  @Post()
  findAll(@Body() request: Record<string, any>) {
    return this.SubjectsService.findAll(request);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.SubjectsService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() request: Record<string, any>) {
  //   return this.SubjectsService.update(+id, request);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.SubjectsService.remove(+id);
  // }
}
