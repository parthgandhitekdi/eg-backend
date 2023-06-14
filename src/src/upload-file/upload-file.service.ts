import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { S3Service } from 'src/services/s3/s3.service';
import { HasuraService as HasuraServiceFromServices } from '../services/hasura/hasura.service';

@Injectable()
export class UploadFileService {
	constructor(
		private hasuraServiceFromServices: HasuraServiceFromServices,

		private readonly s3Service: S3Service,
		private readonly hasuraService: HasuraService,
	) {}
	async addFile(
		file: Express.Multer.File,
		id: number,
		document_type: string,
		document_sub_type: string,
		response: Response,
	) {
		if (!file) {
			return response.status(400).send({
				success: false,
				status: 'Not Found',
				message: 'Document Not Passed',
				data: {},
			});
		}
		const originalName = file.originalname
			.split(' ')
			.join('')
			.toLowerCase();
		const [name, fileType] = originalName.split('.');
		let key = `${name}${Date.now()}.${fileType}`;
		const fileUrl = await this.s3Service.uploadFile(file, key);
		const documentTypeArray = [
			'aadhaar_front',
			'aadhaar_back',
			'profile_photo_1',
			'profile_photo_2',
			'profile_photo_3',
		];
		if (documentTypeArray.includes(document_sub_type)) {
			try {
				const data = {
					query: `query MyQuery {
                    users(where: {id: {_eq: ${id}}}) {
                      id
                      username
                      mobile
                      ${document_sub_type}: documents(where: {document_sub_type: {_eq: "${document_sub_type}"}}) {
                        id
                        name
                        doument_type
                        document_sub_type
                        path
                      }
                    }
                  }`,
				};
				//fetch documents data based on id and docuent_type
				const response = await this.hasuraServiceFromServices.getData(
					data,
				);
				let result = response?.data?.users;
				let FileData: any = result[0][document_sub_type];
				if (FileData.length > 0) {
					const promise = [];
					const promise2 = [];
					for (let item of FileData) {
						//add all exist records into promise
						promise.push(
							this.hasuraService.delete('documents', {
								id: item.id,
							}),
						);
						promise2.push(this.s3Service.deletePhoto(item.name));
					}
					//delete all existing records from table
					const deleteDocuments = await Promise.all(promise);
					//delete all existing records from s3 bucket
					const deleteFroms3Bucket = await Promise.all(promise2);
				}
			} catch (error) {
				return response.status(500).send({
					success: false,

					message: 'Unable to Upload documents',
					data: {},
				});
			}
		}
		if (fileUrl) {
			let query = {
				query: `mutation MyMutation {
                  insert_documents(objects: {name: "${key}", path: "/user/docs", provider: "s3", updated_by: "${id}", user_id: "${id}", doument_type: "${document_type}", document_sub_type: "${
					document_sub_type ?? document_type
				}", created_by: "${id}"}) {
                    affected_rows
                    returning {
                      id
                      doument_type
                      document_sub_type
                      path
                      name
                      user_id
                      updated_by
                      provider
                      created_by
                      context_id
                      context
                    }
                  }
                }`,
			};
			const res = await this.hasuraService.postData(query);

			if (res) {
				return response.status(200).send({
					success: true,
					status: 'Success',
					message: 'File uploaded successfully!',
					data: { key: key, fileUrl: fileUrl, data: res.data },
				});
			} else {
				return response.status(200).send({
					success: false,
					status: 'Success',
					message: 'Unable to update documents db',
					data: null,
				});
			}
		} else {
			return response.status(200).send({
				success: false,
				status: 'Success',
				message: 'Unable to upload file',
				data: null,
			});
		}
	}

	async addFileNoMeta(file: Express.Multer.File, response: Response) {
		const originalName = file.originalname
			.split(' ')
			.join('')
			.toLowerCase();
		const [name, fileType] = originalName.split('.');
		let key = `${name}${Date.now()}.${fileType}`;
		const fileUrl = await this.s3Service.uploadFile(file, key);
		if (fileUrl) {
			return response.status(200).send({
				success: true,
				status: 'Success',
				message: 'File uploaded successfully!',
				data: { key: key, fileUrl: fileUrl },
			});
		} else {
			return response.status(500).send({
				success: false,

				message: 'Unable to upload file',
				data: {},
			});
		}
	}

	async getFile(id: string, response: Response) {
		const key = id;
		const fileUrl = await this.s3Service.getFileUrl(key);

		console.log('fileUrl', fileUrl);
		if (fileUrl) {
			return response.status(200).send({
				success: true,
				status: 'Success',
				message: 'File url fethed successfully!',
				data: { key: key, fileUrl: fileUrl },
			});
		} else {
			return response.status(200).send({
				success: false,
				status: 'Success',
				message: 'Unable to get file',
				data: null,
			});
		}
	}

	async getDocumentById(id: string, response: Response) {
		const hasuraData = {
			query: `
				query MyQuery {
					documents_by_pk(id: ${id}) {
						id
						name
						doument_type
						document_sub_type
						path
						provider
						context
						context_id
					}
				}
			`,
		};

		const hasuraResponse = await this.hasuraService.getData(hasuraData);

		const documentData = hasuraResponse?.data?.documents_by_pk;

		if (documentData === null || !documentData.name) {
			return response.status(400).send({
				success: false,
				message: 'Document not exists!',
				data: null,
			});
		}

		const fileUrl = await this.s3Service.getFileUrl(documentData.name);
		if (fileUrl) {
			return response.status(200).send({
				success: true,
				message: 'File url fethed successfully!',
				data: {
					key: documentData.name,
					fileUrl: fileUrl,
					documentData,
				},
			});
		} else {
			return response.status(200).send({
				success: false,
				message: 'Unable to get file',
				data: null,
			});
		}
	}
}
