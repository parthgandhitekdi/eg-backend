import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';
import { Response } from 'express';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('/create')
  @UseGuards(new AuthGuard())
  @UsePipes(ValidationPipe)
  create(@Body() createEventDto: CreateEventDto, @Res() response: Response) {
    return this.eventsService.create(createEventDto);
  }

  @Post()
  findAll(@Body() request: Record<string, any>) {
    return this.eventsService.findAll(request);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() request: Record<string, any>) {
    return this.eventsService.update(+id, request);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(+id);
  }
}
