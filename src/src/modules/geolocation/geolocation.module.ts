import { Module } from "@nestjs/common";
import { HasuraModule } from "src/services/hasura/hasura.module";
import { GeolocationController } from "./geolocation.controller";
import { GeolocationService } from "./geolocation.service";

@Module({
	imports: [HasuraModule],
	controllers: [GeolocationController],
	providers: [GeolocationService],
})
export class GeolocationModule {}
