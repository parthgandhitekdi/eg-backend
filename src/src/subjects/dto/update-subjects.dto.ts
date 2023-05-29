import { PartialType } from '@nestjs/mapped-types';
import { CreateSubjectsDto } from './create-subjects.dto';

export class UpdateSubjectsDto extends PartialType(CreateSubjectsDto) {}
