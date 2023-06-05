import { IsNotEmpty, IsString } from 'class-validator';

export class UserOtpSendDTO {
	@IsString()
	@IsNotEmpty()
	public username: string;

	@IsString()
	@IsNotEmpty()
	public reason: string;
}
