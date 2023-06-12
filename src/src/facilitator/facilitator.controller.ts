import {
	Body,
	Controller,
	Delete,
	Param,
	Patch,
	Post,
	Req,
	Res,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { FilterFacilitatorDto } from './dto/filter-facilitator.dto';
import { AuthGuard } from '../modules/auth/auth.guard';
import { FacilitatorService } from './facilitator.service';

@UseInterceptors(SentryInterceptor)
@Controller('/facilitators')
export class FacilitatorController {
	public url = process.env.HASURA_BASE_URL;
	constructor(public facilitatorService: FacilitatorService) { }

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

	@Post('/forOrientation')
	@UseGuards(new AuthGuard())
	async getFacilitatorsForOrientation(
		@Req() request: any,
		@Body() body: any,
		@Res() response: any
	) {
		return this.facilitatorService.getFacilitatorsForOrientation(request, body, response);
	}

	@Delete('/experience/:id')
	@UseGuards(new AuthGuard())
	removeExperience(
		@Param('id') id: string,
		@Req() request: any,
		@Res() response: any
	) {
	  return this.facilitatorService.removeExperience(+id, request, response);
	}

	@Patch(':id')
	@UseGuards(new AuthGuard())
	update(
		@Param('id') id: string,
		@Body() body: Record<string, any>,
		@Res() response: any
	) {
		return this.facilitatorService.update(+id, body, response);
	}

	@Post('/')
	@UsePipes(ValidationPipe)
	async getFacilitators(@Req() req: any, @Body() body: FilterFacilitatorDto) {
		return this.facilitatorService.getFacilitators(req, body);
	}
}
