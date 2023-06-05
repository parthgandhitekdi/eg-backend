import {
    Controller,
    Get,
    Query,
    Res,
    UseInterceptors
} from '@nestjs/common';
import { SentryInterceptor } from 'src/common/interceptors/sentry.interceptor';
import { EnumService } from './enum.service';

@UseInterceptors(SentryInterceptor)
@Controller('enum')
export class EnumController {
	constructor(private readonly enumService: EnumService) {}

	@Get('/enum_value_list')
	getEnumValue(@Query('key') key: string) {
		return this.enumService.getEnumValue(key);
	}

	@Get('/list')
	getAllEnums(@Res() res: Response) {
		return this.enumService.getAllEnums(res);
	}
}
