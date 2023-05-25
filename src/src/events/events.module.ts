import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { HasuraModule } from 'src/services/hasura/hasura.module';


@Module({
  imports: [HasuraModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
