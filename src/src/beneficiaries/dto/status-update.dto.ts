import {
    IsNotEmpty, IsString
} from 'class-validator';

export class StatusUpdateDTO {
    @IsString()
    @IsNotEmpty()
    public user_id: string;

    @IsString()
    @IsNotEmpty()
    public status: string;
}