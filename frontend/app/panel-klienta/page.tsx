"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
// HeroUI components
import { Select as HSelect, SelectItem as HSelectItem, RangeCalendar, Textarea as HTextarea } from "@heroui/react";
import { today, getLocalTimeZone } from "@internationalized/date";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth";
import { casesApi, type Case } from "@/lib/api/cases";
import { paymentsApi, type Payment } from "@/lib/api/payments";
import { notificationsApi, type Notification } from "@/lib/api/notifications";
import { MessagingInterface } from "@/components/messaging/messaging-interface";
import { MessageList } from "@/components/messaging/message-list";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Eye,
  Plus,
  Search,
  Filter,
  User,
  Settings,
  History,
  MessageSquare,
  CreditCard,
  Clock,
  CheckCircle,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";
import NewCaseForm from "@/components/forms/new-case-form"; // Import NewCaseForm component
import { getUserAvatarSrc, getUserInitials, uploadAvatar, deleteAvatar } from "@/lib/avatar";
import SpacesUploader from "@/components/documents/SpacesUploader";
import CaseDocumentsSection from "@/components/documents/CaseDocumentsSection";

/**
 * Lightweight placeholder until the full client dashboard is finished.
 * Keeps the `/panel-klienta` route compiling and deployable.
 */
export default function PanelKlientaPage() {
  const { user, isAuthenticated, updateUser, fetchUserSession } = useAuth();
  const [activeTab, setActiveTab] = useState("sprawy");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [newMsgRecipientId, setNewMsgRecipientId] = useState<string>("");
  const [recipients, setRecipients] = useState<Array<{id:number; name:string; role:string}>>([]);
  const [newMsgCaseId, setNewMsgCaseId] = useState<string>("");
  const [newMsgContent, setNewMsgContent] = useState<string>("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  // Document actions state
  const [renameOpen, setRenameOpen] = useState(false);
  const [renamingCaseId, setRenamingCaseId] = useState<string>("");
  const [renamingDocId, setRenamingDocId] = useState<string>("");
  const [newDocName, setNewDocName] = useState<string>("");
  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewType, setPreviewType] = useState<"pdf"|"image"|"other">("other");
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string>("");
  // Filters & pagination
  const [caseSearch, setCaseSearch] = useState("");
  const [caseStatus, setCaseStatus] = useState<string>("all");
  // Date range filter for cases (HeroUI RangeCalendar)
  const [caseDateRange, setCaseDateRange] = useState<any>(null);
  const [casePage, setCasePage] = useState(1);
  const CASES_PER_PAGE = 5;
  const [paymentsFrom, setPaymentsFrom] = useState<string>("");
  const [paymentsTo, setPaymentsTo] = useState<string>("");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const PAYMENTS_PER_PAGE = 5;

  // Settings dialogs state
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdOld, setPwdOld] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState({ first_name: user?.first_name || "", last_name: user?.last_name || "", phone: user?.phone || "", company_name: (user as any)?.company_name || "" });
  const [deletingAcc, setDeletingAcc] = useState(false);
  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  // Utilities for export (messages, etc.)
  const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') return reject(new Error('No document'));
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load script: ' + src));
    document.head.appendChild(s);
  });
  const exportSectionAsPNG = async (selector: string, filename: string) => {
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return;
      const h2c = (window as any).html2canvas;
      const canvas = await h2c(el, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${filename}.png`;
      link.click();
    } catch (e) {
      toast({ title: 'Nie udało się zapisać PNG', variant: 'destructive' });
    }
  };
  const exportSectionAsDOCX = async (selector: string, filename: string) => {
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/html-docx-js@0.4.1/dist/html-docx.min.js');
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return;
      const HTMLDocx = (window as any).HTMLDocx;
      const html = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head><body>${el.outerHTML}</body></html>`;
      const blob = HTMLDocx.asBlob(html);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: 'Nie udało się zapisać DOCX', variant: 'destructive' });
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/logowanie");
      return;
    }
  }, [isAuthenticated, router]);

  // Sync tab from query string (?tab=...)
  useEffect(() => {
    const tab = (searchParams?.get('tab') || '').toLowerCase();
    const allowed = [
      "sprawy",
      "nowa-sprawa",
      "historia",
      "wiadomosci",
      "profil",
      "ustawienia",
    ] as const;
    if (allowed.includes(tab as any)) {
      setActiveTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load data from APIs
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Load all data in parallel for better performance
        const [casesResponse, paymentsResponse, notificationsResponse, unreadResponse] = await Promise.all([
          casesApi.getCases().catch(err => ({ error: err.message })),
          paymentsApi.getUserPayments().catch(err => ({ error: err.message })),
          notificationsApi.getUserNotifications().catch(err => ({ error: err.message })),
          notificationsApi.getUnreadCount().catch(err => ({ error: err.message }))
        ]);
        
        // Handle cases
        if ('error' in casesResponse && casesResponse.error) {
          console.error('Cases error:', casesResponse.error);
        } else if ('cases' in casesResponse && casesResponse.cases) {
          setCases(casesResponse.cases);
        }
        
        // Handle payments  
        if ('error' in paymentsResponse && paymentsResponse.error) {
          console.error('Payments error:', paymentsResponse.error);
        } else if ('payments' in paymentsResponse && paymentsResponse.payments) {
          setPayments(paymentsResponse.payments);
        }
        
        // Handle notifications
        if ('error' in notificationsResponse && notificationsResponse.error) {
          console.error('Notifications error:', notificationsResponse.error);
        } else if ('notifications' in notificationsResponse && notificationsResponse.notifications) {
          setNotifications(notificationsResponse.notifications);
        }
        
        // Handle unread count
        if ('error' in unreadResponse && unreadResponse.error) {
          console.error('Unread count error:', unreadResponse.error);
        } else if ('unread_count' in unreadResponse && unreadResponse.unread_count !== undefined) {
          setUnreadCount(unreadResponse.unread_count);
        }
        
      } catch (error) {
        console.error('Failed to load data:', error);
        setError('Błąd ładowania danych');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]);

  // Load recipients when New Message dialog opens
  useEffect(() => {
    if (!newMsgOpen) return;
    (async () => {
      try {
        const { authAPI } = await import("@/lib/api/auth");
        const data = await authAPI.makeRequest<{recipients: Array<{id:number; name:string; role:string}>}>("GET", "/messages/recipients", undefined, true);
        setRecipients(data.recipients || []);
        if (!data.recipients || data.recipients.length === 0) {
          toast({ title: 'Brak dostępnych adresatów', description: 'Skontaktuj się z administratorem.', variant: 'destructive' });
        }
      } catch (e) {
        toast({ title: 'Nie udało się załadować odbiorców', description: (e as Error)?.message, variant: 'destructive' });
      }
    })();
  }, [newMsgOpen]);

  // Add refresh function for after creating new cases
  const refreshCases = async () => {
    setLoading(true);
    const response = await casesApi.getCases();
    if (response.error) {
      setError(response.error);
    } else if (response.cases) {
      setCases(response.cases);
    }
    setLoading(false);
  };

  const refreshPayments = async () => {
    const response = await paymentsApi.getUserPayments();
    if (response.payments) {
      setPayments(response.payments);
    }
  };

  const refreshNotifications = async () => {
    try {
      const [notificationsResponse, unreadResponse] = await Promise.all([
        notificationsApi.getUserNotifications(),
        notificationsApi.getUnreadCount()
      ]);
      
      if (notificationsResponse.notifications) {
        setNotifications(notificationsResponse.notifications);
      }
      
      if (unreadResponse.unread_count !== undefined) {
        setUnreadCount(unreadResponse.unread_count);
      }
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  };

  const sidebarItems = [
    { id: "sprawy", label: "Moje sprawy", icon: FileText },
    { id: "nowa-sprawa", label: "Nowa sprawa", icon: Plus },
    { id: "historia", label: "Historia płatności", icon: History },
    { id: "wiadomosci", label: "Wiadomości", icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: "profil", label: "Mój profil", icon: User },
    { id: "ustawienia", label: "Ustawienia", icon: Settings },
  ];

  const getStatusBadge = (status: Case["status"]) => {
    const statusConfig = {
      draft: { label: "Szkic", color: "bg-gray-100 text-gray-800" },
      new: { label: "Nowa", color: "bg-blue-100 text-blue-800" },
      submitted: { label: "Przesłana", color: "bg-blue-100 text-blue-800" },
      analyzing: {
        label: "Analizujemy",
        color: "bg-yellow-100 text-yellow-800",
      },
      analysis_ready: {
        label: "Analiza gotowa",
        color: "bg-green-100 text-green-800",
      },
      documents_ready: {
        label: "Pisma gotowe",
        color: "bg-purple-100 text-purple-800",
      },
      completed: { label: "Zakończona", color: "bg-gray-100 text-gray-800" },
      cancelled: { label: "Anulowana", color: "bg-red-100 text-red-800" },
      rejected: { label: "Odrzucona", color: "bg-red-100 text-red-800" },
    };

    return statusConfig[status] || statusConfig.new;
  };

  const handlePurchaseDocument = (documentId: string) => {
    // Simulate purchase process
    toast({ title: 'Płatność', description: `Przekierowanie do płatności za dokument ${documentId}` });
  };

  const handleViewFullAnalysis = (analysisId: string) => {
    // Simulate viewing full analysis
    toast({ title: 'Analiza', description: `Przekierowanie do pełnej analizy ${analysisId}` });
  };

  if (!isAuthenticated) {
    return <div className="p-8">Ładowanie…</div>;
  }

  return (
    <div className="min-h-screen flex flex-col font-montserrat bg-gray-50">
      {/* Mobile header with sidebar toggle */}
      <header className="lg:hidden bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-3"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Panel Klienta</h1>
              <div className="mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={getUserAvatarSrc(user)} alt={user?.name || user?.email || 'Użytkownik'} />
                  <AvatarFallback>{getUserInitials(user, 'C')}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <Avatar>
              <AvatarImage src={getUserAvatarSrc(user)} alt={user?.name || user?.email || 'Użytkownik'} />
              <AvatarFallback>{getUserInitials(user, 'CL')}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`bg-white shadow-lg transition-all duration-300 z-50 ${
            sidebarOpen 
              ? "fixed lg:static inset-y-0 left-0 w-64" 
              : "w-64 hidden lg:block"
          }`}
        >
          <div className="p-6">
            {/* Mobile close button */}
            <div className="lg:hidden flex justify-end mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <Avatar className="mr-3">
                  <AvatarImage src={getUserAvatarSrc(user)} alt={user?.name || user?.email || 'Użytkownik'} />
                  <AvatarFallback>{getUserInitials(user, 'CL')}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{user?.name}</div>
                  <div className="text-sm text-gray-500">Panel klienta</div>
                </div>
              </div>
              <Avatar className="h-7 w-7">
                <AvatarImage src={getUserAvatarSrc(user)} alt={user?.name || user?.email || 'Użytkownik'} />
                <AvatarFallback>{getUserInitials(user, 'C')}</AvatarFallback>
              </Avatar>
            </div>

            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    const url = item.id === 'sprawy' ? '/panel-klienta' : `/panel-klienta?tab=${item.id}`;
                    router.push(url);
                    // Close mobile sidebar when item is clicked
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors font-medium ${
                    activeTab === item.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </div>
                  {item.badge && (
                    <Badge className="bg-red-100 text-red-800 text-xs px-2 py-0.5">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === "sprawy" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  Moje sprawy
                </h1>
                <Button onClick={() => setActiveTab("nowa-sprawa")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nowa sprawa
                </Button>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input placeholder="Szukaj spraw..." className="pl-10" value={caseSearch} onChange={(e) => { setCaseSearch(e.target.value); setCasePage(1); }} />
                </div>
                <div className="min-w-[220px]">
                  <HSelect
                    className="max-w-xs"
                    placeholder="Select..."
                    selectedKeys={new Set([caseStatus])}
                    onSelectionChange={(keys) => {
                      const v = Array.from(keys as Set<string>)[0] as string;
                      setCaseStatus(v);
                      setCasePage(1);
                    }}
                  >
                    <HSelectItem key="all">Wszystkie</HSelectItem>
                    <HSelectItem key="new">Nowa</HSelectItem>
                    <HSelectItem key="submitted">Przesłana</HSelectItem>
                    <HSelectItem key="analyzing">Analizujemy</HSelectItem>
                    <HSelectItem key="analysis_ready">Analiza gotowa</HSelectItem>
                    <HSelectItem key="documents_ready">Pisma gotowe</HSelectItem>
                    <HSelectItem key="completed">Zakończona</HSelectItem>
                    <HSelectItem key="cancelled">Anulowana</HSelectItem>
                    <HSelectItem key="rejected">Odrzucona</HSelectItem>
                  </HSelect>
                </div>
              </div>

              {/* Date range filter */}
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">Zakres dat utworzenia</div>
                <div className="flex gap-4 overflow-auto">
                  {/* No-selection calendar */}
                  <RangeCalendar aria-label="Date (No Selection)" onChange={setCaseDateRange} />
                  {/* Default 1-week range */}
                  <RangeCalendar
                    aria-label="Date (Uncontrolled)"
                    defaultValue={{ start: today(getLocalTimeZone()), end: today(getLocalTimeZone()).add({ weeks: 1 }) }}
                    onChange={setCaseDateRange}
                  />
                </div>
              </div>

              {(() => {
                const filteredCases = cases.filter(c => {
                  const matchSearch = caseSearch ? (c.title?.toLowerCase().includes(caseSearch.toLowerCase()) || c.name?.toLowerCase().includes(caseSearch.toLowerCase())) : true;
                  const matchStatus = caseStatus === 'all' ? true : c.status === caseStatus;
                  // Date range filter: convert CalendarDate to JS Date and check inclusion
                  let matchDate = true;
                  if (caseDateRange?.start && caseDateRange?.end) {
                    const s = new Date(caseDateRange.start.year, caseDateRange.start.month - 1, caseDateRange.start.day);
                    const e = new Date(caseDateRange.end.year, caseDateRange.end.month - 1, caseDateRange.end.day, 23, 59, 59, 999);
                    const created = c.createdAt instanceof Date ? c.createdAt : new Date(c.created_at || c.createdAt);
                    matchDate = created >= s && created <= e;
                  }
                  return matchSearch && matchStatus && matchDate;
                });
                const totalPages = Math.max(1, Math.ceil(filteredCases.length / CASES_PER_PAGE));
                const page = Math.min(casePage, totalPages);
                const start = (page - 1) * CASES_PER_PAGE;
                const pageCases = filteredCases.slice(start, start + CASES_PER_PAGE);
                return (
                  <div className="grid grid-cols-1 gap-6">
                {loading ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Ładowanie spraw...</p>
                    </CardContent>
                  </Card>
                ) : error ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-red-600 mb-4">{error}</p>
                      <Button onClick={refreshCases}>Spróbuj ponownie</Button>
                    </CardContent>
                  </Card>
                ) : filteredCases.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Nie masz jeszcze żadnych spraw</p>
                      <Button onClick={() => setActiveTab("nowa-sprawa")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Utwórz pierwszą sprawę
                      </Button>
                    </CardContent>
                  </Card>
                ) : pageCases.map((case_) => (
                  <Card
                    key={case_.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-semibold">
                            {case_.name}
                          </CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            Utworzona: {case_.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getStatusBadge(case_.status).color}>
                          {getStatusBadge(case_.status).label}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Documents */}
                      <CaseDocumentsSection
                        caseId={Number(case_.id)}
                        documents={case_.documents.map((d) => ({
                          id: d.id,
                          name: d.name,
                          sizeBytes: d.size,
                          uploadedAt: d.uploadedAt,
                          type: d.type,
                        }))}
                        onRefresh={refreshCases}
                        onPreview={async (docId) => {
                          try {
                            const doc = case_.documents.find((x) => x.id === docId);
                            const blob = await casesApi.downloadDocument(Number(case_.id), Number(docId));
                            if (!blob) { toast({ title: 'Błąd pobierania', variant: 'destructive' }); return; }
                            const url = URL.createObjectURL(blob);
                            const t = (blob as any).type || '';
                            const type: "pdf"|"image"|"other" = t.includes('pdf') ? 'pdf' : (t.includes('image') ? 'image' : (doc?.type === 'pdf' ? 'pdf' : (doc?.type === 'image' ? 'image' : 'other')));
                            setPreviewObjectUrl(url);
                            setPreviewUrl(url);
                            setPreviewType(type);
                            setPreviewOpen(true);
                          } catch (e) {
                            toast({ title: 'Podgląd niedostępny', description: (e as Error)?.message, variant: 'destructive' });
                          }
                        }}
                        onDownload={async (docId) => {
                          const doc = case_.documents.find((x) => x.id === docId);
                          const blob = await casesApi.downloadDocument(Number(case_.id), Number(docId));
                          if (!blob) { toast({ title: 'Błąd pobierania', variant: 'destructive' }); return; }
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = (doc?.name || `document-${docId}`) as string;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        onDelete={async (docId) => {
                          if (!confirm('Usunąć dokument?')) return;
                          const res = await casesApi.deleteDocument(Number(case_.id), Number(docId));
                          if (!res.success) { toast({ title: 'Błąd usuwania', description: res.error, variant: 'destructive' }); return; }
                          setCases(prev => prev.map(c => c.id === case_.id ? { ...c, documents: c.documents.filter(d => d.id !== docId) } : c));
                          toast({ title: 'Usunięto dokument' });
                        }}
                      />

                      {/* Client Notes */}
                      {case_.clientNotes && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h5 className="text-sm font-medium text-blue-800 mb-1">
                            Twoje notatki:
                          </h5>
                          <p className="text-sm text-blue-700">
                            {case_.clientNotes}
                          </p>
                        </div>
                      )}

                      {/* Analysis */}
                      {case_.analysis && (
                        <div className="border-t pt-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium">Analiza prawna</h4>
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-green-100 text-green-800">
                                Gotowa
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {case_.analysis.price} zł
                              </span>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg mb-4">
                            <h5 className="font-medium mb-2">Podsumowanie:</h5>
                            <p className="text-sm text-gray-700 mb-3">
                              {case_.analysis.summary}
                            </p>

                            <div className="mb-3">
                              <h6 className="text-sm font-medium mb-1">
                                Zalecenia:
                              </h6>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {case_.analysis.recommendations.map(
                                  (rec, idx) => (
                                    <li key={idx} className="flex items-start">
                                      <CheckCircle className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                      {rec}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleViewFullAnalysis(case_.analysis!.id)
                                }
                              >
                                <Eye className="mr-2 h-3 w-3" />
                                Zobacz pełną analizę
                              </Button>
                            </div>
                          </div>

                          {/* Available Documents */}
                          {case_.analysis.possibleDocuments.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium">
                                Dostępne pisma do zamówienia:
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {case_.analysis.possibleDocuments.map((doc) => (
                                  <Card
                                    key={doc.id}
                                    className="border border-blue-200 hover:shadow-md transition-shadow"
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex justify-between items-start mb-2">
                                        <h6 className="text-sm font-medium leading-tight">
                                          {doc.name}
                                        </h6>
                                        <span className="text-sm font-bold text-blue-600">
                                          {doc.price} zł
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-600 mb-2">
                                        {doc.description}
                                      </p>
                                      <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs text-gray-500">
                                          <Clock className="h-3 w-3 inline mr-1" />
                                          {doc.estimatedTime}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {doc.category}
                                        </Badge>
                                      </div>
                                      <Button
                                        size="sm"
                                        className="w-full text-xs"
                                        onClick={() =>
                                          handlePurchaseDocument(doc.id)
                                        }
                                      >
                                        <CreditCard className="mr-1 h-3 w-3" />
                                        Zamów
                                      </Button>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                <div className="flex justify-center items-center gap-3 mt-4">
                  <Button variant="outline" size="sm" disabled={page<=1} onClick={() => setCasePage(p=>Math.max(1,p-1))}>Poprzednia</Button>
                  <span className="text-sm">Strona {page} z {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={() => setCasePage(p=>Math.min(totalPages,p+1))}>Następna</Button>
                </div>
                  </div>
                );
              })()}
            </div>
          )}
          {activeTab === "nowa-sprawa" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  Nowa Sprawa
                </h1>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("sprawy")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Powrót do Spraw
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Dodaj Nową Sprawę</CardTitle>
                  <p className="text-gray-600">
                    Wypełnij formularz i prześlij dokumenty, aby rozpocząć
                    proces analizy prawnej
                  </p>
                </CardHeader>
                <CardContent>
                  <NewCaseForm onSuccess={() => {
                    setActiveTab("sprawy");
                    refreshCases();
                  }} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Payment History Section */}
          {activeTab === "historia" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  Historia płatności
                </h1>
                <Button onClick={refreshPayments}>
                  Odśwież
                </Button>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm">Od</label>
                  <Input type="date" value={paymentsFrom} onChange={(e)=>{setPaymentsFrom(e.target.value); setPaymentsPage(1);}}/>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Do</label>
                  <Input type="date" value={paymentsTo} onChange={(e)=>{setPaymentsTo(e.target.value); setPaymentsPage(1);}}/>
                </div>
                <Button variant="outline" onClick={refreshPayments}>Odśwież</Button>
              </div>
              {(() => {
                const filtered = payments.filter(p => {
                  const d = new Date(p.created_at);
                  const fromOk = paymentsFrom ? d >= new Date(paymentsFrom) : true;
                  const toOk = paymentsTo ? d <= new Date(paymentsTo) : true;
                  return fromOk && toOk;
                });
                const totalPages = Math.max(1, Math.ceil(filtered.length / PAYMENTS_PER_PAGE));
                const page = Math.min(paymentsPage, totalPages);
                const start = (page - 1) * PAYMENTS_PER_PAGE;
                const pageItems = filtered.slice(start, start + PAYMENTS_PER_PAGE);
                return (
              <div className="grid grid-cols-1 gap-6">
                {loading ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Ładowanie płatności...</p>
                    </CardContent>
                  </Card>
                ) : filtered.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Nie masz jeszcze żadnych płatności</p>
                    </CardContent>
                  </Card>
                ) : pageItems.map((payment) => (
                  <Card key={payment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            Płatność #{payment.id}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.created_at).toLocaleDateString('pl-PL')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xl">{payment.amount} {payment.currency}</p>
                          <Badge className={
                            payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {payment.status === 'paid' ? 'Opłacone' :
                             payment.status === 'pending' ? 'Oczekujące' :
                             payment.status === 'failed' ? 'Nieudane' :
                             payment.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-2">{payment.description}</p>
                      <p className="text-sm text-gray-500">Typ: {payment.payment_type}</p>
                      {(payment as any).applied_promotion_code && (
                        <p className="text-sm text-green-600">
                          Promocja: {(payment as any).applied_promotion_code}
                        </p>
                      )}
                      {payment.status === 'pending' && (
                        <div className="mt-3">
                          <Button
                            onClick={() => {
                              const cid = (payment as any).case_id || localStorage.getItem('pendingCaseId');
                              if (!cid) { toast({ title: 'Brak powiązanej sprawy', description: 'Nie można dokończyć płatności bez ID sprawy.', variant: 'destructive' }); return; }
                              const amt = payment.amount;
                              const method = 'payu';
                              window.location.href = `/platnosc?caseId=${cid}&amount=${amt}&method=${method}`;
                            }}
                          >
                            Dokończ płatność
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              );
              })()}
            </div>
          )}

          {/* Messages Section (unified layout) */}
          {activeTab === "wiadomosci" && (
            <div className="space-y-6">
              <div className="lg:col-span-3 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Wiadomości</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => exportSectionAsPNG('#chat-container', `czat-${Date.now()}`)}>Eksport PNG</Button>
                  <Button variant="outline" onClick={() => exportSectionAsDOCX('#chat-container', `czat-${Date.now()}`)}>Eksport DOCX</Button>
                  <Button variant="outline" onClick={() => window.print()}>PDF</Button>
                  <Button onClick={() => setNewMsgOpen(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Nowa wiadomość
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Message List */}
                <div className="lg:col-span-1">
                  <MessageList
                    currentUserRole="client"
                    onSelectConversationAction={(conversation: any) => {
                      setSelectedConversation(conversation);
                    }}
                    selectedConversationId={selectedConversation?.id}
                    className="h-96 lg:h-full"
                  />
                </div>
                
                {/* Messaging Interface */}
                <div className="lg:col-span-2" id="chat-container">
                  {selectedConversation ? (
                    <MessagingInterface
                      currentUserId={user?.id?.toString() || ""}
                      currentUserRole="client"
                      caseId={selectedConversation.case_id}
                      recipientId={selectedConversation.participant_id.toString()}
                      recipientName={selectedConversation.participant_name}
                      className="h-96 lg:h-full"
                    />
                  ) : (
                    <Card className="h-96 lg:h-full flex items-center justify-center">
                      <CardContent className="text-center">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Wybierz rozmowę</h3>
                        <p className="text-gray-600">Kliknij na rozmowę z lewej strony, aby rozpocząć czat</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Profile Section */}
          {activeTab === "profil" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  Mój profil
                </h1>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Informacje o koncie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Imię i nazwisko</label>
                      <p className="mt-1 text-gray-900">{user?.name || 'Nie podano'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-gray-900">{user?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Telefon</label>
                      <p className="mt-1 text-gray-900">{user?.phone || 'Nie podano'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status konta</label>
                      <Badge className={user?.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {user?.is_verified ? 'Zweryfikowane' : 'Niezweryfikowane'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Statystyki</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{cases.length}</p>
                        <p className="text-sm text-gray-600">Liczba spraw</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{payments.length}</p>
                        <p className="text-sm text-gray-600">Płatności</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{notifications.length}</p>
                        <p className="text-sm text-gray-600">Wiadomości</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Section */}
          {activeTab === "ustawienia" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  Ustawienia
                </h1>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Ustawienia konta</CardTitle>
                  <p className="text-gray-600">Zarządzaj swoim kontem i preferencjami</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Powiadomienia</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Powiadomienia email</p>
                          <p className="text-sm text-gray-500">Otrzymuj powiadomienia na email</p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Powiadomienia SMS</p>
                          <p className="text-sm text-gray-500">Otrzymuj powiadomienia SMS</p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Newsletter</p>
                          <p className="text-sm text-gray-500">Otrzymuj newsletter z poradami prawnymi</p>
                        </div>
                        <input type="checkbox" className="rounded" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-3">Bezpieczeństwo</h4>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start" onClick={() => setPwdOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Zmień hasło
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={() => setProfileOpen(true)}>
                        <User className="mr-2 h-4 w-4" />
                        Aktualizuj dane osobowe
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-3">Inne</h4>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start" onClick={async () => {
                        // Download account data snapshot
                        const snapshot = {
                          user,
                          cases,
                          payments,
                          notifications,
                          exportedAt: new Date().toISOString(),
                        };
                        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `konto-${user?.id || 'me'}-${Date.now()}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}>
                        <FileText className="mr-2 h-4 w-4" />
                        Pobierz dane konta
                      </Button>
                      <Button variant="destructive" className="w-full justify-start" onClick={async () => {
                        if (!confirm('Na pewno chcesz usunąć konto? Tej operacji nie można cofnąć.')) return;
                        try {
                          setDeletingAcc(true);
                          const { authAPI } = await import("@/lib/api/auth");
                          await authAPI.makeRequest('DELETE', '/auth/me', undefined, true);
                          // Clear local session
                          localStorage.removeItem('auth-token');
                          router.push('/');
                        } catch (e) {
                          toast({ title: 'Nie udało się usunąć konta', description: (e as Error)?.message, variant: 'destructive' });
                        } finally {
                          setDeletingAcc(false);
                        }
                      }} disabled={deletingAcc}>
                        Usuń konto
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        {/* Change Password Dialog */}
        <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zmień hasło</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Obecne hasło</label>
                <Input type="password" value={pwdOld} onChange={(e) => setPwdOld(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Nowe hasło</label>
                <Input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPwdOpen(false)}>Anuluj</Button>
              <Button onClick={async () => {
                try {
                  const { authAPI } = await import("@/lib/api/auth");
                  await authAPI.makeRequest('POST', '/auth/change-password', { old_password: pwdOld, new_password: pwdNew }, true);
                  setPwdOpen(false);
                  setPwdOld(""); setPwdNew("");
                  toast({ title: 'Hasło zmienione' });
                } catch (e) {
                  toast({ title: 'Nie udało się zmienić hasła', description: (e as Error)?.message, variant: 'destructive' });
                }
              }} disabled={!pwdNew}>Zapisz</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Profile Dialog */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aktualizacja danych</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Imię</label>
                <Input value={profile.first_name} onChange={(e) => setProfile(p => ({...p, first_name: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Nazwisko</label>
                <Input value={profile.last_name} onChange={(e) => setProfile(p => ({...p, last_name: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Telefon</label>
                <Input value={profile.phone} onChange={(e) => setProfile(p => ({...p, phone: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Firma</label>
                <Input value={profile.company_name} onChange={(e) => setProfile(p => ({...p, company_name: e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Avatar</label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {avatarPreview || (user as any)?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarPreview || (user as any)?.avatar_url}
                        alt="Podgląd avatara"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">Brak</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          if (!file.type.startsWith('image/')) {
                            toast({ title: 'Nieprawidłowy plik', description: 'Wybierz obraz (JPG/PNG/WebP).', variant: 'destructive' });
                            return;
                          }
                          if (file.size > 2 * 1024 * 1024) {
                            toast({ title: 'Plik zbyt duży', description: 'Maksymalny rozmiar to 2MB.', variant: 'destructive' });
                            return;
                          }
                          setAvatarFile(file);
                          const url = URL.createObjectURL(file);
                          setAvatarPreview(url);
                        } else {
                          setAvatarFile(null);
                          setAvatarPreview("");
                        }
                      }}
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="outline"
                        disabled={!avatarFile}
                        onClick={async () => {
                          if (!avatarFile) return;
                          try {
                            const newUrl = await uploadAvatar(avatarFile);
                            if (newUrl) {
                              updateUser({ avatar_url: newUrl });
                              await fetchUserSession();
                            }
                            toast({ title: 'Avatar zaktualizowany' });
                            setAvatarFile(null);
                            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                            setAvatarPreview("");
                          } catch (e) {
                            toast({ title: 'Nie udało się zaktualizować avatara', description: (e as Error)?.message, variant: 'destructive' });
                          }
                        }}
                      >
                        Prześlij avatar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          try {
                            await deleteAvatar();
                            updateUser({ avatar_url: undefined });
                            await fetchUserSession();
                            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                            setAvatarPreview("");
                            setAvatarFile(null);
                            toast({ title: 'Avatar usunięty' });
                          } catch (e) {
                            toast({ title: 'Nie udało się usunąć avatara', description: (e as Error)?.message, variant: 'destructive' });
                          }
                        }}
                      >
                        Usuń avatar
                      </Button>
                      {avatarPreview && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                            setAvatarPreview("");
                            setAvatarFile(null);
                          }}
                        >
                          Wyczyść podgląd
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProfileOpen(false)}>Anuluj</Button>
              <Button onClick={async () => {
                try {
                  const { authAPI } = await import("@/lib/api/auth");
                  await authAPI.makeRequest('PATCH', '/auth/me', profile, true);
                  setProfileOpen(false);
                  // Refresh profile locally
                  setNotifications([...notifications]);
                  toast({ title: 'Dane zaktualizowane' });
                } catch (e) {
                  toast({ title: 'Nie udało się zaktualizować danych', description: (e as Error)?.message, variant: 'destructive' });
                }
              }}>Zapisz</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* New Message Dialog */}
        <Dialog open={newMsgOpen} onOpenChange={setNewMsgOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nowa wiadomość</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Adresat (operator/admin)</label>
                <HSelect
                  className="w-full"
                  placeholder="Wybierz odbiorcę"
                  selectedKeys={new Set(newMsgRecipientId ? [newMsgRecipientId] : [])}
                  onSelectionChange={(keys: any) => {
                    const v = Array.from(keys as Set<string>)[0] as string;
                    setNewMsgRecipientId(v);
                  }}
                >
                  {recipients.length === 0 ? (
                    <HSelectItem key="none" isDisabled>
                      Brak dostępnych odbiorców
                    </HSelectItem>
                  ) : (
                    recipients.map((r) => (
                      <HSelectItem key={String(r.id)}>{r.name} · {r.role}</HSelectItem>
                    ))
                  )}
                </HSelect>
              </div>
              <div>
                <label className="text-sm font-medium">ID sprawy (opcjonalnie)</label>
                <Input value={newMsgCaseId} onChange={(e) => setNewMsgCaseId(e.target.value)} placeholder="np. 101" />
              </div>
              <div>
                <label className="text-sm font-medium">Treść wiadomości</label>
                <HTextarea
                  labelPlacement="outside"
                  placeholder="Wpisz wiadomość"
                  value={newMsgContent}
                  variant="underlined"
                  onValueChange={setNewMsgContent}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewMsgOpen(false)}>Anuluj</Button>
              <Button disabled={sendingMsg || !newMsgRecipientId || !newMsgContent.trim()} onClick={async () => {
                try {
                  setSendingMsg(true);
                  const { authAPI } = await import("@/lib/api/auth");
                  await authAPI.makeRequest('POST', '/messages/send', {
                    recipient_id: Number(newMsgRecipientId),
                    content: newMsgContent.trim(),
                    case_id: newMsgCaseId ? Number(newMsgCaseId) : undefined,
                  }, true);
                  toast({ title: 'Wiadomość wysłana' });
                  setNewMsgOpen(false);
                  setNewMsgRecipientId("");
                  setNewMsgCaseId("");
                  setNewMsgContent("");
                } catch (e) {
                  toast({ title: 'Nie udało się wysłać', description: (e as Error)?.message, variant: 'destructive' });
                } finally {
                  setSendingMsg(false);
                }
              }}>{sendingMsg ? 'Wysyłanie…' : 'Wyślij'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Rename Case Dialog */}
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zmień nazwę</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nowa nazwa</label>
                <Input value={newDocName} onChange={(e) => setNewDocName(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameOpen(false)}>Anuluj</Button>
              <Button onClick={async () => {
                if (!renamingCaseId || !renamingDocId || !newDocName.trim()) return;
                const res = await casesApi.renameDocument(Number(renamingCaseId), Number(renamingDocId), newDocName.trim());
                if (!res.success) { toast({ title: 'Błąd zmiany nazwy', description: res.error, variant: 'destructive' }); return; }
                // update local state
                setCases(prev => prev.map(c => c.id === renamingCaseId ? { ...c, documents: c.documents.map(d => d.id === renamingDocId ? { ...d, name: newDocName.trim() } : d) } : c));
                setRenameOpen(false);
                toast({ title: 'Zmieniono nazwę dokumentu' });
              }} disabled={!newDocName.trim()}>Zapisz</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open && previewObjectUrl) {
            URL.revokeObjectURL(previewObjectUrl);
            setPreviewObjectUrl("");
          }
        }}>
          <DialogContent className="max-w-3xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Podgląd dokumentu</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {previewType === 'pdf' ? (
                <iframe src={previewUrl} className="w-full h-[70vh]" />
              ) : previewType === 'image' ? (
                <img src={previewUrl} alt="Podgląd" className="max-w-full max-h-[70vh] mx-auto" />
              ) : (
                <div className="text-sm text-gray-600">Brak podglądu. Użyj Pobierz.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  </div>
  );
}
