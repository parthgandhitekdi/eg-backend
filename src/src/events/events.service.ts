import { Injectable } from '@nestjs/common';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { UserService } from 'src/user/user.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

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
		'name',
		'context',
		'context_id',
		'created_by',
		'end_date',
		'end_time',
		'type',
		'location',
		'master_trainer',
		'location_type',
		'start_date',
		'start_time',
		'updated_by',
		'user_id',
		'reminders',
	];

	public attendanceReturnFields = [
		'id',
		'user_id',
		'context_id',
		'created_by',
		'context',
		'status',
		'lat',
		'long',
		'rsvp',
		'photo_1',
		'photo_2',
		'date_time',
		'updated_by',
	];
	constructor(
		private readonly hasuraService: HasuraService,
		private hasuraServiceFromServices: HasuraServiceFromServices,
		private readonly userService: UserService,
	) {}

	public async create(req, header, response) {
		let user_id_arr = req.attendees;
		const userDetail = await this.userService.ipUserInfo(header);
		let user_id = userDetail.data.id;
		let obj = {
			...(req?.context_id && { context_id: req?.context_id }),
			...(req?.context && { context: req?.context }),
			user_id: req.user_id ? req.user_id : user_id,
			name: req.name,
			master_trainer: req.master_trainer,
			created_by: user_id,
			end_date: req.end_date,
			end_time: req.end_time,
			location: req.location,
			location_type: req.location_type,
			start_date: req.start_date,
			start_time: req.start_time,
			updated_by: user_id,
			type: req.type,
			reminders: JSON.stringify(req.reminders).replace(/"/g, '\\"'),
		};

		const eventResult = await this.hasuraService.create(
			this.table,
			obj,
			this.returnFields,
		);

		if (eventResult) {
			const promises = [];
			const query = [];
			for (const iterator of user_id_arr) {
				let obj = {
					user_id: iterator,
					created_by: user_id,
					context_id: eventResult.events.id,
					context: 'events',
					updated_by: user_id,
				};
				query.push(obj);
			}
			for (const iterator of query) {
				promises.push(
					this.hasuraService.create(
						'attendance',
						iterator,
						this.attendanceReturnFields,
					),
				);
			}
			const createAttendees = await Promise.all(promises);
			let mappedData = createAttendees.map((data) => data.attendance);
			if (createAttendees) {
				return response.status(200).send({
					success: true,
					message: 'Event created successfully!',
					data: {
						events: eventResult.events,
						attendance: mappedData,
					},
				});
			} else {
				return response.status(500).send({
					success: false,
					message: 'Unable to create Event!',
					data: {},
				});
			}
		} else {
			return response.status(500).send({
				success: false,
				message: 'Unable to create Event!',
				data: {},
			});
		}
	}

	public async getEventsList(req, header, response) {
		const userDetail = await this.userService.ipUserInfo(header);
		console.log('user details', userDetail.data.id);
		let getQuery = {
			query: `query MyQuery {
		events(where: {created_by: {_eq: ${userDetail.data.id}}}) {
		  id
		  location
		  location_type
		  name
		  context
		  context_id
		  master_trainer
		  reminders
		  end_date
		  end_time
		  start_date
		  start_time
		  type
		  created_by
		  updated_by
		  user_id
		  attendances {
			context
			context_id
			created_by
			date_time
			id
			lat
			long
			rsvp
			status
			updated_by
			user_id
			user{
			  first_name
			  id
			  last_name
			  middle_name
			  profile_url
			  aadhar_verified
			  aadhaar_verification_mode
			}
		  }
		}
	  }`,
		};
		const eventsList = await this.hasuraService.postData(getQuery);
		if (eventsList.data.events.length > 0) {
			return response.status(200).send({
				success: true,
				message: 'Events fetched successfully!',
				data: eventsList.data,
			});
		} else {
			return response.status(404).send({
				success: false,
				message: 'Events not found!',
				data: {},
			});
		}
	}

	public async findAll(request: any) {
		return this.hasuraService.findAll(this.table, request);
	}

	public async findOne(id: number, resp: any) {
		var data = {
			query: `query searchById {
	  events_by_pk(id: ${id}) {
		reminders
		name
		master_trainer
		end_date
		created_by
		context_id
		context
		end_time
		id
		location
		location_type
		start_date
		start_time
		type
		updated_by
		user_id
		attendances(order_by: {
		  created_at: asc
		  }) {
		  created_by
		  created_at
		  context
		  context_id
		  date_time
		  id
		  lat
		  user_id
		  updated_by
		  status
		  long
		  rsvp
		  user{
			first_name
			id
			last_name
			middle_name
			profile_url
			aadhar_verified
			aadhaar_verification_mode
			program_faciltators{
			documents_status
			  }
		  }
		}

	  }
	}
	`,
		};
		const response = await this.hasuraServiceFromServices.getData(data);
		let result = response?.data?.events_by_pk;
		if (!result) {
			return resp.status(404).send({
				success: false,
				status: 'Not Found',
				message: 'Event Not Found',
				data: {},
			});
		} else {
			return resp.status(200).json({
				success: true,
				message: 'Event found successfully!',
				data: { event: result },
			});
		}
	}

	public async update(id: number, header: any, req: any, resp: any) {
		try {
			const userDetail = await this.userService.ipUserInfo(header);
			let user_id = userDetail.data.id;
			let attendees = req.attendees;
			if (attendees && attendees.length > 0) {
				const data = {
					query: `query MyQuery {
		  events(where: {id: {_eq: ${id}}}){
			id
			user_id
			name
			created_by
			updated_by
			attendances{
			  id
			  user_id
			}
		  }
		}`,
				};
				const response = await this.hasuraServiceFromServices.getData(
					data,
				);
				let eventDetails = response?.data.events[0];
				let mappedData = response?.data.events.map(
					(data) => data.attendances,
				);
				if (response) {
					//remove attendees in current event
					const deletePromise = [];
					const deleteAttendees = mappedData[0].filter(
						(data) => !req.attendees.includes(data.user_id),
					);
					if (deleteAttendees && deleteAttendees.length > 0) {
						for (const iterator of deleteAttendees) {
							deletePromise.push(
								this.hasuraService.delete('attendance', {
									id: +iterator.id,
								}),
							);
						}
						const removeAttendees = await Promise.all(
							deletePromise,
						);
					}

					//add new attendees in current event
					const tempArray = mappedData[0].map((data) => data.user_id);
					const addAttendees = req.attendees.filter(
						(data) => !tempArray.includes(data),
					);
					if (addAttendees && addAttendees.length > 0) {
						const promises = [];
						const query = [];
						for (const iterator of addAttendees) {
							let obj = {
								user_id: iterator,
								created_by: eventDetails.created_by,
								context_id: id,
								context: 'events',
								updated_by: user_id,
							};
							query.push(obj);
						}
						for (const iterator of query) {
							promises.push(
								this.hasuraService.create(
									'attendance',
									iterator,
									this.attendanceReturnFields,
								),
							);
						}
						const createAttendees = await Promise.all(promises);
					}
				}
			}
			//update events fields
			const newRequest = {
				...req,
				...(req.reminders && {
					reminders: JSON.stringify(req.reminders).replace(
						/"/g,
						'\\"',
					),
				}),
			};

			const updatedResult = await this.hasuraService.update(
				+id,
				this.table,
				newRequest,
				this.returnFields,
			);
			return resp.status(200).send({
				success: true,
				message: 'Event Updated Successfully',
				data: { events: updatedResult.events },
			});
		} catch (error) {
			return resp.status(500).send({
				success: false,
				message: error.message,
				data: {},
			});
		}
	}

	public async updateEventAcceptDetail(id: number, req: any, response: any) {
		const tableName = 'attendance';
		let result = await this.hasuraService.update(
			+id,
			tableName,
			req,
			this.attendanceReturnFields,
		);
		if (result.attendance) {
			return response.status(200).send({
				success: true,
				message: 'Attendance Updated successfully!',
				data: { attendance: result.attendance },
			});
		} else {
			return response.status(500).send({
				success: false,
				message: 'Unable to Update Attendance!',
				data: {},
			});
		}
	}
	public checkStrings(strings) {
		let message = [];
		for (let str in strings) {
			if (strings[str] === undefined || strings[str] === '') {
				message.push(`please send ${str} `);
			}
		}
		let respObject: any = {};
		if (message.length > 0) {
			respObject.success = false;
			respObject.errors = message;
		} else {
			respObject.success = true;
		}
		return respObject;
	}

	public async updateAttendanceDetail(id: number, req: any, response: any) {
		const tableName = 'attendance';
		if (req?.status == 'present') {
			let checkStringResult = this.checkStrings({
				lat: req.lat,
				long: req.long,
				photo_1: req.photo_1,
			});

			if (!checkStringResult.success) {
				return response.status(400).send({
					success: false,
					message: checkStringResult.errors,
					data: {},
				});
			}
		}
		try {
			let result = await this.hasuraService.update(
				+id,
				tableName,
				req,
				this.attendanceReturnFields,
			);
			if (result.attendance) {
				return response.status(200).send({
					success: true,
					message: 'Attendance Updated successfully!',
					data: { attendance: result.attendance },
				});
			}
		} catch (error) {
			return response.status(500).send({
				success: false,
				message: error.message,
				data: {},
			});
		}
	}

	async remove(id: number, header, resp: any) {
		const userDetail = await this.userService.ipUserInfo(header);
		const organizationId =
			userDetail?.data?.program_users[0]?.organisation_id;
		try {
			const data = {
				query: `query MyQuery {
			    events(where: {id: {_eq: ${id}}}){
				id
				user_id
				name
				created_by
				updated_by
				attendances{
				id
				user_id
				}
			}
			}`,
			};

			const response = await this.hasuraServiceFromServices.getData(data);

			let eventDetails = response?.data?.events[0];
			//get organization id of event created user
			const EventUserdata = {
				query: `query MyQuery {
				  users_by_pk(id: ${eventDetails?.user_id}){
				  program_users{
					organisation_id
				  }
				}
			  }`,
			};
			const eventcreatedUserResponse = await this.hasuraServiceFromServices.getData(EventUserdata);
			const eventUserOrganizationId =eventcreatedUserResponse?.data?.users_by_pk?.program_users[0]?.organisation_id;
			//if logged user and event created user organization id is same then only perform delete operation
			if (organizationId == eventUserOrganizationId) {
				const deletePromise = [];
				if (
					eventDetails?.attendances &&
					eventDetails?.attendances?.length > 0
				) {
					for (const iterator of eventDetails?.attendances) {
						deletePromise.push(
							this.hasuraService.delete('attendance', {
								id: +iterator.id,
							}),
						);
					}
					const removedAttendees = await Promise.all(deletePromise);
				}
				const deleteEvent = await this.hasuraService.delete(
					this.table,
					{ id: +id },
				);
				return resp.status(200).send({
					success: true,
					message: 'Event Deleted Successfully',
					data: { events: deleteEvent?.events },
				});
			} else {
				//if organization not matched
				return resp.status(401).send({
					success: true,
					message: 'Unauthorized To Delete Event',
					data: {},
				});
			}
		} catch (error) {
			return resp.status(500).send({
				success: false,
				message: error.message,
				data: {},
			});
		}
	}
}
