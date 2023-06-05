import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
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

		// Check if token is present as Bearer token
		if (!authTokenTemp[1]) {
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
