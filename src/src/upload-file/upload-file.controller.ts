import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Res,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { UploadFileService } from './upload-file.service';

@UseInterceptors(SentryInterceptor)
@Controller('uploadFile')
export class UploadFileController {
	constructor(private readonly uploadFileService: UploadFileService) {}

	@Post('/:id/upload-file')
	@UseInterceptors(FileInterceptor('file'))
	async addFile(
		@UploadedFile() file: Express.Multer.File,
		@Param('id') id: number,
		@Body('document_type') document_type: string,
		@Body('document_sub_type') document_sub_type: string,
		@Res() request: Request,
		@Res() response: Response,
	) {
		await this.uploadFileService.addFile(file, id, document_type, document_sub_type,response);
	}

	@Post('/attendance')
	@UseGuards(new AuthGuard())
	@UseInterceptors(FileInterceptor('file'))
	async addFileNoMock(
		@UploadedFile() file: Express.Multer.File,
		@Res() response: Response,
	) {
		await this.uploadFileService.addFileNoMeta(file, response);
	}

	@Get('/:id/get-file')
	@UseInterceptors(FileInterceptor('file'))
	async getFileUrl(
		@Param('id') id: string,
		@Res() request: Request,
		@Res() response: Response,
	) {
		console.log('get-file id', id);
		await this.uploadFileService.getFile(id, response);
	}

	@Get('/getDocumentById/:id')
	async getDocumentById(
		@Param('id') id: string,
		@Res() response: Response,
	) {
		await this.uploadFileService.getDocumentById(id, response);
	}
}
