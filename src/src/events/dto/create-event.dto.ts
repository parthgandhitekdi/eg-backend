// src/articles/dto/create-article.dto.ts
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateEventDto {

    @IsString()
    @IsNotEmpty()
    public start_date: string;

    @IsString()
    @IsNotEmpty()
    public name: string;
    
    @IsString()
    @IsNotEmpty()
    public end_date: string;

    @IsString()
    @IsNotEmpty()
    public end_time: string;

    @IsString()
    @IsNotEmpty()
    public location: string;

    @IsString()
    @IsNotEmpty()
    public location_type: string;

    @IsString()
    @IsNotEmpty()
    public start_time: string;

    public created_by: string;

    public updated_by: string;

    @IsString()
    @IsNotEmpty()
    public type: string;

    @IsArray()
    @IsNotEmpty()
    public reminders: [];
    
}
