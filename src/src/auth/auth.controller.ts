import {
    Body, Controller, Post, Req, Res, UseGuards, UsePipes,
    ValidationPipe
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OtpSendDTO } from './dto/otp-send.dto';
import { OtpVerifyDTO } from './dto/otp-verify.dto';
import { GetMobileByUsernameSendOtpDTO } from './dto/get-mobile-by-username-send-otp.dto';
import { UserOtpSendDTO } from './dto/username-otp.dto';
import { AuthGuard } from './auth.guard';
import { ResetPasswordAdminDTO } from './dto/reset-password-admin.dto';
import { RegisterDTO } from './dto/register.dto';
import { UserExistDTO } from './dto/user-exist.dto';

@Controller('auth')
export class AuthController {

    constructor(public authService: AuthService) { }

    @Post('/otp-send')
    @UsePipes(ValidationPipe)
    public sendOtp(@Body() req: OtpSendDTO, @Res() response: Response) {
        return this.authService.sendOtp(req, response);
    }

    @Post('/otp-verify')
    @UsePipes(ValidationPipe)
    public verifyOtp(@Body() req: OtpVerifyDTO, @Res() response: Response) {
        return this.authService.verifyOtp(req, response);
    }

    @Post('/get-mobile-by-username-send-otp')
    @UsePipes(ValidationPipe)
    public getMobileByUsernameSendOtp(@Body() req: UserOtpSendDTO, @Res() response: Response) {
        return this.authService.getMobileByUsernameSendOtp(req, response);
    }

    @Post('/forgot-password-otp')
    @UsePipes(ValidationPipe)
    public resetPasswordUsingOtp(@Body() req: GetMobileByUsernameSendOtpDTO, @Res() response: Response) {
        return this.authService.resetPasswordUsingOtp(req, response);
    }

    @Post('/reset-password-admin')
    @UseGuards(new AuthGuard())
    @UsePipes(ValidationPipe)
    public resetPasswordUsingId(@Body() req: ResetPasswordAdminDTO, @Req() header: Request, @Res() response: Response) {
        return this.authService.resetPasswordUsingId(req, header, response);
    }

    @Post('/login')
    @UsePipes(ValidationPipe)
    login(@Req() req: Request, @Res() response: Response) {
        return this.authService.login(req, response);
    }

    // users/is_user_exist by mobile and adhaar etc filter.
    @Post('/is_user_exist')
    public async isUserExist(@Body() req: UserExistDTO, @Res() response: Response) {
        return this.authService.isUserExist(req, response);
    }

    // users/register on keycloak and hasura both side.
    @Post('/register')
    @UsePipes(ValidationPipe)
    public async register(@Body() body: RegisterDTO, @Res() response: Response) {
        return this.authService.register(body, response);
    }
}
