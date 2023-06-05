import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordAdminDTO {
	@IsNotEmpty()
	@IsString()
	@MinLength(1)
	public id: string;

	@IsNotEmpty()
	@IsString()
	public password: string;
}
