"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import {
  Upload,
  FileText,
  ImageIcon,
  X,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface NewCaseFormProps {
  onSuccess: () => void;
}

export default function NewCaseForm({ onSuccess }: NewCaseFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clientNotes: "",
    clientContext: "",
    clientAgreement: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypes = [
    { name: "Nakaz zapłaty", description: "Sądowy nakaz zapłaty" },
    {
      name: "Wezwanie komornika",
      description: "Wezwanie do zapłaty od komornika",
    },
    { name: "Pozew sądowy", description: "Pozew do sądu cywilnego" },
    { name: "Upomnienie", description: "Upomnienie przedsądowe" },
    { name: "Inne", description: "Inny dokument prawny" },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter((file) => {
      const allowedTypes = [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'image/jpeg',
        'image/jpg', 
        'image/png'
      ];
      
      const isValidType = allowedTypes.includes(file.type) ||
        file.type.includes("pdf") || 
        file.type.includes("image") ||
        file.name.toLowerCase().endsWith('.doc') ||
        file.name.toLowerCase().endsWith('.docx');
      
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      // Check max file count (5 files)
      if (files.length >= 5) {
        toast({
          title: "Zbyt wiele plików",
          description: "Możesz przesłać maksymalnie 5 plików.",
          variant: "destructive",
        });
        return false;
      }

      if (!isValidType) {
        toast({
          title: "Nieprawidłowy format pliku",
          description: `Plik ${file.name} ma nieprawidłowy format. Akceptujemy PDF, DOC, DOCX, JPG, PNG.`,
          variant: "destructive",
        });
        return false;
      }

      if (!isValidSize) {
        toast({
          title: "Plik za duży",
          description: `Plik ${file.name} jest za duży. Maksymalny rozmiar to 10MB.`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    setFiles([...files, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes("pdf")) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Błąd walidacji",
        description: "Tytuł sprawy jest wymagany.",
        variant: "destructive",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: "Błąd walidacji",
        description: "Musisz przesłać przynajmniej jeden dokument.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Use casesApi instead of direct fetch
      const { casesApi } = await import("@/lib/api/cases");
      const result = await casesApi.createCase({
        title: formData.title,
        description: formData.description,
        client_notes: formData.clientNotes,
        client_context: formData.clientContext,
        client_agreement: formData.clientAgreement,
        files: files,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Sprawa utworzona pomyślnie!",
        description: `Sprawa "${formData.title}" została dodana. Rozpoczynamy analizę dokumentów.`,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        clientNotes: "",
        clientContext: "",
        clientAgreement: "",
      });
      setFiles([]);
      setUploadProgress(0);

      // Call success callback
      onSuccess();
    } catch (error) {
      console.error("Error creating case:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć sprawy. Spróbuj ponownie.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Case Type Selection */}
      <div className="space-y-3">
        <Label>Rodzaj dokumentu *</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {documentTypes.map((type, index) => (
            <Button
              key={index}
              type="button"
              variant={formData.title === type.name ? "default" : "outline"}
              onClick={() => setFormData({ ...formData, title: type.name })}
              className="flex flex-col h-auto py-4 px-3 text-center"
            >
              <span className="font-medium text-base">{type.name}</span>
              <span className="text-xs text-gray-500 mt-1">
                {type.description}
              </span>
            </Button>
          ))}
        </div>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Wpisz tytuł sprawy (np. Nakaz zapłaty z dnia 12.03.2024)"
          required
          className="mt-4"
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Opis sprawy</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          placeholder="Opisz krótko swoją sytuację prawną..."
        />
      </div>

      {/* Client Context - What client expects */}
      <div>
        <Label htmlFor="clientContext">
          Czego oczekujesz od nas? *
          <span className="text-sm font-normal text-gray-600 block mt-1">
            Opisz jak najdokładniej czego oczekujesz od analizy i dalszych działań prawnych
          </span>
        </Label>
        <Textarea
          id="clientContext"
          name="clientContext"
          value={formData.clientContext}
          onChange={handleInputChange}
          rows={4}
          placeholder="Np. Chcę sprawdzić czy nakaz zapłaty jest uzasadniony, czy mogę się odwołać, jakie mam opcje obrony, czy grozi mi egzekucja..."
          className="mt-2"
        />
        <div className="mt-2 text-xs text-gray-500">
          💡 <strong>Podpowiedzi:</strong> Opisz swoje obawy, pytania, czy chcesz się odwołać, negocjować, czy szukasz innych rozwiązań.
        </div>
      </div>

      {/* Client Agreement */}
      <div>
        <Label htmlFor="clientAgreement">
          Czy zgadzasz się z treścią otrzymanego dokumentu? *
          <span className="text-sm font-normal text-gray-600 block mt-1">
            Wyjaśnij swoje stanowisko wobec dokumentu i dlaczego tak uważasz
          </span>
        </Label>
        <Textarea
          id="clientAgreement"
          name="clientAgreement"
          value={formData.clientAgreement}
          onChange={handleInputChange}
          rows={4}
          placeholder="Np. Nie zgadzam się z żądaniem, ponieważ... / Częściowo się zgadzam, ale... / Zgadzam się, ale potrzebuję pomocy w..."
          className="mt-2"
        />
        <div className="mt-2 text-xs text-gray-500">
          💡 <strong>Podpowiedzi:</strong> Czy kwota jest prawidłowa? Czy terminz były zachowane? Czy masz dowody przeciwne? Czy były nieprawidłowości w postępowaniu?
        </div>
      </div>

      {/* Document Upload */}
      <Card className="border-dashed border-2 border-gray-300 p-6 text-center">
        <CardContent className="p-0">
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            ref={fileInputRef}
          />
          <Label htmlFor="file-upload" className="cursor-pointer block">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Upload className="h-10 w-10 text-blue-500" />
              <p className="text-lg font-semibold text-gray-900">
                Przeciągnij i upuść pliki tutaj
              </p>
              <p className="text-sm text-gray-600">lub</p>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Wybierz pliki
              </Button>
              <p className="text-xs text-gray-500">
                PDF, JPG, PNG (max 10MB na plik)
              </p>
            </div>
          </Label>

          {files.length > 0 && (
            <div className="mt-6 space-y-3 text-left">
              <h4 className="font-semibold text-gray-800">Przesłane pliki:</h4>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center">
                    {getFileIcon(file)}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Notes */}
      <div>
        <Label htmlFor="clientNotes">Dodatkowe uwagi dla prawnika</Label>
        <Textarea
          id="clientNotes"
          name="clientNotes"
          value={formData.clientNotes}
          onChange={handleInputChange}
          rows={3}
          placeholder="Wszelkie dodatkowe informacje, które mogą być pomocne dla prawnika."
        />
      </div>

      {isSubmitting && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-center text-sm text-gray-600">
            {uploadProgress < 100
              ? `Wysyłanie dokumentów... ${uploadProgress}%`
              : "Przetwarzanie sprawy..."}
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Tworzenie sprawy...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Utwórz Nową Sprawę
          </>
        )}
      </Button>
    </form>
  );
}
