import { Inject, Injectable } from '@nestjs/common';
import { it } from 'node:test';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import jwt_decode from 'jwt-decode';

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

  public async create(req, header, response) {
    //get keycloak id from token
    console.log("req", req)
    const authToken = header.header("authorization");
    const decoded: any = jwt_decode(authToken);
    let keycloak_id = decoded.sub;
    console.log("keycloak_id", keycloak_id)
    //get userid
    let query2 = {
      query: `query MyQuery {
                users(where: {keycloak_id: {_eq: "${keycloak_id}" }}) {
                  id
                  keycloak_id
                }
              }`
    }
    const user = await this.hasuraService.postData(query2)
    console.log("user", user.data.users[0])
    let user_id = user.data.users[0].id
    console.log("user_id", user_id)
    console.log("req", req)
    let user_id_arr = req.user_id

    const query = []

    for (const iterator of user_id_arr) {

      let obj = {
        "user_id": iterator,
        "created_by": user_id,
        "end_date": req.end_date,
        "end_time": req.end_time,
        "location": req.location,
        "location_type": req.location_type,
        "start_date": req.start_date,
        "start_time": req.start_time,
        "updated_by": user_id,
        "type": req.type,
      }

      console.log("obj")
      query.push(obj)
    }

    console.log("query", query)

    const promises = []

    for (const iterator of query) {
      promises.push(this.hasuraService.create(this.table, iterator, this.returnFields))
    }

    const createEvents = await Promise.all(promises)

    console.log("createEvents", createEvents)

    if (createEvents) {
      return response.status(200).send({
        success: true,
        message: 'Events created successfully!',
        data: createEvents,
      });
    } else {
      return response.status(200).send({
        success: false,
        message: 'Unable to create events!',
        data: {},
      });
    }
  }

  public async getEventsList(req, header, response) {
    //get keycloak id from token
    console.log("req", req)
    const authToken = header.header("authorization");
    const decoded: any = jwt_decode(authToken);
    let keycloak_id = decoded.sub;
    console.log("keycloak_id", keycloak_id)
    //get userid
    let query2 = {
      query: `query MyQuery {
                users(where: {keycloak_id: {_eq: "${keycloak_id}" }}) {
                  id
                  keycloak_id
                }
              }`
    }
    const user = await this.hasuraService.postData(query2)
    console.log("user", user.data.users[0])
    // get eventslist by userid
    let getQuery = {
      query: `query MyQuery {
        events(where: {created_by: {_eq: ${ user.data.users[0].id}}}) {
          id
          context
          context_id
          created_by
          end_date
          end_time
          location
          location_type
          start_date
          start_time
          type
          updated_by
          user_id
        }
      }`

    }
    const eventsList = await this.hasuraService.postData(getQuery)
    console.log("eventsList", eventsList)
    if (eventsList.data.events.length>0) {
      return response.status(200).send({
        success: true,
        message: 'Events fetched successfully!',
        data: eventsList.data,
      });
    } else {
      return response.status(200).send({
        success: false,
        message: 'Events not found!',
        data: {},
      });
    }
  }

  findAll(request: any) {
    return this.hasuraService.findAll(this.table, request);
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
