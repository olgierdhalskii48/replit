"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { lawFirmAPI } from "@/lib/api/client";
import { LawFirmAPIError } from "@/lib/api/types";

export type SpacesUploaderProps = {
  caseId: number;
  onUploaded?: () => void;
};

type FileItem = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "confirming" | "done" | "error";
  error?: string;
};

export default function SpacesUploader({ caseId, onUploaded }: SpacesUploaderProps) {
  const [limits, setLimits] = useState<{ max_file_size_mb: number; max_files_per_case: number; allowed_file_types: string[] } | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const apiBase = useMemo(() => {
    if (typeof window !== 'undefined') {
      return (process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin).replace(/\/$/, "");
    }
    return (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  }, []);

  useEffect(() => {
    let isMounted = true;
    lawFirmAPI
      .getUploadLimits()
      .then((l) => {
        if (isMounted) setLimits(l);
      })
      .catch(() => {
        // Non-blocking; component will still work with backend validation only
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files?.length) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const acceptAttr = useMemo(() => {
    if (!limits) return undefined;
    // Map allowed extensions to accept string like .pdf,.jpg
    return limits.allowed_file_types.map((ext) => `.${ext}`).join(",");
  }, [limits]);

  const onSelectFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const items: FileItem[] = selected.map((f) => ({ file: f, progress: 0, status: "pending" }));

    // Optional client-side validation based on limits
    const errors: string[] = [];
    if (limits) {
      for (const it of items) {
        if (it.file.size > limits.max_file_size_mb * 1024 * 1024) {
          errors.push(`${it.file.name}: przekracza ${limits.max_file_size_mb}MB`);
          it.status = "error";
          it.error = `Za duży plik (>${limits.max_file_size_mb}MB)`;
        }
        const ext = it.file.name.toLowerCase().split(".").pop() || "";
        if (!limits.allowed_file_types.includes(ext)) {
          errors.push(`${it.file.name}: niedozwolony format .${ext}`);
          it.status = "error";
          it.error = `Niedozwolony format`;
        }
      }
      if (errors.length) {
        toast({ title: "Niektóre pliki odrzucono", description: errors.join("\n"), variant: "destructive" });
      }
    }

    setFiles((prev) => [...prev, ...items]);
    // reset input
    e.target.value = "";
  };

  const onFilesSelected = (filesList: FileList) => {
    const items: FileItem[] = Array.from(filesList).map((f) => ({ file: f, progress: 0, status: "pending" }));

    // Optional client-side validation based on limits
    const errors: string[] = [];
    if (limits) {
      for (const it of items) {
        if (it.file.size > limits.max_file_size_mb * 1024 * 1024) {
          errors.push(`${it.file.name}: przekracza ${limits.max_file_size_mb}MB`);
          it.status = "error";
          it.error = `Za duży plik (>${limits.max_file_size_mb}MB)`;
        }
        const ext = it.file.name.toLowerCase().split(".").pop() || "";
        if (!limits.allowed_file_types.includes(ext)) {
          errors.push(`${it.file.name}: niedozwolony format .${ext}`);
          it.status = "error";
          it.error = `Niedozwolony format`;
        }
      }
      if (errors.length) {
        toast({ title: "Niektóre pliki odrzucono", description: errors.join("\n"), variant: "destructive" });
      }
    }

    setFiles((prev) => [...prev, ...items]);
  };

  const uploadOne = async (item: FileItem) => {
    const f = item.file;
    item.status = "uploading";
    setFiles((prev) => [...prev]);

    // 1) presign
    let presign: { url: string; fields: Record<string, string>; key: string };
    try {
      presign = await lawFirmAPI.presignDocument(caseId, {
        filename: f.name,
        content_type: f.type || undefined,
      });
    } catch (e) {
      const err = e as any;
      let message = "Nie udało się przygotować przesyłania";
      if (err instanceof LawFirmAPIError) {
        if (err.statusCode === 503) {
          // Fallback: classic multipart upload directly to backend
          try {
            const fd = new FormData();
            fd.append("files", f);
            const resp = await fetch(`${apiBase}/api/v1/documents/upload/${caseId}`, {
              method: "POST",
              body: fd,
              // Do not set Content-Type manually; browser will set multipart boundary
            });
            if (resp.ok) {
              // Mark as done and refresh
              item.status = "done";
              item.progress = 100;
              setFiles((prev) => [...prev]);
              toast({ title: "Przesłano plik (tryb awaryjny)", description: f.name });
              if (onUploaded) onUploaded();
              return;
            }
            const data = await resp.json().catch(() => ({} as any));
            message = (data?.detail as string) || `Upload nieudany: HTTP ${resp.status}`;
          } catch (fetchErr) {
            message = "Magazyn plików nie jest skonfigurowany. Skontaktuj się z administratorem.";
          }
          setStorageWarning(message);
        } else if (typeof err.message === 'string') {
          message = err.message;
        }
      }
      item.status = "error";
      item.error = message;
      setFiles((prev) => [...prev]);
      toast({ title: "Błąd przesyłania", description: message, variant: "destructive" });
      return;
    }

    // 2) direct upload with retry/backoff
    const uploadWithRetry = async (attempt = 1): Promise<void> => {
      const form = new FormData();
      Object.entries(presign.fields).forEach(([k, v]) => form.append(k, v));
      form.append("file", f);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            item.progress = pct;
            setFiles((prev) => [...prev]);
          }
        };
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Spaces upload failed: HTTP ${xhr.status}`));
          }
        };
        xhr.open("POST", presign.url, true);
        xhr.send(form);
      }).catch(async (err) => {
        if (attempt < 3) {
          const delayMs = Math.pow(2, attempt) * 500;
          await new Promise((r) => setTimeout(r, delayMs));
          return uploadWithRetry(attempt + 1);
        }
        throw err;
      });
    };

    await uploadWithRetry();

    // 3) confirm
    item.status = "confirming";
    setFiles((prev) => [...prev]);

    try {
      await lawFirmAPI.confirmUploadedDocument({
        case_id: caseId,
        key: presign.key,
        original_filename: f.name,
        content_type: f.type || undefined,
        file_size: f.size,
      });
    } catch (e) {
      const err = e as any;
      let message = "Nie udało się zapisać dokumentu";
      if (err instanceof LawFirmAPIError) {
        if (err.statusCode === 503) {
          message = "Magazyn plików nie jest skonfigurowany. Skontaktuj się z administratorem.";
          setStorageWarning(message);
        } else if (typeof err.message === 'string') {
          message = err.message;
        }
      }
      item.status = "error";
      item.error = message;
      setFiles((prev) => [...prev]);
      toast({ title: "Błąd zapisu", description: message, variant: "destructive" });
      return;
    }

    item.status = "done";
    item.progress = 100;
    setFiles((prev) => [...prev]);
  };

  const startUpload = async () => {
    if (!files.length) return;
    setIsUploading(true);
    try {
      const queue = files.filter((it) => it.status === "pending" || it.status === "error");
      const maxConcurrent = 3;
      const workers = Array.from({ length: Math.min(maxConcurrent, queue.length) }, () =>
        (async function worker() {
          while (true) {
            const next = queue.shift();
            if (!next) break;
            await uploadOne(next);
          }
        })()
      );
      await Promise.all(workers);
      if (onUploaded) onUploaded();
    } finally {
      setIsUploading(false);
    }
  };

  const clearFinished = () => {
    setFiles((prev) => prev.filter((i) => i.status !== "done"));
  };

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed rounded-md p-4 bg-white hover:bg-gray-50 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="file"
            multiple
            onChange={onSelectFiles}
            className="max-w-sm"
          />
          <Button onClick={startUpload} disabled={isUploading || files.length === 0}>
            {isUploading ? "Wysyłanie..." : "Wyślij"}
          </Button>
          <Button variant="outline" onClick={clearFinished} disabled={!files.some(f => f.status === "done")}>
            Wyczyść zakończone
          </Button>
          <div className="text-xs text-gray-500">Przeciągnij i upuść pliki tutaj lub wybierz z dysku</div>
        </div>
      </div>

      {storageWarning && (
        <div className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded p-2">
          {storageWarning}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-2">
            {files.map((it, idx) => (
              <div key={idx} className="p-3 rounded border bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.file.name}</div>
                    <div className="text-xs text-gray-500">{(it.file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <div className="text-sm">
                    {it.status === "pending" && <span className="text-gray-600">Gotowy</span>}
                    {it.status === "uploading" && <span className="text-blue-600">Wysyłanie...</span>}
                    {it.status === "confirming" && <span className="text-purple-600">Zapisywanie...</span>}
                    {it.status === "done" && <span className="text-green-600">Gotowe</span>}
                    {it.status === "error" && <span className="text-red-600">Błąd</span>}
                  </div>
                </div>
                {(it.status === "uploading" || it.status === "confirming" || it.status === "done") && (
                  <div className="mt-2">
                    <Progress value={it.progress} />
                  </div>
                )}
                {it.error && <div className="text-xs text-red-600 mt-1">{it.error}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
