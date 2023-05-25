import { Inject, Injectable } from '@nestjs/common';
import { it } from 'node:test';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  public table = 'events';
  public fillable = [
    'context',
    'context_id',
    'created_by',
    'end_date',
    'end_time',
    'location',
    'location_type',
    'start_date',
    'start_time',
    'updated_by',
    'user_id',
  ];
  public returnFields = [
    'id',
    'context',
    'context_id',
    'created_by',
    'end_date',
    'end_time',
    'location',
    'location_type',
    'start_date',
    'start_time',
    'updated_by',
    'user_id',
  ];
  constructor(private readonly hasuraService: HasuraService) { }

  public async create(req: any) {

    console.log("req", req)
    let user_id_arr = req.user_id

    const query = []

    for (const iterator of user_id_arr) {
      
      let obj = {
        "user_id": iterator,
        "context": req.context,
        "context_id": req.context_id,
        "created_by": req.created_by,
        "end_date": req.end_date,
        "end_time": req.end_time,
        "location": req.location,
        "location_type": req.location_type,
        "start_date": req.start_date,
        "start_time": req.start_time,
        "updated_by": req.updated_by,
        "type": req.type,
      }

      console.log("obj")
      query.push(obj)
    }

    console.log("query", query)

    return this.hasuraService.create(this.table, req, this.returnFields);
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

  remove(id: number) {
    return this.hasuraService.delete(this.table, { id: +id });
  }
}
