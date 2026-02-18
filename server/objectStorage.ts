
import { Response, Request } from "express";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { IStorageProvider, S3StorageProvider, LocalStorageProvider, StorageFile, AzureBlobStorageProvider } from "./services/storage-provider";

// Basic object ACL functionality inline for simplicity
export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
}

export class ObjectNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjectNotFoundError";
  }
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}



// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  private provider: IStorageProvider;
  private providerType: string;

  constructor() {
    const type = process.env.STORAGE_PROVIDER || (process.env.REPLIT_ID ? "GOOGLE" : "LOCAL");
    this.providerType = type;

    switch (type) {
      case "S3":
        this.provider = new S3StorageProvider();
        break;
      case "AZURE":
        this.provider = new AzureBlobStorageProvider();
        break;
      case "LOCAL":
      default:
        this.provider = new LocalStorageProvider();
        break;
    }
  }

  // Gets the public object search paths. (Legacy/Google only)
  getPublicObjectSearchPaths(): Array<string> {
    // Keep existing logic if anyone uses it?
    return [];
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const filePath = `uploads/${objectId}`; // Relative path
    return this.provider.getUploadUrl(filePath, "application/octet-stream");
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<StorageFile> {
    // Normalize path
    let normalizedPath = objectPath;
    if (objectPath.startsWith("/objects/")) {
      normalizedPath = objectPath.slice(9); // remove /objects/
    } else if (objectPath.startsWith("/")) {
      normalizedPath = objectPath.slice(1);
    }

    // For Google/Replit, we might need full path with bucket?
    // Logic in GoogleReplitProvider handles that?
    // Wait, Google provider needs 'PRIVATE_OBJECT_DIR'.
    // If we strip prefixes, we need to re-add?



    return this.provider.getFile(normalizedPath);
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // If rawPath is URL, we might want to extract path?
    // getObjectEntityUploadURL returns URL.
    // Client sends that URL back as 'attachmentURL'.
    // We need to store a path we can retrieve later.

    try {
      const url = new URL(rawPath);
      // If local upload URL: .../api/storage/upload/local?path=encoded
      if (url.searchParams.has("path")) {
        return decodeURIComponent(url.searchParams.get("path")!);
      }

      // Azure Blob URL: https://account.blob.../container/blobPath...
      if (this.providerType === "AZURE") {
        const segments = url.pathname.split('/').filter(p => p.length > 0);
        if (segments.length > 1) {
          return segments.slice(1).join('/');
        }
      }
      // If S3 signed URL: https://bucket.s3.../key?...
      // We want the Key.
      return url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
    } catch (e) {
      // Not a URL, return as is
      return rawPath;
    }
  }

  async downloadObject(file: StorageFile, res: Response, cacheTtlSec: number = 3600) {
    try {
      const isPublic = false;
      res.set({
        "Content-Type": file.contentType || "application/octet-stream",
        "Content-Length": file.contentLength ? String(file.contentLength) : undefined,
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });

      file.stream.pipe(res);

      file.stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) res.status(500).end();
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) res.status(500).json({ error: "Error downloading file" });
    }
  }

  // Helper for Local Storage upload handling
  async handleLocalUpload(req: Request, res: Response) {
    if (this.providerType !== "LOCAL") {
      return res.status(400).json({ error: "Local storage not enabled" });
    }

    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: "Missing path" });

    const provider = this.provider as LocalStorageProvider;
    // We manually implement save since provider interface is minimal
    // Or we cast to LocalStorageProvider if we exposed a save method?
    // But define save logic here:

    const rootDir = (provider as any).rootDir; // Hack or expose it?
    // Better: add saveStream to interface? No, S3 uses signed URL.

    // Direct file write
    const fullPath = `${rootDir}/${filePath}`;
    // Ensure dir exists
    const dir = fullPath.split("/").slice(0, -1).join("/");
    const fs = require("fs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const writeStream = fs.createWriteStream(fullPath);
    req.pipe(writeStream);

    writeStream.on("finish", () => {
      res.json({ success: true, path: filePath });
    });

    writeStream.on("error", (err: any) => {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    });
  }
}

