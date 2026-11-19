import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { CheckCircle2, FileImage, FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/feedback";
import { formatFileSize } from "@/lib/formatters";
import { billService, type UploadedFilePayload } from "@/mocks/services/billService";
import { cn } from "@/lib/utils";

interface QueuedFile {
  id: string;
  file: File;
  previewDataUrl?: string;
}

interface UploadBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadBillDialog({ open, onOpenChange }: UploadBillDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [queued, setQueued] = React.useState<QueuedFile[]>([]);
  const [progress, setProgress] = React.useState(0);
  const [processingStage, setProcessingStage] = React.useState<string | null>(null);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setQueued((prev) => [
            ...prev,
            { id, file, previewDataUrl: typeof reader.result === "string" ? reader.result : undefined },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setQueued((prev) => [...prev, { id, file }]);
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 10 * 1024 * 1024,
    onDropRejected: () => {
      toast.error("Please select PDF, JPG, JPEG, or PNG files under 10 MB.");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (items: UploadedFilePayload[]) => {
      setProcessingStage("Uploading invoice files...");
      setProgress(25);
      await new Promise((r) => setTimeout(r, 260));
      setProcessingStage("Preparing simulated demo extraction...");
      setProgress(65);
      await new Promise((r) => setTimeout(r, 320));
      setProgress(90);
      const created = await billService.simulateUpload(items);
      setProgress(100);
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-snapshot"] });
      toast.success(
        `${created.length} ${created.length === 1 ? "bill" : "bills"} prepared for review.`
      );
      setQueued([]);
      setProgress(0);
      setProcessingStage(null);
      onOpenChange(false);
      if (created.length === 1) {
        navigate(`/bills/${created[0].id}/review`);
      }
    },
    onError: () => {
      setProcessingStage(null);
      setProgress(0);
      toast.error("Could not process selected files.");
    },
  });

  const handleClose = (nextOpen: boolean) => {
    if (!uploadMutation.isPending) {
      if (!nextOpen) {
        setQueued([]);
        setProgress(0);
        setProcessingStage(null);
      }
      onOpenChange(nextOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Upload bills</DialogTitle>
          <DialogDescription>
            Add supplier invoices to stage mock extracted details for review. No external OCR service is called in this demo.
          </DialogDescription>
        </DialogHeader>

        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-9 text-center transition-colors cursor-pointer",
            isDragActive
              ? "border-[var(--brand-burgundy)] bg-[var(--brand-burgundy-bg)]/60"
              : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--brand-burgundy)]/65"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--brand-burgundy)]/20 bg-[var(--brand-burgundy-bg)] text-[var(--brand-burgundy)]">
            <UploadCloud className="h-5 w-5" />
          </div>
          <p className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">
            Drop your invoice here
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            or <span className="font-medium text-[var(--brand-burgundy)] underline">browse files</span> from your computer
          </p>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Supported: PDF, JPG, JPEG, PNG · Max 10 MB per file
          </p>
        </div>

        {queued.length > 0 && (
          <div className="mt-3 space-y-2 max-h-[210px] overflow-y-auto">
            {queued.map((item) => {
              const isImage = item.file.type.startsWith("image/");
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2"
                >
                  {item.previewDataUrl ? (
                    <img
                      src={item.previewDataUrl}
                      alt={item.file.name}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 rounded border border-[var(--border-subtle)] object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--brand-navy)] shrink-0">
                      {isImage ? <FileImage className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                      {(item.file.name.split(".").pop() || "FILE").toUpperCase()} ·{" "}
                      {formatFileSize(item.file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={uploadMutation.isPending}
                    onClick={() => setQueued((prev) => prev.filter((q) => q.id !== item.id))}
                    aria-label={`Remove ${item.file.name}`}
                    className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger)] cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {processingStage && (
          <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                {progress < 100 ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--brand-burgundy)]" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--brand-teal)]" />
                )}
                {processingStage}
              </span>
              <span className="font-mono-data text-[11px] text-[var(--text-secondary)] tabular-nums">
                {progress}%
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={uploadMutation.isPending}
            onClick={() => handleClose(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={queued.length === 0 || uploadMutation.isPending}
            onClick={() =>
              uploadMutation.mutate(
                queued.map((q) => ({ file: q.file, previewDataUrl: q.previewDataUrl }))
              )
            }
          >
            {uploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Upload {queued.length > 0 ? `(${queued.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
