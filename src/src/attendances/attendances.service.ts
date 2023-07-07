import { Injectable } from '@nestjs/common';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { HasuraService } from 'src/hasura/hasura.service';

@Injectable()
export class AttendancesService {
  public table = 'attendance';
  public fillable = [
    'user_id',
    'context_id',
    'created_by',
    'updated_by',
    'date_time',
    'status',
    'lat',
    'long',
  ];
  public returnFields = [
    'id',
    'user_id',
    'context_id',
    'created_by',
    'updated_by',
    'date_time',
    'status',
    'lat',
    'long',
  ];
  constructor(private readonly hasuraService: HasuraService) {}
  public async create(req: any) {
    return await this.hasuraService.create(this.table, req, this.returnFields);
  }

  findAll(request: any) {
    return this.hasuraService.getAll(this.table, this.returnFields, request);
  }

  findOne(id: number) {
    return this.hasuraService.getOne(+id, this.table, this.returnFields);
  }

  update(id: number, req: any) {
    return this.hasuraService.update(+id, this.table, req, this.returnFields);
  }
}
