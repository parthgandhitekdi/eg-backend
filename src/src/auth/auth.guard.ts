import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import jwt_decode from 'jwt-decode';
import { Observable } from "rxjs";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor() {}
   canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {

        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>()

        if (request.header("authorization") == undefined){
           throw new UnauthorizedException('Unauthorized');
        } 
        const authToken = request.header("authorization");       
        const decoded: any =  this.verifyToken(authToken) 
        if ( Date.now()>= decoded.exp * 1000) {
            throw new UnauthorizedException('Token has expired');
          }else{
            return true
          }
          
        const keycloak_id = decoded.sub;

        if(keycloak_id) {
            return true;
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