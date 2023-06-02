import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { QueryGeneratorService } from './queryGenerator.service';
import { UserHelperService } from './userHelper.service';

@Module({
	imports: [HttpModule],
	providers: [UserHelperService, QueryGeneratorService],
	exports: [UserHelperService, QueryGeneratorService],
})
export class HelperModule {}
