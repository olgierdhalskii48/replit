"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea as HTextarea, Tooltip as HTooltip } from "@heroui/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Tag,
  Star,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { authAPI } from "@/lib/api/auth";

interface Template {
  id: number;
  name: string;
  subject: string | null;
  content: string;
  category: "LEGAL_ADVICE" | "DOCUMENTS" | "CONSULTATION" | "GENERAL" | "URGENT" | string;
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

const categoryLabels = {
  LEGAL_ADVICE: "Porada prawna",
  DOCUMENTS: "Dokumenty",
  CONSULTATION: "Konsultacja",
  GENERAL: "Ogólne",
  URGENT: "Pilne",
} as const;

const categoryColors = {
  LEGAL_ADVICE: "bg-blue-100 text-blue-800",
  DOCUMENTS: "bg-green-100 text-green-800",
  CONSULTATION: "bg-purple-100 text-purple-800",
  GENERAL: "bg-gray-100 text-gray-800",
  URGENT: "bg-red-100 text-red-800",
} as const;

export default function OperatorTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    category: "GENERAL" as Template["category"],
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await authAPI.makeRequest<Template[]>("GET", "/templates", undefined, true);
      if (!data.length) seedDefaults(); else setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Błąd podczas pobierania szablonów");
    } finally {
      setLoading(false);
    }
  };

  const seedDefaults = async () => {
    const defaults = [
      {
        name: "Potwierdzenie otrzymania dokumentów",
        subject: "Potwierdzenie otrzymania dokumentów w sprawie {CASE_TITLE}",
        content:
          "Szanowni Państwo,\n\nPotwierdzamy otrzymanie dokumentów dotyczących sprawy \"{CASE_TITLE}\" przesłanych w dniu {TODAY}. Zespół naszej kancelarii przystąpi do wstępnej weryfikacji materiałów. Jeżeli konieczne będzie uzupełnienie informacji lub dosłanie dodatkowych dokumentów, niezwłocznie się z Państwem skontaktujemy.\n\nSzacowany czas wstępnej oceny: 1–2 dni robocze.\n\nZ wyrazami szacunku,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "DOCUMENTS",
      },
      {
        name: "Prośba o dodatkowe informacje",
        subject: "Uzupełnienie informacji do sprawy {CASE_TITLE}",
        content:
          "Szanowni Państwo,\n\nW toku analizy sprawy \"{CASE_TITLE}\" potrzebujemy uzupełnienia następujących informacji: {MISSING_INFO}.\n\nProsimy o przesłanie wskazanych danych/dokumentów w odpowiedzi na tę wiadomość lub przez Panel Klienta. Umożliwi nam to przygotowanie pełnej i rzetelnej opinii prawnej.\n\nDziękujemy za współpracę.\n\nZ poważaniem,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "GENERAL",
      },
      {
        name: "Zakończenie analizy",
        subject: "Zakończenie analizy dokumentów – {CASE_TITLE}",
        content:
          "Szanowni Państwo,\n\nInformujemy, że analiza dokumentów w sprawie \"{CASE_TITLE}\" została zakończona. Podsumowanie wraz z rekomendacjami znajdą Państwo w Panelu Klienta.\n\nW razie pytań lub potrzeby omówienia szczegółów zapraszamy do kontaktu. Na życzenie możemy również zorganizować krótką konsultację telefoniczną lub online.\n\nZ wyrazami szacunku,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "LEGAL_ADVICE",
      },
      {
        name: "Harmonogram płatności",
        subject: "Informacje o płatnościach i terminach – {CASE_TITLE}",
        content:
          "Szanowni Państwo,\n\nPrzesyłamy informacje dotyczące płatności związanych ze sprawą \"{CASE_TITLE}\":\n\n• Kwota: {AMOUNT}\n• Termin płatności: {DUE_DATE}\n• Sposób płatności: {PAYMENT_METHOD}\n\nW przypadku pytań dotyczących rozliczenia lub potrzeby rozłożenia płatności na raty, prosimy o kontakt.\n\nZ poważaniem,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "GENERAL",
      },
      {
        name: "Potwierdzenie terminu konsultacji",
        subject: "Potwierdzenie konsultacji – {DATE} {TIME}",
        content:
          "Szanowni Państwo,\n\nPotwierdzamy termin konsultacji w dniu {DATE} o godz. {TIME}. Spotkanie odbędzie się w formie {MEETING_TYPE} (szczegóły: {MEETING_LINK_OR_ADDRESS}).\n\nProsimy o wcześniejsze przygotowanie pytań oraz dokumentów, które chcieliby Państwo omówić.\n\nZ wyrazami szacunku,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "CONSULTATION",
      },
      {
        name: "Przypomnienie o płatności",
        subject: "Przypomnienie o płatności – {CASE_TITLE}",
        content:
          "Szanowni Państwo,\n\nPrzypominamy o płatności w kwocie {AMOUNT} z terminem do {DUE_DATE} dotyczącej sprawy \"{CASE_TITLE}\".\n\nW przypadku dokonania wpłaty prosimy zignorować tę wiadomość. Gdyby mieli Państwo pytania lub potrzebę rozłożenia płatności na raty, prosimy o kontakt.\n\nZ poważaniem,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "URGENT",
      },
      {
        name: "Informacja o brakach formalnych",
        subject: "Braki formalne w dokumentach – {CASE_TITLE}",
        content:
          "Szanowni Państwo,\n\nW przesłanych dokumentach dotyczących sprawy \"{CASE_TITLE}\" stwierdziliśmy braki formalne: {DEFICIENCIES}.\n\nProsimy o ich uzupełnienie w terminie {DEADLINE}. W razie potrzeby chętnie doprecyzujemy wymagania.\n\nZ poważaniem,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "DOCUMENTS",
      },
      {
        name: "Aktualizacja statusu sprawy",
        subject: "Aktualizacja: {CASE_TITLE} – status {STATUS}",
        content:
          "Szanowni Państwo,\n\nInformujemy, że status Państwa sprawy \"{CASE_TITLE}\" został zaktualizowany na: {STATUS}.\n\nSzczegóły znajdą Państwo w Panelu Klienta. W razie pytań pozostajemy do dyspozycji.\n\nZ wyrazami szacunku,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "GENERAL",
      },
      {
        name: "Propozycja ugody/negocjacji",
        subject: "Propozycja dalszych kroków – {CASE_TITLE}",
        content:
          "Szanowni Państwo,\n\nPo analizie sprawy \"{CASE_TITLE}\" rekomendujemy rozważenie {PROPOSAL_TYPE} (np. rozmów ugodowych/negocjacji z drugą stroną).\n\nUzasadnienie: {JUSTIFICATION}.\n\nProsimy o informację, czy akceptują Państwo przedstawiony kierunek działań.\n\nZ wyrazami szacunku,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "LEGAL_ADVICE",
      },
      {
        name: "Przekazanie analizy do akceptacji",
        subject: "Analiza do akceptacji – {CASE_TITLE}",
        content:
          "Szanowni Państwo,\n\nPrzekazujemy opracowaną analizę sprawy \"{CASE_TITLE}\" do akceptacji. Po zaakceptowaniu będziemy mogli przygotować projekt pisma/wniosku lub wdrożyć dalsze działania.\n\nW razie uwag prosimy o ich przekazanie w odpowiedzi na tę wiadomość.\n\nZ poważaniem,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "LEGAL_ADVICE",
      },
      {
        name: "Zgłoszenie pilne – potwierdzenie przyjęcia",
        subject: "PILNE: potwierdzenie przyjęcia zgłoszenia – {CASE_TITLE}",
        content:
          "Szanowni Państwo,\n\nPotwierdzamy przyjęcie pilnego zgłoszenia dotyczącego sprawy \"{CASE_TITLE}\". Zespół natychmiast przystąpi do weryfikacji dokumentów. O kolejnych krokach poinformujemy Państwa w najbliższym możliwym terminie.\n\nW sprawach niecierpiących zwłoki prosimy o kontakt telefoniczny.\n\nZ poważaniem,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "URGENT",
      },
      {
        name: "Podziękowanie – zamknięcie sprawy",
        subject: "Zamknięcie sprawy – {CASE_TITLE}",
        content:
          "Szanowni Państwo,\n\nInformujemy o zamknięciu sprawy \"{CASE_TITLE}\". Dziękujemy za zaufanie okazane naszej kancelarii. W razie potrzeby dalszego wsparcia pozostajemy do Państwa dyspozycji.\n\nZ wyrazami szacunku,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "GENERAL",
      },
      {
        name: "Ochrona danych – pouczenie",
        subject: "Informacje dot. ochrony danych osobowych",
        content:
          "Szanowni Państwo,\n\nPrzypominamy, że wszelka korespondencja i dokumenty przekazywane w toku sprawy podlegają ochronie danych osobowych. Prosimy o niewysyłanie poufnych informacji drogą e‑mail bez uzgodnienia zabezpieczonego kanału komunikacji.\n\nInformacje o przetwarzaniu danych znajdą Państwo w naszej Polityce Prywatności.\n\nZ poważaniem,\n{LAW_FIRM_NAME}",
        category: "GENERAL",
      },
      {
        name: "Wezwanie do uzupełnienia braków – formalne",
        subject: "Wezwanie do uzupełnienia braków – {CASE_TITLE}",
        content:
          "Szanowni Państwo,\n\nWzywamy do uzupełnienia braków w zakresie: {DEFICIENCIES}. Termin uzupełnienia: {DEADLINE}. Brak uzupełnienia w terminie może skutkować wstrzymaniem dalszych czynności w sprawie.\n\nW razie pytań prosimy o kontakt.\n\nZ poważaniem,\n{OPERATOR_NAME}\n{LAW_FIRM_NAME}",
        category: "DOCUMENTS",
      },
      {
        name: "Potwierdzenie wpływu płatności",
        subject: "Potwierdzenie płatności – {AMOUNT}",
        content:
          "Szanowni Państwo,\n\nPotwierdzamy zaksięgowanie płatności w kwocie {AMOUNT}. Dziękujemy. Przystępujemy do kolejnych etapów obsługi sprawy.\n\nZ wyrazami szacunku,\n{LAW_FIRM_NAME}",
        category: "GENERAL",
      },
    ];
    try {
      await Promise.all(
        defaults.map((t) =>
          authAPI.makeRequest<Template>("POST", "/templates", { ...t, is_favorite: false }, true)
        )
      );
      await fetchTemplates();
    } catch {}
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim()) { toast.error("Podaj nazwę szablonu"); return; }
    if (!formData.content.trim()) { toast.error("Uzupełnij treść szablonu"); return; }
    setCreating(true);
    try {
      const created = await authAPI.makeRequest<Template>("POST", "/templates", { ...formData }, true);
      if (!created || !created.id) throw new Error('Brak odpowiedzi serwera');
      setTemplates(prev => [created, ...prev]);
      toast.success("Szablon został utworzony");
      resetForm();
      setShowCreateModal(false);
    } catch (e: any) {
      toast.error(`Błąd podczas tworzenia szablonu${e?.message ? `: ${e.message}` : ''}`);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const updated = await authAPI.makeRequest<Template>("PUT", `/templates/${selectedTemplate.id}`, { ...formData }, true);
      setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      toast.success("Szablon został zaktualizowany");
      resetForm();
      setShowEditModal(false);
      setSelectedTemplate(null);
    } catch (e) {
      toast.error("Błąd podczas aktualizacji szablonu");
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await authAPI.makeRequest("DELETE", `/templates/${templateId}`, undefined, true);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success("Szablon został usunięty");
    } catch {
      toast.error("Błąd podczas usuwania szablonu");
    }
  };

  const handleToggleFavorite = async (templateId: number) => {
    setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, is_favorite: !t.is_favorite } : t));
  };

  const handleCopyTemplate = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.content);
      toast.success("Zawartość szablonu została skopiowana");
      await authAPI.makeRequest<Template>("POST", `/templates/${template.id}/use`, undefined, true);
    } catch (error) {
      console.error("Error copying template:", error);
      toast.error("Błąd podczas kopiowania");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", subject: "", content: "", category: "GENERAL" });
  };

  const openEditModal = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({ name: template.name, subject: template.subject || "", content: template.content, category: template.category });
    setShowEditModal(true);
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Szablony odpowiedzi</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Szablony odpowiedzi</h1>
          <p className="text-muted-foreground">
            Zarządzaj gotowymi odpowiedziami dla klientów
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTemplates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nowy szablon
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Wszystkie szablony
                </p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Tag className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ulubione
                </p>
                <p className="text-2xl font-bold">
                  {templates.filter(t => t.is_favorite).length}
                </p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Łączne użycia (sesja)
                </p>
                <p className="text-2xl font-bold">
                  {templates.reduce((sum, t) => sum + (t.usage_count || 0), 0)}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <Copy className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Szukaj szablonów..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtruj po kategorii" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                <SelectItem value="LEGAL_ADVICE">Porada prawna</SelectItem>
                <SelectItem value="DOCUMENTS">Dokumenty</SelectItem>
                <SelectItem value="CONSULTATION">Konsultacja</SelectItem>
                <SelectItem value="GENERAL">Ogólne</SelectItem>
                <SelectItem value="URGENT">Pilne</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Szablony ({filteredTemplates.length})</CardTitle>
          <CardDescription>
            Lista wszystkich szablonów odpowiedzi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Kategoria</TableHead>
                <TableHead>Użycie</TableHead>
                <TableHead>Ostatnia modyfikacja</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {template.is_favorite && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {template.subject}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={categoryColors[(template.category as keyof typeof categoryColors) || 'GENERAL'] || categoryColors.GENERAL}>
                      {categoryLabels[(template.category as keyof typeof categoryLabels) || 'GENERAL'] || template.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Copy className="h-4 w-4 mr-1 text-muted-foreground" />
                      {template.usage_count}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm text-muted-foreground">
                      {new Date(template.updated_at).toLocaleDateString("pl-PL")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <HTooltip content={<div className="px-1 py-2"><div className="text-small font-bold">Podgląd</div><div className="text-tiny">Zobacz treść szablonu</div></div>}>
                        <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedTemplate(template); setShowPreviewModal(true); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </HTooltip>
                      <HTooltip content={<div className="px-1 py-2"><div className="text-small font-bold">Kopiuj</div><div className="text-tiny">Skopiuj treść do schowka</div></div>}>
                        <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyTemplate(template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </HTooltip>
                      <HTooltip content={<div className="px-1 py-2"><div className="text-small font-bold">Ulubione</div><div className="text-tiny">Oznacz jako ulubione</div></div>}>
                        <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFavorite(template.id)}
                        >
                          <Star 
                          className={`h-4 w-4 ${template.is_favorite ? 'text-yellow-500 fill-current' : ''}`} 
                          />
                        </Button>
                      </HTooltip>
                      <HTooltip content={<div className="px-1 py-2"><div className="text-small font-bold">Edytuj</div><div className="text-tiny">Zmień nazwę, kategorię i treść</div></div>}>
                        <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </HTooltip>
                      <HTooltip content={<div className="px-1 py-2"><div className="text-small font-bold">Usuń</div><div className="text-tiny">Trwale usuń szablon</div></div>}>
                        <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </HTooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Template Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Utwórz nowy szablon</DialogTitle>
            <DialogDescription>
              Dodaj nowy szablon odpowiedzi dla klientów. Pisz z profesjonalnym tonem kancelarii, używaj zwrotów grzecznościowych i precyzyjnych sformułowań.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nazwa szablonu</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="np. Powitanie nowego klienta"
              />
              <p className="text-xs text-muted-foreground mt-1">Wybierz krótką, zrozumiałą nazwę ułatwiającą identyfikację.</p>
            </div>
            <div>
              <Label htmlFor="category">Kategoria</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value: Template["category"]) => 
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-neutral-900">
                  <SelectItem value="GENERAL">Ogólne</SelectItem>
                  <SelectItem value="LEGAL_ADVICE">Porada prawna</SelectItem>
                  <SelectItem value="DOCUMENTS">Dokumenty</SelectItem>
                  <SelectItem value="CONSULTATION">Konsultacja</SelectItem>
                  <SelectItem value="URGENT">Pilne</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subject">Temat wiadomości</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="np. Twoja sprawa #{CASE_ID}"
              />
              <p className="text-xs text-muted-foreground mt-1">Użyj zmiennych takich jak {"{CASE_TITLE}"}, {"{CASE_ID}"} aby personalizować tytuł.</p>
            </div>
            <div>
              <Label htmlFor="content">Treść szablonu</Label>
              <HTextarea
                id="content"
                value={formData.content}
                onValueChange={(v) => setFormData({ ...formData, content: v })}
                labelPlacement="outside"
                variant="underlined"
                placeholder="Użyj zmiennych jak {CLIENT_NAME}, {CASE_TITLE}, {OPERATOR_NAME}"
              />
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <p><strong>Wskazówki:</strong></p>
                <p>• Zachowaj uprzejmy, rzeczowy i precyzyjny ton komunikacji.</p>
                <p>• Możesz używać zmiennych: {"{CLIENT_NAME}"}, {"{CASE_TITLE}"}, {"{OPERATOR_NAME}"}, {"{LAW_FIRM_NAME}"}, {"{TODAY}"}.</p>
                <p>• Unikaj poufnych danych – wrażliwe informacje przekazuj bezpośrednio w panelu.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Anuluj
            </Button>
            <Button onClick={handleCreateTemplate} disabled={creating}>
              {creating ? 'Zapisywanie…' : 'Utwórz szablon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edytuj szablon</DialogTitle>
            <DialogDescription>
              Zmodyfikuj szablon "{selectedTemplate?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Nazwa szablonu</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_category">Kategoria</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value: Template["category"]) => 
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">Ogólne</SelectItem>
                  <SelectItem value="LEGAL_ADVICE">Porada prawna</SelectItem>
                  <SelectItem value="DOCUMENTS">Dokumenty</SelectItem>
                  <SelectItem value="CONSULTATION">Konsultacja</SelectItem>
                  <SelectItem value="URGENT">Pilne</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_subject">Temat wiadomości</Label>
              <Input
                id="edit_subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_content">Treść szablonu</Label>
              <HTextarea
                id="edit_content"
                value={formData.content}
                onValueChange={(v) => setFormData({ ...formData, content: v })}
                labelPlacement="outside"
                variant="underlined"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Anuluj
            </Button>
            <Button onClick={handleUpdateTemplate}>Zapisz zmiany</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Podgląd szablonu</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Temat</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  {selectedTemplate.subject}
                </div>
              </div>
              <div>
                <Label>Treść</Label>
                <div className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                  {selectedTemplate.content}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Zamknij
            </Button>
            {selectedTemplate && (
              <Button onClick={() => handleCopyTemplate(selectedTemplate)}>
                <Copy className="h-4 w-4 mr-2" />
                Kopiuj treść
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}