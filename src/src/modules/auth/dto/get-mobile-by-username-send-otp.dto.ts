import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class GetMobileByUsernameSendOtpDTO {
	@IsString()
	@IsNotEmpty()
	public username: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(6)
	@Matches(/^\d{6}$/)
	public otp: string;

	@IsString()
	@IsNotEmpty()
	public reason: string;

	@IsString()
	@IsNotEmpty()
	public hash: string;

	@IsNotEmpty()
	@IsString()
	public password: string;
}
