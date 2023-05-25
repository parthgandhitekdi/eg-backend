import {
    IsNotEmpty, IsString, Matches, MinLength
} from 'class-validator';

export class UserExistDTO {
    @IsString()
    @MinLength(10)
    @Matches(/^[6-9]\d{9}$/)
    // Should start with 6
    public mobile: string;

    @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    email_id: string

    @IsString()
    public aadhar_token: string;

}
