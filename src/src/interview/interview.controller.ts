import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	UseInterceptors,
} from '@nestjs/common';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InterviewService } from './interview.service';

@UseInterceptors(SentryInterceptor)
@Controller('interview')
export class InterviewController {
	constructor(private readonly interviewService: InterviewService) {}

	@Post('/createinterview')
	create(@Body() createInterviewDto: CreateInterviewDto) {
		return this.interviewService.create(createInterviewDto);
	}

	@Get()
	findAll(@Body() request: Record<string, any>) {
		return this.interviewService.findAll(request);
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.interviewService.findOne(+id);
	}

	@Patch(':id')
	update(@Param('id') id: string, @Body() request: Record<string, any>) {
		return this.interviewService.update(+id, request);
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.interviewService.remove(+id);
	}
}
