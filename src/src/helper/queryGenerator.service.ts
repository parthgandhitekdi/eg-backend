import { Injectable } from '@nestjs/common';

@Injectable()
export class QueryGeneratorService {
	isEmptyObject = (obj: any) =>
		obj && obj.constructor.name === 'Object' && Object.keys(obj).length > 0;

	objectConvert = (obj: any, fun: any) => {
		if (this.isEmptyObject(obj)) {
			return Object.entries(obj).map(fun);
		}
		return [];
	};

	getParam = (keys: any) => {
		let str = '';
		keys.forEach((e: any, index: any) => {
			str += `${e}${keys.length > index + 1 ? '\n' : ''}`;
		});
		return str;
	};

	// create
	create(tName: String, item: any, onlyFields: any = [], fields: any = []) {
		let tableName = `insert_${tName}_one`;
		const keys = Object.keys(item);
		const getObjStr = (item: any, type: String = '') => {
			let str = 'object: {';
			let strArr = [];
			keys.forEach((e, index) => {
				if (
					e !== 'id' &&
					(onlyFields.length < 1 || onlyFields.includes(e))
				) {
					strArr = [...strArr, `${e}:"${item[e]}"`];
				}
			});
			str += strArr.join();
			str += `}`;
			return str;
		};

		return `mutation MyQuery {
      ${tableName}(${getObjStr(item)}) {
        ${this.getParam(
			fields && fields.length > 0
				? fields
				: onlyFields
				? onlyFields
				: keys,
		)}
      }
    }
    `;
	}

	// update
	update(
		id: number,
		tName: String,
		item: any,
		onlyFields: any = [],
		fields: any = [],
	) {
		let tableName = `update_${tName}`;
		const keys = Object.keys(item);
		const getObjStr = (item: any, type: String = '') => {
			let str = `where: {id: {_eq: ${id}}}, _set: {`;
			let strArr = [];
			keys.forEach((e, index) => {
				if (
					e !== 'id' &&
					(onlyFields.length < 1 || onlyFields.includes(e))
				) {
					strArr = [...strArr, `${e}:"${item[e]}"`];
				}
			});
			str += strArr.join();
			str += `}`;
			return str;
		};

		return `mutation MyQuery {
      ${tableName}(${getObjStr(item)}) {
        affected_rows
        returning {
            ${this.getParam(
				fields && fields.length > 0
					? fields
					: onlyFields
					? onlyFields
					: keys,
			)}
        }
      }
    }
    `;
	}

	//mutation
	mutation(
		tName: String,
		item: any,
		onlyFields: any = [],
		update: boolean = false,
		fields: any = [],
	) {
		let tableName = `insert_${tName}_one`;
		if (item?.id && update) {
			tableName = `update_${tName}`;
		}
		const keys = Object.keys(item);
		const getObjStr = (item: any, type: String = '') => {
			let str = 'object: {';
			if (item?.id && update) {
				str = `where: {id: {_eq: ${item?.id}}}, _set: {`;
			}
			let strArr = [];
			keys.forEach((e, index) => {
				if (
					e !== 'id' &&
					(onlyFields.length < 1 || onlyFields.includes(e))
				) {
					if (type === 'obj') {
						if (
							typeof item[e] !== 'string' &&
							[
								'mobile',
								'alternative_mobile_number',
								'dob',
								'qualification_reference_document_id',
								'enrollment_number',
								'payment_receipt_document_id',
								'enrollment_date',
								'enrollment_dob',
								'enrolled_for_board',
								'subjects',
								'enrollment_first_name',
								'enrollment_middle_name',
								'enrollment_last_name',
								'enrollment_aadhaar_no',
								'documents_status',
								'is_eligible',
							].includes(e)
						) {
							strArr = [...strArr, `${e}:${item[e]}`];
						} else {
							strArr = [...strArr, `${e}:"${item[e]}"`];
						}
					} else {
						strArr = [...strArr, `${e}:String`];
					}
				}
			});
			str += strArr.join();
			str += `}`;
			return str;
		};

		return `mutation MyQuery {
      ${tableName}(${getObjStr(item, 'obj')}) {
        ${
			!(item?.id && update)
				? this.getParam(
						fields && fields.length > 0
							? fields
							: onlyFields
							? [...onlyFields, 'id']
							: keys,
				  )
				: 'affected_rows'
		}
      }
    }
    `;
	}

	query(
		tableName: String,
		onlyFields: any = [],
		request: any = { filters: {}, page: '0', limit: '0' },
	) {
		const getObjStr = (request: any) => {
			const { filters, page, limit, order_by } = request;
			let str = '';
			if (
				(limit && limit != '0') ||
				(filters && Object.keys(filters).length > 0) ||
				(order_by && Object.keys(order_by).length > 0)
			) {
				str += '(';
				let paramArr = [];
				if (filters && Object.keys(filters).length > 0) {
					let filterStr = `where: {`;
					let strArr = Object.keys(filters).map((e) => {
						if (this.isEmptyObject(filters[e])) {
							let data = this.objectConvert(
								filters[e],
								([key, val]) => {
									return `${key}: "${val}"`;
								},
							);
							return `${e}:{${data.join(',')}}`;
						} else if (filters && filters[e] != '') {
							return `${e}:{_eq:"${filters[e]}"}`;
						}
					});
					filterStr += strArr.join();
					filterStr += `}`;
					paramArr = [...paramArr, filterStr];
				}
				if (limit) {
					let offset = 0;
					if (page > 1 && limit) {
						offset = parseInt(limit) * (page - 1);
					}
					paramArr = [
						...paramArr,
						`limit: ${limit}, offset: "${offset}"`,
					];
				}
				if (order_by && Object.keys(order_by).length > 0) {
					let data = this.objectConvert(order_by, ([key, val]) => {
						return `${key}: ${val}`;
					});
					paramArr = [...paramArr, `order_by: {${data.join(',')}}`];
				}
				str += paramArr.join(', ');
				str += ')';
			}
			return str;
		};

		return `query MyQuery {
      ${tableName}_aggregate${getObjStr(request)} {
        aggregate {
          count
        }
      }
      ${tableName}${getObjStr(request)} {
        ${this.getParam(onlyFields)}
      }
    }
    `;
	}

	findOne(id: number, tName: String, onlyFields: any = []) {
		return `query MyQuery {
        ${tName}_by_pk(id: ${id}) {
            ${this.getParam(onlyFields)}
      }
    }
    `;
	}

	queryMulti(
		tableName: String,
		items: any,
		onlyFields: any,
		fields: any = [],
	) {
		let returnkeys = [];
		const getObjStr = (item: Object, type: String = '') => {
			let str = '[';
			items.forEach((item, pindex) => {
				const keys = Object.keys(item);
				str += '{';
				keys.forEach((e, index) => {
					if (!returnkeys.includes(e)) {
						returnkeys = [...returnkeys, e];
					}
					if (onlyFields.length < 1 || onlyFields.includes(e)) {
						if (type === 'obj') {
							str += `${e}:"${item[e]}"${
								keys.length > index + 1 ? ',' : ''
							}`;
						} else {
							str += `$${e}:String${
								keys.length > index + 1 ? ',' : ''
							}`;
						}
					}
				});
				str += `}${items.length > pindex + 1 ? ',' : ''}`;
			});
			return (str += ']');
		};

		return `mutation MyQuery {
      ${tableName}(objects: ${getObjStr(items, 'obj')}) {
        returning {${this.getParam(
			fields ? fields : onlyFields ? [...onlyFields, 'id'] : returnkeys,
		)}}
      }
    }
    `;
	}

	deleteQuery(
		tName: String,
		item: any,
		onlyFields: any = [],
		returnFields: any = null,
	) {
		let tableName = `delete_${tName}`;
		const keys = Object.keys(item);

		const getObjStr = (item: any, type: String = '') => {
			let str = ``;
			let strArr = [];
			keys.forEach((e) => {
				if (onlyFields.length < 1 || onlyFields.includes(e)) {
					if (type === 'obj') {
						strArr = [...strArr, `${e}:{_eq:"${item[e]}"}`];
					}
				}
			});
			str += strArr.join();
			return str;
		};

		let returnFieldsQuery = ``;
		if (
			returnFields &&
			Array.isArray(returnFields) &&
			returnFields.length > 0
		) {
			returnFieldsQuery = `returning {
        ${returnFields.join(',')}
      }`;
		}

		console.log(`mutation DeleteQuery {
      ${tableName}(where: {${getObjStr(item, 'obj')}}) {
         affected_rows
         ${returnFieldsQuery}
      }
    }
    `);

		return `mutation DeleteQuery {
      ${tableName}(where: {${getObjStr(item, 'obj')}}) {
         affected_rows
         ${returnFieldsQuery}
      }
    }
    `;
	}
}
