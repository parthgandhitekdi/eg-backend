// import { S3Client } from '@aws-sdk/client-s3';
import * as AWS from 'aws-sdk';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AwsRekognitionService {
	private region: string;
	private accessKeyId: string;
	private secretAccessKey: string;
	private rekognition: AWS.Rekognition;
	private bucketName: string;

	constructor(private configService: ConfigService) {
		// Setup AWS credentials
		this.region = this.configService.get<string>('AWS_REKOGNITION_REGION');
		this.accessKeyId = this.configService.get<string>(
			'AWS_REKOGNITION_ACCESS_KEY_ID',
		);
		this.secretAccessKey = this.configService.get<string>(
			'AWS_REKOGNITION_SECRET_ACCESS_KEY',
		);
		this.bucketName = this.configService.get<string>('S3_BUCKET');

		AWS.config.update({
			region: this.region,
			accessKeyId: this.accessKeyId,
			secretAccessKey: this.secretAccessKey,
		});

		this.rekognition = new AWS.Rekognition();
	}

	async createCollectionIfNotExists(collectionId: string) {
		const response = { new: false, data: null };
		try {
			const collections = await this.rekognition
				.listCollections()
				.promise();
			console.log('collections:', collections);
			if (!collections.CollectionIds.includes(collectionId)) {
				const createCollectionResponse = await this.rekognition
					.createCollection({ CollectionId: collectionId })
					.promise();
				console.log('Created a new collection:');
				console.dir(createCollectionResponse, { depth: 99 });
				response.new = true;
				response.data = createCollectionResponse;
			} else {
				response.new = false;
				console.log(
					`Using existing collection with ID: ${collectionId}`,
				);
			}
			return response;
		} catch (error) {
			console.log('createCollectionIfNotExists:', error);
			throw error;
		}
	}

	async getAllUsersOfCollection(collectionId: string) {
		try {
			const users = (
				await this.rekognition
					.listUsers({ CollectionId: collectionId })
					.promise()
			).Users.map((userObj) => userObj.UserId);
			console.log('users:', users);
			return users;
		} catch (error) {
			console.log('getAllUsersOfCollection:', error);
			throw error;
		}
	}

	async createUsersInCollection(collectionId: string, userIds: string[]) {
		try {
			for (const userId of userIds) {
				const createUserParams = {
					CollectionId: collectionId,
					UserId: userId,
				};
				const createUserResponse = await this.rekognition
					.createUser(createUserParams)
					.promise();
				console.log('createUserResponse:', createUserResponse);
			}
		} catch (error) {
			console.log('createUsersInCollection:', error);
			throw error;
		}
	}

	async getAllFacesOfUser(collectionId: string, userId: string) {
		try {
			const getFaceListParams = {
				CollectionId: collectionId,
				UserId: userId,
			};
			const faces = (
				await this.rekognition.listFaces(getFaceListParams).promise()
			).Faces.map((faceObj) => faceObj.FaceId);
			console.log('faces:', faces);
			return faces;
		} catch (error) {
			console.log('getAllFacesOfUser:', error);
			throw error;
		}
	}

	async disassociatePhotoFromUser(
		collectionId: string,
		userId: string,
		faceId: string,
	) {
		try {
			const disassociateFaceParams = {
				CollectionId: collectionId,
				UserId: userId,
				FaceIds: [faceId],
			};
			const disassociateFaceResponse = await this.rekognition
				.disassociateFaces(disassociateFaceParams)
				.promise();
			console.log('disassociateFaceResponse:', disassociateFaceResponse);
			const response = { success: false };
			if (disassociateFaceResponse.DisassociatedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			console.log('disassociatePhotoFromUser:', error);
			throw error;
		}
	}

	async deletePhotoFromCollection(collectionId: string, faceId: string) {
		try {
			const deleteFaceParams = {
				CollectionId: collectionId,
				FaceIds: [faceId],
			};
			const deleteFacesResponse = await this.rekognition
				.deleteFaces(deleteFaceParams)
				.promise();
			console.log('deleteFacesResponse:', deleteFacesResponse);
			const response = { success: false };
			if (deleteFacesResponse.DeletedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			console.log('deletePhotoFromCollection:', error);
			throw error;
		}
	}

	async addFaceInCollection(collectionId: string, imageName: string) {
		const response = { success: false, faceId: null };
		try {
			const addFaceParams = {
				CollectionId: collectionId,
				Image: {
					S3Object: {
						Bucket: this.bucketName,
						Name: imageName,
					},
				},
				ExternalImageId: imageName,
				MaxFaces: 1,
			};
			const addFaceResponse = await this.rekognition
				.indexFaces(addFaceParams)
				.promise();
			console.log('addFaceResponse:');
			console.dir(addFaceResponse, {depth: 99});
			if (addFaceResponse.FaceRecords.length === 1) {
				response.success = true;
				response.faceId = addFaceResponse.FaceRecords[0].Face.FaceId;
			}
			return response;
		} catch (error) {
			console.log('addFaceInCollection:', error);
			if (error.statusCode === 400) {
				response.success = false;
				return response;
			} else throw error;
		}
	}

	async associateFaceToUser(
		collectionId: string,
		userId: string,
		faceId: string,
	) {
		try {
			const associateFacesParams = {
				CollectionId: collectionId,
				UserId: userId,
				FaceIds: [faceId],
			};
			console.log('associateFacesParams:', associateFacesParams);
			const associateFaceResponse = await this.rekognition
				.associateFaces(associateFacesParams)
				.promise();
			console.log('associateFaceResponse:');
			console.dir(associateFaceResponse);
			const response = { success: false };
			if (associateFaceResponse.AssociatedFaces.length === 1)
				response.success = true;
			return response;
		} catch (error) {
			console.log('associateFaceToUser:', error);
			throw error;
		}
	}

	async searchUsersByImage(collectionId: string, imageName: string) {
		try {
			const searchParams = {
				CollectionId: collectionId,
				Image: {
					S3Object: {
						Bucket: this.bucketName,
						Name: imageName,
					},
				},
				UserMatchThreshold: 80,
				MaxUsers: 5,
			};

			const compareResponse = await this.rekognition
				.searchUsersByImage(searchParams)
				.promise();
			console.log('Matching faces:');
			console.dir(compareResponse, { depth: 99 });
			return compareResponse.UserMatches;
		} catch (error) {
			console.log('searchUsersByImage:', error);
			throw error;
		}
	}
}
