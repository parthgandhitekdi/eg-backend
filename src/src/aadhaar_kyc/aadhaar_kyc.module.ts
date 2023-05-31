import { Module } from '@nestjs/common';
import { AadhaarKycService } from './aadhaar_kyc.service';

@Module({
  providers: [AadhaarKycService],
  exports:[AadhaarKycService]
})
export class AadhaarKycModule {}
