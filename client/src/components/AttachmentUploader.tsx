import { useState } from "react";
import { ObjectUploader } from "./ObjectUploader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Paperclip, Upload } from "lucide-react";
import type { UploadResult } from "@uppy/core";

interface AttachmentUploaderProps {
  ticketId?: string;
  messageId?: string;
  onUploadComplete?: () => void;
  className?: string;
}

export function AttachmentUploader({ 
  ticketId, 
  messageId, 
  onUploadComplete, 
  className 
}: AttachmentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleGetUploadParameters = async () => {
    try {
      const response = await fetch("/api/objects/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }
      
      const data = await response.json();
      
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      throw new Error("Failed to get upload URL");
    }
  };

  const handleComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (!result.successful || result.successful.length === 0) {
      toast({
        title: "Upload failed",
        description: "No files were uploaded successfully.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      for (const file of result.successful) {
        const response = await fetch("/api/attachments", {
          method: "PUT",
          body: JSON.stringify({
            attachmentURL: file.uploadURL,
            ticketId,
            messageId,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to save attachment");
        }
      }

      toast({
        title: "Upload successful",
        description: `${result.successful.length} file(s) uploaded successfully.`,
      });

      // Invalidate attachments cache
      if (ticketId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "attachments"] });
      }
      
      onUploadComplete?.();
    } catch (error) {
      console.error("Failed to save attachment:", error);
      toast({
        title: "Upload failed",
        description: "Files uploaded but failed to save attachment records.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ObjectUploader
      maxNumberOfFiles={5}
      maxFileSize={10485760} // 10MB
      onGetUploadParameters={handleGetUploadParameters}
      onComplete={handleComplete}
      buttonClassName={className}
    >
      <div className="flex items-center gap-2">
        {isUploading ? (
          <>
            <Upload className="h-4 w-4 animate-spin" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <Paperclip className="h-4 w-4" />
            <span>Add Attachments</span>
          </>
        )}
      </div>
    </ObjectUploader>
  );
}