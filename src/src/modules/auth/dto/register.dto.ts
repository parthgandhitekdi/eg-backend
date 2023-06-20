import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDTO {
	@IsNotEmpty()
	first_name: string;

	last_name: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(10)
	@Matches(/^[6-9]\d{9}$/)
	mobile: number;

	email_id: string;

	@IsNotEmpty()
	role: string;

	@IsNotEmpty()
	role_fields: {};

	// @IsString()
	// @IsNotEmpty()
	// @Matches(/^(19|20)\d\d[-/.](0[1-9]|1[012])[-/.](0[1-9]|[12]\d|3[01])$/)
	// dob: string;
}
