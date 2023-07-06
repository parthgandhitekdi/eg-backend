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
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { BeneficiariesService } from './beneficiaries.service';
import { RegisterBeneficiaryDto } from './dto/register-beneficiary.dto';
import { StatusUpdateDTO } from './dto/status-update.dto';

@UseInterceptors(SentryInterceptor)
@Controller('beneficiaries')
export class BeneficiariesController {
	constructor(private beneficiariesService: BeneficiariesService) {}

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
	@UseGuards(new AuthGuard())
	findAll(
		@Body() request: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.beneficiariesService.findAll(request, req, response);
	}

	@Post('/admin/list')
	@UseGuards(new AuthGuard())
	findAllAgForIp(
		@Body() request: Record<string, any>,
		@Req() req: any,
		@Res() response: Response,
	) {
		return this.beneficiariesService.getList(request, req, response);
	}

	@Get('/getStatuswiseCount')
	getStatuswiseCount(@Req() request: any, @Res() response: Response) {
		return this.beneficiariesService.getStatuswiseCount(request, response);
	}

	@Get(':id')
	@UseGuards(new AuthGuard())
	findOne(@Param('id') id: string, @Res() response: Response) {
		return this.beneficiariesService.findOne(+id, response);
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.beneficiariesService.remove(+id);
	}

	@Post('/register')
	@UsePipes(ValidationPipe)
	private async registerBeneficiary(
		@Body() body: RegisterBeneficiaryDto,
		@Req() request: any,
	) {
		return this.beneficiariesService.registerBeneficiary(body, request);
	}

	@Patch(':id')
	@UseGuards(new AuthGuard())
	public async updateBeneficiary(
		@Param('id') id: string,
		@Body() req: Record<string, any>,
		@Req() request: any,
		@Res() response: any,
	) {
		return this.beneficiariesService.create(
			{ ...req, id: id },
			request,
			response,
			true,
		);
	}

	@Put('statusUpdate')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	async statusUpdate(
		@Body() body: StatusUpdateDTO,
		@Res() response: any,
		@Req() request: any,
	) {
		const result = await this.beneficiariesService.statusUpdate(
			body,
			request,
		);
		return response.status(result.status).json({
			success: result.success,
			message: result.message,
			data: result.data,
		});
	}
}
