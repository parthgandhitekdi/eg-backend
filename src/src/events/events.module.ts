import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { UserModule } from 'src/user/user.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';


@Module({
  imports: [UserModule,HasuraModule,HasuraModuleFromServices],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
