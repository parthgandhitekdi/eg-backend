import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { HasuraService } from 'src/services/hasura/hasura.service';
import { S3Service } from 'src/services/s3/s3.service';

@Injectable()
export class UploadFileService {
	constructor(
		private readonly s3Service: S3Service,
		private readonly hasuraService: HasuraService,
	) {}

	async addFile(
		file: Express.Multer.File,
		id: number,
		document_type: string,
		response: Response,
	) {
		const originalName = file.originalname
			.split(' ')
			.join('')
			.toLowerCase();
		const [name, fileType] = originalName.split('.');
		let key = `${name}${Date.now()}.${fileType}`;
		const fileUrl = await this.s3Service.uploadFile(file, key);
		if (fileUrl) {
			let query = {
				query: `mutation MyMutation {
                    insert_documents(objects: {name: "${key}", path: "/user/docs", provider: "s3", updated_by: "${id}", user_id: "${id}", doument_type: "${document_type}", document_sub_type: "${document_type}", created_by: "${id}"}) {
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
}
