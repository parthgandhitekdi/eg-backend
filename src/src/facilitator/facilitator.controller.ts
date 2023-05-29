import { Body, Controller, Post, Req, UsePipes, ValidationPipe } from '@nestjs/common';

import { FacilitatorService } from './facilitator.service';

import { FilterFacilitatorDto } from './dto/filter-facilitator.dto'

@Controller('/facilitators')
export class FacilitatorController {
    public url = process.env.HASURA_BASE_URL;
    constructor(
      public facilitatorService: FacilitatorService,
    ) {}

    // @Post('/create')
    // create(@Body() createFacilitatorDto: CreateFacilitatorDto) {
    //   return this.facilitatorService.create(createFacilitatorDto);
    // }
  
    // @Post()
    // findAll(@Body() request: Record<string, any>) {
    //   return this.facilitatorService.findAll(request);
    // }
  
    // @Get(':id')
    // findOne(@Param('id') id: string) {
    //   return this.facilitatorService.findOne(+id);
    // }
  
    // @Patch(':id')
    // update(@Param('id') id: string, @Body() request: Record<string, any>) {
    //   return this.facilitatorService.update(+id, request);
    // }
  
    // @Delete(':id')
    // remove(@Param('id') id: string) {
    //   return this.facilitatorService.remove(+id);
    // }

    @Post('/')
    @UsePipes(ValidationPipe)
    async getFacilitators(
      @Req() req: any,
      @Body() body: FilterFacilitatorDto
    ) {
      return this.facilitatorService.getFacilitators(req, body);
    }
}
