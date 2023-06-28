import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class AadhaarKycService {
	constructor(private readonly httpService: HttpService) {}

	private commonRequestConfig: AxiosRequestConfig = {
		headers: {
			'x-client-id': process.env['AADHAAR_OKYC_API_CLIENT_ID'],
			'x-client-secret': process.env['AADHAAR_OKYC_API_CLIENT_SECRET'],
		},
	};

	public async createOkycRequest(body, request: any, resp: any) {
		const data = {};
		const url = `${process.env.AADHAAR_OKYC_API_URL}`;

		try {
			const observable = this.httpService.post(
				url,
				data,
				this.commonRequestConfig,
			);
			const promise = observable.toPromise();
			const response = await promise;

			return resp.status(200).json({
				success: true,
				message: 'Created OKYC Request Successfully!',
				data: response.data,
			});
		} catch ({ response, message }) {
			console.log('Error in creating OKYC request', message);

			return resp.status(response?.status ? response?.status : 500).send({
				success: false,
				message: response?.data?.error?.detail
					? response?.data?.error?.detail
					: message,

				data: {
					code: response?.data?.error?.code
						? response?.data?.error?.code
						: 500,
				},
			});
		}
	}

	public async initiateOkycRequest(id: any, request: any, resp: any) {
		const url = `${process.env.AADHAAR_OKYC_API_URL}/${id}/initiate/`;

		try {
			const result = await this.httpService
				.get(url, this.commonRequestConfig)
				.toPromise();

			return resp.status(200).json({
				success: true,
				message: 'Initiates OKYC Request Successfully!',
				data: result.data,
			});
		} catch ({ response, message }) {
			console.log('Error in initiating OKYC', message);

			return resp.status(response?.status ? response?.status : 500).send({
				success: false,
				message: response?.data?.error?.detail
					? response?.data?.error?.detail
					: message,

				data: {
					code: response?.data?.error?.code
						? response?.data?.error?.code
						: 500,
				},
			});
		}
	}

	public async verifyOkycRequest(
		id: any,
		body: any,
		request: any,
		resp: any,
	) {
		const url = `${process.env.AADHAAR_OKYC_API_URL}/${id}/verify/`;
		const data = { ...body };

		try {
			const result = await this.httpService
				.post(url, data, this.commonRequestConfig)
				.toPromise();

			return resp.status(200).json({
				success: true,
				message: 'Verified OKYC Request Successfully!',
				data: result.data,
			});
		} catch ({ response, message }) {
			console.log('Error in verifying OKYC', message);

			return resp.status(response?.status ? response?.status : 500).send({
				success: false,
				message: response?.data?.error?.detail
					? response?.data?.error?.detail
					: message,

				data: {
					code: response?.data?.error?.code
						? response?.data?.error?.code
						: 500,
				},
			});
		}
	}

	public async completeOkycRequest(
		id: any,
		body: any,
		request: any,
		resp: any,
	) {
		const url = `${process.env.AADHAAR_OKYC_API_URL}/${id}/complete/`;
		const data = { ...body };

		try {
			const result = await this.httpService
				.post(url, data, this.commonRequestConfig)
				.toPromise();

			return resp.status(200).json({
				success: true,
				message: 'Completed OKYC Request Successfully!',
				data: result.data,
			});
		} catch ({ response, message }) {
			console.log('Error in completing OKYC', message);

			return resp.status(response?.status ? response?.status : 500).send({
				success: false,
				message: response?.data?.error?.detail
					? response?.data?.error?.detail
					: message,

				data: {
					code: response?.data?.error?.code
						? response?.data?.error?.code
						: 500,
				},
			});
		}
	}

	public async getOkycStatusRequest(
		id: any,
		shareCode: any,
		request: any,
		resp: any,
	) {
		const url = `${process.env.AADHAAR_OKYC_API_URL}/${id}/${shareCode}/`;

		try {
			const result = await this.httpService
				.get(url, this.commonRequestConfig)
				.toPromise();

			return resp.status(200).json({
				success: true,
				message: 'Got OKYC Status Successfully!',
				data: result.data,
			});
		} catch ({ response, message }) {
			console.log('Error in getting OKYC status', message);

			return resp.status(response?.status ? response?.status : 500).send({
				success: false,
				message: response?.data?.error?.detail
					? response?.data?.error?.detail
					: message,
				code: response?.data?.error?.code
					? response?.data?.error?.code
					: 500,

				data: {},
			});
		}
	}
	
	public async okyc2AadhaarVerify(body, req, resp) {
		const url = `${process.env.AADHAAR_OKYC2_API_URL}`;
		const data = { ...body };
		try {
			const result = await this.httpService
				.post(url, data, this.commonRequestConfig)
				.toPromise();

			return resp.status(200).json({
				success: true,
				message: 'OKYC Request Successfully Verified!',
				data: result.data,
			});
		} catch ({ response, message }) {
			console.log('Error in completing OKYC', message);

			return resp.status(response?.status ? response?.status : 500).send({
				success: false,
				message: response?.data?.error?.detail
					? response?.data?.error?.detail
					: message,

				data: {
					code: response?.data?.error?.code
						? response?.data?.error?.code
						: 500,
				},
			});
		}
	}
	public async getOkyc2AadhaarVerificationStatus(id, req, resp) {
		const url = `${process.env.AADHAAR_OKYC2_API_URL}/${id}`;
		console.log("url",url)
		try {
			const result = await this.httpService
				.get(url, this.commonRequestConfig)
				.toPromise();

			return resp.status(200).json({
				success: true,
				message: 'Got OKYC Verified Successfully!',
				data: result.data,
			});
		} catch ({ response, message }) {
			console.log('Error in getting OKYC status', message);

			return resp.status(response?.status ? response?.status : 500).send({
				success: false,
				message: response?.data?.error?.detail
					? response?.data?.error?.detail
					: message,
				code: response?.data?.error?.code
					? response?.data?.error?.code
					: 500,

				data: {},
			});
		}
	}
}
