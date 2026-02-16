import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import * as path from 'path';

@Injectable()
export class S3Service {
  private s3: S3Client;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: this.config.get<string>('aws.region'),
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined, // use IAM role in AWS
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder?: string, // optional
  ): Promise<string> {
    if (!file) throw new Error('File missing');

    const ext = path.extname(file.originalname);
    const fileName = `${uuid()}${ext}`;

    // if folder provided → use it, otherwise flat
    const key = folder ? `${folder}/${fileName}` : fileName;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.config.get<string>('aws.s3Bucket'),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${this.config.get<string>('aws.cloudfront_url')}/${key}`;
  }
}
