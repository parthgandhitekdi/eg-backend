import { IsNotEmpty, IsString } from 'class-validator';

export class AadharVerified {
	@IsString()
	@IsNotEmpty()
	public aadhar_verified: string;

	@IsString()
	@IsNotEmpty()
	public aadhaar_verification_mode: string;
}