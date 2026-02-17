import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { Readable } from "stream";
import { Response } from "express";

export interface StorageFile {
    stream: Readable;
    contentType?: string;
    contentLength?: number;
}

export interface IStorageProvider {
    getUploadUrl(filePath: string, contentType?: string): Promise<string>;
    getFile(filePath: string): Promise<StorageFile>;
    // deleteFile(filePath: string): Promise<void>; 
}

export class S3StorageProvider implements IStorageProvider {
    private client: S3Client;
    private bucket: string;

    constructor() {
        const region = process.env.AWS_REGION || "us-east-1";
        const endpoint = process.env.S3_ENDPOINT; // Optional for DigitalOcean/MinIO
        this.bucket = process.env.AWS_BUCKET || "";

        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !this.bucket) {
            throw new Error("AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET) are missing.");
        }

        this.client = new S3Client({
            region,
            endpoint,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            },
            forcePathStyle: !!endpoint // Needed for MinIO/some S3 clones
        });
    }

    async getUploadUrl(filePath: string, contentType: string = "application/octet-stream"): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
            ContentType: contentType
        });
        return await getSignedUrl(this.client, command, { expiresIn: 3600 });
    }

    async getFile(filePath: string): Promise<StorageFile> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: filePath
        });
        const response = await this.client.send(command);
        return {
            stream: response.Body as Readable,
            contentType: response.ContentType,
            contentLength: response.ContentLength
        };
    }
}

export class LocalStorageProvider implements IStorageProvider {
    public readonly rootDir: string;

    constructor() {
        this.rootDir = process.env.STORAGE_LOCAL_ROOT || "uploads";
        if (!fs.existsSync(this.rootDir)) {
            fs.mkdirSync(this.rootDir, { recursive: true });
        }
    }

    async getUploadUrl(filePath: string, contentType: string): Promise<string> {
        // Return a local API URL that the frontend can PUT to.
        // The token ensures we know where to save it. 
        // For simplicity, we assume the path is safe or sanitized by the caller.
        // We'll encode the path in the URL.
        const encodedPath = encodeURIComponent(filePath);
        const baseUrl = process.env.APP_URL || ""; // e.g. https://api.mysite.com
        return `${baseUrl}/api/storage/upload/local?path=${encodedPath}`;
    }

    async getFile(filePath: string): Promise<StorageFile> {
        const fullPath = path.join(this.rootDir, filePath);

        // Prevent directory traversal
        if (!fullPath.startsWith(path.resolve(this.rootDir))) {
            throw new Error("Invalid file path");
        }

        if (!fs.existsSync(fullPath)) {
            throw new Error("File not found");
        }

        const stat = await promisify(fs.stat)(fullPath);
        return {
            stream: fs.createReadStream(fullPath),
            contentLength: stat.size,
            contentType: "application/octet-stream" // We might need to store mime type separately or guess it
        };
    }
}
