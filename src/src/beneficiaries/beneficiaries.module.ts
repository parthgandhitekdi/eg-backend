import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { BeneficiariesController } from './beneficiaries.controller';

import { HttpModule } from '@nestjs/axios';
import { S3Module } from 'src/services/s3/s3.module';
import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';
import { KeycloakModule } from '../services/keycloak/keycloak.module';
import { BeneficiariesService } from './beneficiaries.service';

@Module({
  imports:[UserModule, HttpModule, HasuraModule, HelperModule, KeycloakModule, HasuraModuleFromServices, S3Module],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService]
})
export class BeneficiariesModule {}
