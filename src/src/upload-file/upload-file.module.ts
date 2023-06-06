import { Module } from '@nestjs/common';
import { HasuraModule } from 'src/services/hasura/hasura.module';
import { S3Module } from 'src/services/s3/s3.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { UploadFileController } from './upload-file.controller';
import { UploadFileService } from './upload-file.service';

@Module({
  controllers: [UploadFileController],
  providers: [UploadFileService],
  imports: [S3Module, HasuraModule,HasuraModuleFromServices]
})
export class UploadFileModule {}
