"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { FileText, Eye } from "lucide-react";
import SpacesUploader from "@/components/documents/SpacesUploader";
import { lawFirmAPI } from "@/lib/api/client";

export type CaseDocItem = {
  id: number | string;
  name: string; // display name
  sizeBytes?: number | null;
  uploadedAt?: Date | string | null;
  type?: string | null; // "pdf" | "image" | ... (optional)
};

export type CaseDocumentsSectionProps = {
  caseId: number;
  documents: CaseDocItem[];
  onRefresh?: () => void;
  onPreview?: (docId: number | string) => Promise<void> | void;
  onDownload?: (docId: number | string) => Promise<void> | void;
  onDelete?: (docId: number | string) => Promise<void> | void;
  title?: string;
};

export default function CaseDocumentsSection({
  caseId,
  documents,
  onRefresh,
  onPreview,
  onDownload,
  onDelete,
  title = "Dokumenty",
}: CaseDocumentsSectionProps) {
  const [limits, setLimits] = useState<{ max_file_size_mb: number; max_files_per_case: number; allowed_file_types: string[] } | null>(null);
  useEffect(() => {
    let mounted = true;
    lawFirmAPI.getUploadLimits().then((l) => {
      if (mounted) setLimits(l);
    }).catch(() => {/* non-blocking */});
    return () => { mounted = false; };
  }, []);

  const fmtSize = (bytes?: number | null) => {
    if (!bytes && bytes !== 0) return "";
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const fmtDate = (d?: Date | string | null) => {
    if (!d) return "";
    try {
      const dt = d instanceof Date ? d : new Date(d);
      return dt.toLocaleDateString("pl-PL");
    } catch {
      return String(d);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium">
        {title} <Badge variant="secondary" className="ml-2">{documents.length}</Badge>
      </h4>

      {limits && (
        <div className="text-xs text-gray-600 bg-gray-50 border rounded p-2">
          <div>Maks. rozmiar pliku: <span className="font-medium">{limits.max_file_size_mb} MB</span></div>
          <div>Dozwolone typy: <span className="font-medium">{limits.allowed_file_types.join(", ")}</span></div>
          <div>Pozostało plików dla sprawy: <span className="font-medium">{Math.max(0, limits.max_files_per_case - documents.length)}</span> / {limits.max_files_per_case}</div>
        </div>
      )}

      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-gray-500 mr-2" />
              <div>
                <span className="text-sm font-medium">{doc.name}</span>
                <div className="text-xs text-gray-500">
                  {fmtSize(doc.sizeBytes)}{doc.uploadedAt ? ` • ${fmtDate(doc.uploadedAt)}` : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Podgląd"
                  onClick={async () => {
                    try { await onPreview(doc.id); } catch (e) { toast({ title: "Błąd podglądu", variant: "destructive" }); }
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Pobierz"
                  onClick={async () => {
                    try { await onDownload(doc.id); } catch { toast({ title: "Błąd pobierania", variant: "destructive" }); }
                  }}
                >
                  Pobierz
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Usuń"
                  onClick={async () => {
                    try { await onDelete(doc.id); } catch { toast({ title: "Błąd usuwania", variant: "destructive" }); }
                  }}
                >
                  Usuń
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t mt-3">
        {limits && documents.length >= limits.max_files_per_case ? (
          <div className="text-sm text-gray-500">Osiągnięto maksymalną liczbę plików dla tej sprawy.</div>
        ) : (
          <SpacesUploader caseId={Number(caseId)} onUploaded={onRefresh} />
        )}
      </div>
    </div>
  );
}
