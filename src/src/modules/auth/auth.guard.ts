import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common';
import { Request } from 'express';
import jwt_decode from 'jwt-decode';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
	canActivate(
		context: ExecutionContext,
	): boolean | Promise<boolean> | Observable<boolean> {
		const ctx = context.switchToHttp();
		const request = ctx.getRequest<Request>();

		// Check if auth header is present
		if (request.header('authorization') == undefined) {
			throw new UnauthorizedException('Unauthorized');
		}

		// Get token
		const authToken = request.header('authorization');
		const authTokenTemp = request.header('authorization').split(' ');
		let bearerToken = null;
		let bearerTokenTemp = null;

		// If Bearer word not found in auth header value
		if (authTokenTemp[0] !== 'Bearer') {
			throw new UnauthorizedException('Bearer token not found');
		}
		// Get trimmed Bearer token value by skipping Bearer value
		else {
			bearerToken = authToken.trim().substr(7, authToken.length).trim();
		}

		// If Bearer token value is not passed
		if (!bearerToken) {
			throw new UnauthorizedException('Invalid token');
		}
		// Lets split token by dot (.)
		else {
			bearerTokenTemp = bearerToken.split('.');
		}

		// Since JWT has three parts - seperated by dots(.), lets split token
		if (bearerTokenTemp.length < 3) {
			throw new UnauthorizedException('Invalid token');
		}

		// Decode and get keycloak id from Token
		const decoded: any = this.verifyToken(authToken);
		const keycloak_id = decoded.sub;

		if (keycloak_id) {
			// Check for token expiry
			if (Date.now() >= decoded.exp * 1000) {
				throw new UnauthorizedException('Token has expired');
			} else {
				return true;
			}
		} else {
			throw new UnauthorizedException('Invalid token');
		}
	}

	private verifyToken(token: string) {
		try {
			const decoded = jwt_decode(token);
			return decoded;
		} catch (err) {
			throw new UnauthorizedException('Invalid token');
		}
	}
}
