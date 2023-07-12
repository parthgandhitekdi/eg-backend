import {
	Body,
	Controller,
	Delete,
	Get,
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
import { Request, Response } from 'express';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { AcceptEventDto } from './dto/accept-event.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@UseInterceptors(SentryInterceptor)
@Controller('events')
export class EventsController {
	constructor(private readonly eventsService: EventsService) {}

	@Post('/create')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	create(
		@Body() createEventDto: CreateEventDto,
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.eventsService.create(createEventDto, header, response);
	}

	@Get('/list')
	@UseGuards(new AuthGuard())
	getEventsList(
		@Req() header: Request,
		@Res() response: Response,
	) {
		return this.eventsService.getEventsList( header, response);
	}

	@Post()
	findAll(@Body() request: Record<string, any>) {
		return this.eventsService.findAll(request);
	}

	@Get(':id')
	@UseGuards(new AuthGuard())
	findOne(@Param('id') id: string, @Res() response: Response) {
		return this.eventsService.findOne(+id, response);
	}

	@Patch(':id')
	@UseGuards(new AuthGuard())
	update(
		@Param('id') id: string,
		@Req() header: Request,
		@Body() request: Record<string, any>,
		@Res() response: Response,
	) {
		return this.eventsService.update(+id, header, request, response);
	}

	@Patch('/accept/:id')
	@UseGuards(new AuthGuard())
	@UsePipes(ValidationPipe)
	updateEventAcceptDetail(
		@Param('id') id: string,
		@Body() request: AcceptEventDto,
		@Res() response: Response,
	) {
		return this.eventsService.updateEventAcceptDetail(
			+id,
			{rsvp:request.rsvp},
			response,
		);
	}

	@Patch('/attendance/:id')
	@UseGuards(new AuthGuard())
	updateAttendanceDetail(
		@Param('id') id: string,
		@Body() request: string,
		@Res() response: Response,
	) {
		return this.eventsService.updateAttendanceDetail(
			+id,
			request,
			response,
		);
	}

	@Delete(':id')
	@UseGuards(new AuthGuard())
	remove(@Param('id') id: string,@Req() header: Request,@Res() response: Response) {
		return this.eventsService.remove(+id,header,response);
	}
}
