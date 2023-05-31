import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AadhaarKycModule } from './aadhaar_kyc/aadhaar_kyc.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttendancesModule } from './attendances/attendances.module';
import { AuthModule } from './auth/auth.module';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { EnumModule } from './enum/enum.module';
import { EventsModule } from './events/events.module';
import { FacilitatorModule } from './facilitator/facilitator.module';
import { GeolocationController } from './geolocation.controller';
import { GeolocationService } from './geolocation.service';
import { HasuraModule } from './hasura/hasura.module';
import { HelperModule } from './helper/helper.module';
import { InterviewModule } from './interview/interview.module';
import { KeycloakModule } from './services/keycloak/keycloak.module';
import { S3Module } from './services/s3/s3.module';
import { SubjectsModule } from './subjects/subjects.module';
import { UploadFileModule } from './upload-file/upload-file.module';
import { UserModule } from './user.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    {
      ...HttpModule.register({}),
      global: true,
    },
    HelperModule,
    EnumModule,
    BeneficiariesModule,
    AuthModule,
    UserModule,
    InterviewModule,
    KeycloakModule,
    FacilitatorModule,
    EventsModule,
    HasuraModule,
    S3Module,
    UploadFileModule,
    AttendancesModule,
    KeycloakModule,
    AadhaarKycModule,
    SubjectsModule,
  ],
  controllers: [AppController, GeolocationController],
  providers: [AppService, GeolocationService],
})
export class AppModule {}
