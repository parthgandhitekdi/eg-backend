import { Module } from '@nestjs/common';
import { HelperModule } from 'src/helper/helper.module';
import { HasuraService } from './hasura.service';

@Module({
  imports: [HelperModule],
  providers: [HasuraService],
  exports: [HasuraService]
})
export class HasuraModule {}
