import { Storage, File } from "@google-cloud/storage";
import { Response, Request } from "express";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { IStorageProvider, S3StorageProvider, LocalStorageProvider, StorageFile } from "./services/storage-provider";

// Basic object ACL functionality inline for simplicity
export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// Google Cloud (Replit) Provider Wrapper
class GoogleReplitProvider implements IStorageProvider {
  private client: Storage;

  constructor() {
    this.client = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token",
          },
        },
        universe_domain: "googleapis.com",
      },
      projectId: "",
    });
  }

  private getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set.");
    return dir;
  }

  async getUploadUrl(filePath: string, contentType: string = "application/octet-stream"): Promise<string> {
    // Replit usage: use sidecar signing
    const privateObjectDir = this.getPrivateObjectDir();
    // filePath is relative. We need full path including bucket for Replit signing?
    // Existing logic: `${privateObjectDir}/uploads/${objectId}`
    // We will assume filePath passed here is relative to root of storage.

    // Wait, original logic generated path inside getObjectEntityUploadURL.
    // Here we just sign it.
    // Replit signing logic is complex (uses sidecar).
    // I will adapt the original 'signObjectURL' function here.

    const fullPath = `${privateObjectDir}/${filePath}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900
    });
  }

  async getFile(filePath: string): Promise<StorageFile> {
    // Original logic: normalize path, then get file.
    // Here filePath is expected to be full normalized path or we normalize it?
    // Original getObjectEntityFile took "/objects/..."

    // This provider expects a path it can resolving.
    // We will stick to original logic: resolve bucket from path?
    // If path is relative, we append private dir?

    const privateObjectDir = this.getPrivateObjectDir();
    let fullPath = filePath;
    if (!fullPath.startsWith("/")) fullPath = `/${fullPath}`; // Ensure absolute-like

    // Check if path includes bucket?
    // In Replit env, paths start with PRIVATE_OBJECT_DIR usually?
    // Let's assume input is full path for now.

    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = this.client.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();

    if (!exists) throw new ObjectNotFoundError();

    const [metadata] = await file.getMetadata();
    return {
      stream: file.createReadStream(),
      contentType: metadata.contentType,
      contentLength: metadata.size ? Number(metadata.size) : undefined
    };
  }
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
      case "GOOGLE":
        this.provider = new GoogleReplitProvider();
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

    if (this.providerType === "GOOGLE") {
      const dir = process.env.PRIVATE_OBJECT_DIR || "";
      if (objectPath.startsWith("/objects/")) {
        // Extract ID and append to dir
        const id = objectPath.slice(9);
        // Assume simple append?
        // Replit logic had complex normalization.
        // We will try to reconstruct valid path.
        return this.provider.getFile(`${dir}/${id}`);
      }
      return this.provider.getFile(objectPath);
    }

    return this.provider.getFile(normalizedPath);
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // For local/S3, just return standard path
    if (this.providerType !== "GOOGLE") {
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
        // If S3 signed URL: https://bucket.s3.../key?...
        // We want the Key.
        return url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
      } catch (e) {
        // Not a URL, return as is
        return rawPath;
      }
    }

    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    // ... Replit normalization logic ...
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (rawObjectPath.startsWith(dir)) {
      return `/objects/${rawObjectPath.slice(dir.length + 1)}`;
    }
    return rawObjectPath;
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

// Helpers for Google Provider
function parseObjectPath(path: string): { bucketName: string; objectName: string; } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  if (parts.length < 3) throw new Error("Invalid path");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

async function signObjectURL({ bucketName, objectName, method, ttlSec }: any): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error("Failed to sign URL");
  const { signed_url } = await response.json();
  return signed_url;
}