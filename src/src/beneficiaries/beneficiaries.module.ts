import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { BeneficiariesController } from './beneficiaries.controller';

import { BeneficiariesService } from './beneficiaries.service';
import { HttpModule } from '@nestjs/axios';

import { HasuraModule } from '../hasura/hasura.module';
import { HelperModule } from '../helper/helper.module';
import { KeycloakModule } from '../services/keycloak/keycloak.module';
import { HasuraModule as HasuraModuleFromServices } from '../services/hasura/hasura.module';

@Module({
  imports:[UserModule, HttpModule, HasuraModule, HelperModule, KeycloakModule, HasuraModuleFromServices],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService]
})
export class BeneficiariesModule {}
