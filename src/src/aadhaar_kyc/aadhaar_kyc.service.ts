import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class AadhaarKycService {

    constructor(private readonly httpService: HttpService) { }

    public async createOkycRequest(body, request: any, resp: any) {
        const data = {};
        const url = `${process.env.AADHAAR_OKYC_API_URL}`;
        var config: AxiosRequestConfig = {
            headers: {
                'x-client-id': process.env['AADHAAR_OKYC_API_CLIENT_ID'],
                'x-client-secret': process.env['AADHAAR_OKYC_API_CLIENT_SECRET']
            }
        };

        try {
            console.log(url);
            console.log(data);
            console.log(config);

            const observable =
                this.httpService.post(url, data, config);

            const promise = observable.toPromise();

            const response = await promise;
            return resp.status(200).json({
                success: true,
                message: 'Created OKYC Request Successfully!',
                data: response.data
            })
        } catch (e) {
            console.log("post data error", e.message)
            return resp.status(500).send({
                success: false,
                message: e.message,
                data: {},
            });
        }
    }

    public async initiateOkycRequest(id: any, request: any, resp: any) {
        const url = `${process.env.AADHAAR_OKYC_API_URL}/${id}/initiate/`;
        console.log("url", url)
        var config: AxiosRequestConfig = {
            headers: {
                'x-client-id': process.env['AADHAAR_OKYC_API_CLIENT_ID'],
                'x-client-secret': process.env['AADHAAR_OKYC_API_CLIENT_SECRET'],
                'Content-Type': 'application/json'
            }
        };

        try {
            const result = await this.httpService.get(url, config).toPromise();
            return resp.status(200).json({
                success: true,
                message: 'Initiates OKYC Request Successfully!',
                data: result.data
            })
        } catch (e) {
            console.log("initiate okyc data error", e.message)
            return resp.status(500).send({
                success: false,
                message: e.message,
                data: {},
            });
        }
    }

    public async verifyOkycRequest(id: any, body: any, request: any, resp: any) {
        const url = `${process.env.AADHAAR_OKYC_API_URL}/${id}/verify/`;
        const data = { ...body };
        var config: AxiosRequestConfig = {
            headers: {
                'x-client-id': process.env['AADHAAR_OKYC_API_CLIENT_ID'],
                'x-client-secret': process.env['AADHAAR_OKYC_API_CLIENT_SECRET'],
                'Content-Type': 'application/json'
            }
        };

        try {
            const result = await this.httpService.post(url, data, config).toPromise();
            return resp.status(200).json({
                success: true,
                message: 'Verified OKYC Request Successfully!',
                data: result.data
            })

        } catch (e) {
            console.log("verify okyc data error", e.message)
            return resp.status(500).send({
                message: e.message,
                data: {},
            });

        }
    }


    public async completeOkycRequest(id: any, body: any, request: any, resp: any) {
        const url = `${process.env.AADHAAR_OKYC_API_URL}/${id}/complete/`;
        const data = { ...body };
        var config: AxiosRequestConfig = {
            headers: {
                'x-client-id': process.env['AADHAAR_OKYC_API_CLIENT_ID'],
                'x-client-secret': process.env['AADHAAR_OKYC_API_CLIENT_SECRET'],
                'Content-Type': 'application/json'
            }
        };

        try {
            const result = await this.httpService.post(url, data, config).toPromise();
            return resp.status(200).json({
                success: true,
                message: 'Completed OKYC Request Successfully!',
                data: result.data
            })
        } catch (e) {
            console.log("complete okyc data error", e.message)
            return resp.status(500).send({
                message: e.message,
                data: {},
            });


        }
    }

    public async getOkycStatusRequest(id: any, shareCode: any, request: any, resp: any) {
        const url = `${process.env.AADHAAR_OKYC_API_URL}/${id}/${shareCode}/`;
        var config: AxiosRequestConfig = {
            headers: {
                'x-client-id': process.env['AADHAAR_OKYC_API_CLIENT_ID'],
                'x-client-secret': process.env['AADHAAR_OKYC_API_CLIENT_SECRET'],
                'Content-Type': 'application/json'
            }
        };

        try {
            const result = await this.httpService.get(url, config).toPromise();
            return resp.status(200).json({
                success: true,
                message: 'Get OKYC Status Successful!',
                data: result.data
            })
        } catch (e) {
            console.log("get okyc data error", e.message)
            return resp.status(404).send({
                message: e.message,
                data: {},
            });

        }
    }
}
