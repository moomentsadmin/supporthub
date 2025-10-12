import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, File, Image, FileText, Archive } from "lucide-react";
import type { Attachment } from "@shared/schema";

interface AttachmentListProps {
  ticketId: string;
  className?: string;
}

export function AttachmentList({ ticketId, className }: AttachmentListProps) {
  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ["/api/tickets", ticketId, "attachments"],
    enabled: !!ticketId,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading attachments...</div>
        </CardContent>
      </Card>
    );
  }

  if (attachments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No attachments</div>
        </CardContent>
      </Card>
    );
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (mimeType.includes('pdf') || mimeType.includes('text')) {
      return <FileText className="h-4 w-4" />;
    } else if (mimeType.includes('zip') || mimeType.includes('rar')) {
      return <Archive className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (attachment: Attachment) => {
    // Create a link and trigger download
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">Attachments ({attachments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {getFileIcon(attachment.mimeType)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {attachment.originalName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {attachment.mimeType}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(attachment)}
              className="flex-shrink-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}