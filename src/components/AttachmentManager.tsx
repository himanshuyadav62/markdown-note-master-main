import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PaperclipIcon, XIcon, FileIcon, FileTextIcon, FilePdfIcon, FileArchiveIcon, FileImageIcon, DownloadSimpleIcon, EyeIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { Attachment } from '@/lib/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useRef, DragEvent } from 'react';

interface AttachmentManagerProps {
  attachments: Attachment[];
  onAdd: (attachments: Attachment[]) => void;
  onRemove: (id: string) => void;
}

export function AttachmentManager({ attachments, onAdd, onRemove }: AttachmentManagerProps) {
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return FileImageIcon;
    if (type.includes('pdf')) return FilePdfIcon;
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return FileArchiveIcon;
    if (type.includes('text')) return FileTextIcon;
    return FileIcon;
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      try {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          id: Date.now().toString() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          data,
          uploadedAt: Date.now()
        });
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newAttachments.length > 0) {
      onAdd(newAttachments);
      toast.success(`${newAttachments.length} file(s) attached`);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    await processFiles(files);
  };

  const downloadAttachment = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name;
    link.click();
    toast.success(`Downloaded ${attachment.name}`);
  };

  const viewAttachment = (attachment: Attachment) => {
    if (attachment.type.startsWith('image/')) {
      setPreviewAttachment(attachment);
    } else if (attachment.type === 'application/pdf') {
      window.open(attachment.data, '_blank');
    } else if (attachment.type.startsWith('text/')) {
      fetch(attachment.data)
        .then(res => res.blob())
        .then(blob => blob.text())
        .then(text => {
          const newWindow = window.open();
          if (newWindow) {
            newWindow.document.write(`<pre>${text}</pre>`);
          }
        });
    } else {
      downloadAttachment(attachment);
    }
  };

  return (
    <div className="border-t border-border bg-muted/30 flex flex-col h-full overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      <div className="p-4 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <PaperclipIcon size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium">Attachments</span>
            {attachments.length > 0 && (
              <span className="text-xs text-muted-foreground">({attachments.length})</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFileSelect}
          >
            <PaperclipIcon size={16} className="mr-1" />
            Add Files
          </Button>
        </div>

        {attachments.length > 0 ? (
          <ScrollArea className="flex-1 h-0">
            <div className="space-y-2 pr-4">
              {attachments.map((attachment) => {
                const IconComponent = getFileIcon(attachment.type);
                return (
                  <Card
                    key={attachment.id}
                    className="p-3 flex items-center gap-3 hover:bg-accent/10 transition-colors group cursor-pointer"
                    onClick={() => viewAttachment(attachment)}
                  >
                    <IconComponent size={24} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewAttachment(attachment);
                        }}
                        title="View"
                      >
                        <EyeIcon size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAttachment(attachment);
                        }}
                        title="Download"
                      >
                        <DownloadSimpleIcon size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(attachment.id);
                        }}
                        title="Remove"
                      >
                        <XIcon size={18} />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div
            className={`text-center py-8 border-2 border-dashed rounded-lg transition-colors ${
              isDragOver ? 'border-accent bg-accent/10' : 'border-border'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <UploadSimpleIcon size={40} className={`mx-auto mb-2 ${isDragOver ? 'text-accent' : 'text-muted-foreground'}`} />
            <p className="text-sm text-muted-foreground mb-1">
              {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-xs text-muted-foreground mb-3">or</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFileSelect}
            >
              <PaperclipIcon size={16} className="mr-1" />
              Browse Files
            </Button>
          </div>
        )}
      </div>

      <Dialog open={previewAttachment !== null} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span className="truncate">{previewAttachment?.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewAttachment && downloadAttachment(previewAttachment)}
                className="ml-4"
              >
                <DownloadSimpleIcon size={16} className="mr-1" />
                Download
              </Button>
            </DialogTitle>
          </DialogHeader>
          {previewAttachment?.type.startsWith('image/') && (
            <div className="flex items-center justify-center p-4">
              <img
                src={previewAttachment.data}
                alt={previewAttachment.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
