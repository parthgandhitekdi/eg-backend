import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptEventDto {

    @IsString()
    @IsNotEmpty()
    public rsvp: string;
}