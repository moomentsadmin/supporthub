import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from "@azure/storage-blob";
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

export class AzureBlobStorageProvider implements IStorageProvider {
    private client: BlobServiceClient;
    private containerName: string;
    private accountName: string;
    private accountKey: string;

    constructor() {
        this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "";
        this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || "";
        this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "supporthub-uploads";

        if (!this.accountName || !this.accountKey) {
            // Only throw if this provider is actively selected
            // But constructor is called inside factory?
            // Checking lazily might be better, but strict is okay.
            if (process.env.STORAGE_PROVIDER === "AZURE") {
                throw new Error("Azure Storage credentials (AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY) are missing.");
            }
        }

        if (this.accountName && this.accountKey) {
            const credential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
            this.client = new BlobServiceClient(
                `https://${this.accountName}.blob.core.windows.net`,
                credential
            );
        } else {
            // Mock client or null? Throw error if methods called?
            this.client = {} as any;
        }
    }

    async getUploadUrl(filePath: string, contentType: string = "application/octet-stream"): Promise<string> {
        if (!this.accountName) throw new Error("Azure Storage credentials missing");

        const containerClient = this.client.getContainerClient(this.containerName);
        await containerClient.createIfNotExists();

        const permissions = new BlobSASPermissions();
        permissions.write = true;
        permissions.create = true;
        permissions.read = true;

        const startsOn = new Date();
        const expiresOn = new Date(startsOn.valueOf() + 3600 * 1000); // 1 hour

        const credential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
        const sasToken = generateBlobSASQueryParameters({
            containerName: this.containerName,
            blobName: filePath,
            permissions,
            startsOn,
            expiresOn,
            contentType
        }, credential).toString();

        return `${containerClient.getBlockBlobClient(filePath).url}?${sasToken}`;
    }

    async getFile(filePath: string): Promise<StorageFile> {
        if (!this.accountName) throw new Error("Azure Storage credentials missing");

        const containerClient = this.client.getContainerClient(this.containerName);
        const blobClient = containerClient.getBlockBlobClient(filePath);

        const downloadBlockBlobResponse = await blobClient.download();

        if (!downloadBlockBlobResponse.readableStreamBody) {
            throw new Error("Failed to download blob stream");
        }

        return {
            stream: downloadBlockBlobResponse.readableStreamBody as Readable,
            contentType: downloadBlockBlobResponse.contentType,
            contentLength: downloadBlockBlobResponse.contentLength
        };
    }
}
