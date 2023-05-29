import { Injectable } from '@nestjs/common';
import { CreateSubjectsDto } from './dto/create-subjects.dto';
import { UpdateSubjectsDto } from './dto/update-subjects.dto';
import { HasuraService } from 'src/hasura/hasura.service';

@Injectable()
export class SubjectsService {
  public table = 'subjects';
  public fillable = [
    'name',
    'language_or_medium',
    'board',
    'created_by',
    'updated_by',
    'code',
  ];
  public returnFields = [
    'id',
    'name',
    'language_or_medium',
    'board',
    'created_by',
    'updated_by',
    'code',
  ];
  constructor(private readonly hasuraService: HasuraService) {}
  // create(req: any) {
  //   return this.hasuraService.create(this.table, req, this.returnFields);
  // }

  findAll(request: any) {
    return this.hasuraService.getAll(this.table, this.returnFields, request);
  }

  // findOne(id: number) {
  //   return this.hasuraService.getOne(+id, this.table, this.returnFields);
  // }

  // update(id: number, req: any) {
  //   return this.hasuraService.update(+id, this.table, req, this.returnFields);
  // }

  // remove(id: number) {
  //   return this.hasuraService.delete(this.table, { id: +id });
  // }
}
