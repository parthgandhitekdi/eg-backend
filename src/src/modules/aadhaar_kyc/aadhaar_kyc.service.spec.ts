import { Test, TestingModule } from '@nestjs/testing';
import { AadhaarKycService } from './aadhaar_kyc.service';

describe('AadhaarKycService', () => {
	let service: AadhaarKycService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [AadhaarKycService],
		}).compile();

		service = module.get<AadhaarKycService>(AadhaarKycService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
