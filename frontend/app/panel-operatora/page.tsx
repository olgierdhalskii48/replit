"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { getUserAvatarSrc, getUserInitials } from "@/lib/avatar";
import { useRouter, useSearchParams } from "next/navigation";
import { operatorAPI, OperatorCase } from "@/lib/api/operator";
import { authAPI } from "@/lib/api/auth";
import OperatorTemplatesPage from "@/app/operator/szablony/page";
import { toast } from "@/components/ui/use-toast";
import { MessageList } from "@/components/messaging/message-list";
import { MessagingInterface } from "@/components/messaging/messaging-interface";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { AreaChart, Area, CartesianGrid, XAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Filter,
  User,
  Settings,
  BarChart3,
  Users,
  MessageSquare,
  CheckCircle2,
  Clock4,
  AlertCircle,
  Menu,
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  FileEdit,
  Save,
  Trash2,
  Mail,
  Phone,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface Task {
  id: string;
  caseId: string;
  client: string; // Changed from clientName for consistency
  type: string;
  title: string;
  priority: "high" | "medium" | "low";
  deadline: Date;
  status: "pending" | "in_progress" | "completed";
  documents: number; // Changed from string[] to number (count)
  package: string;
  description: string;
}

export default function PanelOperatoraPage() {
  /* ---------------------------------------------------------------------- */
  /*                              AUTH MOCKING                              */
  /* ---------------------------------------------------------------------- */
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "zadania" | "statystyki" | "klienci" | "szablony" | "wiadomosci" | "ustawienia"
  >("zadania");
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cases, setCases] = useState<OperatorCase[]>([]);
  const [templates, setTemplates] = useState<Array<{id:number; name:string; content:string;}>>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [stats, setStats] = useState<{days:string[]; cases_created:number[]; analyses_created:number[]; templates_used:number[]; payments_count?: number[]; revenue_amount?: number[]}>({days:[], cases_created:[], analyses_created:[], templates_used:[], payments_count: [], revenue_amount: []});
  const [statsRange, setStatsRange] = useState<"7" | "14" | "30">("14");
  const [caseMessages, setCaseMessages] = useState<Array<{id:number; sender:string; content:string; ts:string}>>([]);
  const [selectedMsgIdx, setSelectedMsgIdx] = useState<number[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactCaseId, setContactCaseId] = useState<number | null>(null);
  const [contactMode, setContactMode] = useState<"in_app"|"email"|"sms">("in_app");
  const [contactSubject, setContactSubject] = useState("");
  const [contactBody, setContactBody] = useState("");
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ email: "", first_name: "", last_name: "", phone: "", password: "" });

  // Export helpers using CDN scripts (same as client/admin)
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
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${el.outerHTML}</body></html>`;
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

  // Redirect if not authenticated or not operator
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/logowanie');
    } else if (user?.role !== 'operator') {
      router.push('/'); // Redirect non-operators
    }
  }, [isAuthenticated, user, router]);

  // Sync tab from query string (?tab=...)
  useEffect(() => {
    const tab = (searchParams?.get('tab') || '').toLowerCase();
    const allowed = ["zadania", "statystyki", "klienci", "szablony", "wiadomosci", "ustawienia"] as const;
    if (allowed.includes(tab as any)) {
      setActiveTab(tab as typeof allowed[number]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load real cases from API
  useEffect(() => {
    if (isAuthenticated && user?.role === 'operator') {
      loadCases();
    }
  }, [isAuthenticated, user]);

  // Load templates for quick replies
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await authAPI.makeRequest<any[]>("GET", "/templates", undefined, true);
        setTemplates(data.map(t => ({ id: t.id, name: t.name, content: t.content })));
      } catch {}
    };
    loadTemplates();
  }, []);

  // Load operator stats for chart
  const fetchStats = async () => {
    try {
      const data = await authAPI.makeRequest<{days:string[]; cases_created:number[]; analyses_created:number[]; templates_used:number[]; payments_count:number[]; revenue_amount:number[]}>("GET", `/operator/stats?days=${statsRange}`, undefined, true);
      setStats(data);
    } catch {}
  };

  useEffect(() => {
    fetchStats();
  }, [statsRange]);

  // Auto-refresh stats every 60s
  useEffect(() => {
    const id = setInterval(() => {
      fetchStats();
    }, 60000);
    return () => clearInterval(id);
  }, [statsRange]);

  // Load case messages when case changes
  const fetchMessages = async () => {
    if (!selectedCaseId) { setCaseMessages([]); return; }
    try {
      const data = await authAPI.makeRequest<{messages:Array<{id:number; content:string; sender_role:string; created_at:string}>}>("GET", `/messages/case/${selectedCaseId}`, undefined, true);
      const transformed = data.messages.map(m => ({
        id: m.id,
        sender: m.sender_role || 'user',
        content: m.content,
        ts: m.created_at,
      }));
      // filter out locally deleted or archived if toggled off
      const deleted = getLocalStatusArray(selectedCaseId, 'deleted');
      const archived = getLocalStatusArray(selectedCaseId, 'archived');
      const visible = transformed.filter((_, idx) => !deleted.includes(idx));
      setCaseMessages(visible);
      setSelectedMsgIdx([]);
    } catch { setCaseMessages([]); }
  };

  useEffect(() => {
    fetchMessages();
  }, [selectedCaseId]);

  // Auto-refresh messages every 30s for selected case
  useEffect(() => {
    if (!selectedCaseId) return;
    const id = setInterval(() => {
      fetchMessages();
    }, 30000);
    return () => clearInterval(id);
  }, [selectedCaseId]);

  const loadCases = async () => {
    setLoading(true);
    const { cases: operatorCases, error } = await operatorAPI.getCases();
    
    if (error) {
      toast({
        title: "Błąd",
        description: error,
        variant: "destructive",
      });
    } else if (operatorCases) {
      setCases(operatorCases);
    }
    setLoading(false);
  };

  const transformCaseToTask = (operatorCase: OperatorCase): Task => {
    const statusMap: Record<string, Task['status']> = {
      'paid': 'pending',
      'processing': 'in_progress',
      'analysis_ready': 'completed',
      'documents_ready': 'completed',
      'completed': 'completed'
    };
    
    const priorityMap: Record<string, Task['priority']> = {
      'basic': 'low',
      'standard': 'medium',
      'premium': 'high'
    };

    return {
      id: operatorCase.id.toString(),
      caseId: operatorCase.id.toString(),
      title: operatorCase.title,
      client: operatorCase.client_name || operatorCase.client_email || 'Nieznany klient',
      status: statusMap[operatorCase.status] || 'pending',
      priority: priorityMap[operatorCase.package_type || 'standard'] || 'medium',
      deadline: operatorCase.deadline ? new Date(operatorCase.deadline) : new Date(operatorCase.created_at || Date.now()),
      documents: operatorCase.documents.length,
      package: operatorCase.package_type || 'standard',
      type: 'analysis',
      description: operatorCase.description || operatorCase.client_notes || ''
    };
  };

  // Transform real cases to tasks for UI compatibility
  const currentTasks = cases.map(transformCaseToTask);

  // --- Stats helpers
  const lastNDays = (n: number) => {
    const days: string[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  };
  const days = stats.days.length ? stats.days : lastNDays(Number(statsRange));
  const seriesCases = stats.cases_created.length ? stats.cases_created : days.map(day => currentTasks.filter(t => t.deadline.toISOString().slice(0,10) === day).length);
  const seriesAnalyses = stats.analyses_created.length ? stats.analyses_created : days.map(() => 0);
  const seriesTemplates = stats.templates_used.length ? stats.templates_used : days.map(() => 0);
  const seriesPayments = (stats.payments_count && stats.payments_count.length) ? stats.payments_count : days.map(() => 0);
  const seriesRevenue = (stats.revenue_amount && stats.revenue_amount.length) ? stats.revenue_amount : days.map(() => 0);
  const chartData = days.map((d, i) => ({ date: d, cases: seriesCases[i] || 0, analyses: seriesAnalyses[i] || 0, templates: seriesTemplates[i] || 0, payments: seriesPayments[i] || 0, revenue: seriesRevenue[i] || 0 }));
  const chartConfig: ChartConfig = {
    cases: { label: "Sprawy", color: "var(--chart-1)" },
    analyses: { label: "Analizy", color: "var(--chart-2)" },
    templates: { label: "Szablony użycia", color: "var(--chart-3)" },
    payments: { label: "Płatności", color: "var(--chart-4)" },
    revenue: { label: "Przychód (PLN)", color: "var(--chart-5)" },
  };

  // --- Chat helpers
  const getLocalMessages = (caseId: number) => {
    try {
      const raw = localStorage.getItem(`messages-case-${caseId}`);
      return raw ? JSON.parse(raw) as Array<{sender:string; content:string; ts:string}> : [];
    } catch { return []; }
  };
  const appendLocalMessage = (caseId: number, msg: {sender:string; content:string; ts:string}) => {
    const prev = getLocalMessages(caseId);
    const next = [...prev, msg];
    localStorage.setItem(`messages-case-${caseId}`, JSON.stringify(next));
  };

  // --- Local archive/delete helpers (client-side only)
  const getLocalStatusArray = (caseId: number, key: 'archived'|'deleted') => {
    try {
      const raw = localStorage.getItem(`${key}-messages-case-${caseId}`);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch { return []; }
  };
  const setLocalStatusArray = (caseId: number, key: 'archived'|'deleted', arr: number[]) => {
    localStorage.setItem(`${key}-messages-case-${caseId}`, JSON.stringify(arr));
  };
  const toggleSelection = (idx: number) => {
    setSelectedMsgIdx(prev => prev.includes(idx) ? prev.filter(i => i!==idx) : [...prev, idx]);
  };
  const selectAll = () => setSelectedMsgIdx(caseMessages.map((_, i) => i));
  const clearSelection = () => setSelectedMsgIdx([]);

  const exportTxt = () => {
    if (!selectedCaseId) return;
    window.open(`/api/v1/messages/export/case/${selectedCaseId}.txt`, '_blank');
  };
  const exportPdf = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write('<html><head><title>Wiadomości</title></head><body>');
    win.document.write(`<h3>Wiadomości — sprawa #${selectedCaseId}</h3>`);
    caseMessages.forEach((m) => {
      win.document.write(`<div style="margin:8px 0;padding:8px;border:1px solid #ddd;border-radius:6px;">`+
        `<div style="font-size:12px;color:#555;">${new Date(m.ts).toLocaleString('pl-PL')} • ${m.sender}</div>`+
        `<div style="white-space:pre-wrap;">${(m.content||'').replace(/</g,'&lt;')}</div>`+
      `</div>`);
    });
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    win.print();
  };
  const deleteSelected = async () => {
    if (!selectedCaseId || !selectedMsgIdx.length) return;
    const ids = selectedMsgIdx.map((i) => caseMessages[i]?.id).filter(Boolean) as number[];
    for (const id of ids) {
      try { await authAPI.makeRequest('DELETE', `/messages/message/${id}`, undefined, true); } catch {}
    }
    fetchMessages();
  };
  const archiveSelected = async () => {
    if (!selectedCaseId || !selectedMsgIdx.length) return;
    const ids = selectedMsgIdx.map((i) => caseMessages[i]?.id).filter(Boolean) as number[];
    for (const id of ids) {
      try { await authAPI.makeRequest('POST', `/messages/message/${id}/archive`, {}, true); } catch {}
    }
    fetchMessages();
  };
  const handleSendMessage = async (toAdmin = false) => {
    if (!selectedCaseId || !chatInput.trim()) return;
    const content = chatInput.trim();
    setChatInput("");
    appendLocalMessage(selectedCaseId, { sender: toAdmin ? 'operator→admin' : 'operator→client', content, ts: new Date().toISOString() });
    try {
      await authAPI.makeRequest("POST", `/operator/cases/${selectedCaseId}/messages`, { message_content: content }, true);
    } catch {}
  };

  // Kontakt modal helpers
  const openContact = (caseId: number, mode: "in_app"|"email"|"sms" = "in_app") => {
    setContactCaseId(caseId);
    setContactMode(mode);
    setContactSubject("");
    setContactBody("");
    setContactOpen(true);
  };

  const submitContact = async () => {
    if (!contactCaseId || !contactBody.trim()) { return; }
    try {
      if (contactMode === "in_app") {
        await authAPI.makeRequest("POST", `/operator/cases/${contactCaseId}/messages`, { message_content: contactBody }, true);
        toast({ title: "Wiadomość wysłana" });
      } else {
        const type = contactMode === "email" ? "email" : "sms";
        await authAPI.makeRequest("POST", "/notifications/operator/send-custom", { case_id: contactCaseId, type, subject: contactSubject || undefined, content: contactBody }, true);
        toast({ title: type === 'email' ? "Email wysłany" : "SMS wysłany" });
      }
    } catch (e: any) {
      toast({ title: "Błąd", description: e?.message || "Nie udało się wysłać", variant: "destructive" });
    } finally {
      setContactOpen(false);
    }
  };

  // Add Client modal helper
  const submitNewClient = async () => {
    if (!newClient.email) { toast({ title: "Email wymagany", variant: "destructive" }); return; }
    try {
      await authAPI.makeRequest("POST", "/operator/clients", newClient, true);
      toast({ title: "Klient utworzony" });
      setAddClientOpen(false);
      loadCases();
    } catch (e: any) {
      toast({ title: "Błąd", description: e?.message || "Nie udało się utworzyć klienta", variant: "destructive" });
    }
  };

  const sidebarItems = [
    { id: "zadania", label: "Zadania do wykonania", icon: FileText },
    { id: "statystyki", label: "Statystyki", icon: BarChart3 },
    { id: "klienci", label: "Klienci", icon: Users },
    { id: "szablony", label: "Szablony odpowiedzi", icon: MessageSquare },
    { id: "wiadomosci", label: "Wiadomości", icon: Mail },
    { id: "ustawienia", label: "Ustawienia", icon: Settings },
  ] as const;

  /* ---------------------------------------------------------------------- */
  /*                                HELPERS                                 */
  /* ---------------------------------------------------------------------- */
  const getPriorityBadge = (priority: Task["priority"]) => {
    const map = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    };
    return map[priority];
  };

  const getStatusBadge = (status: Task["status"]) => {
    const map = {
      pending: {
        label: "Oczekuje",
        color: "bg-blue-100 text-blue-800",
        icon: Clock4,
      },
      in_progress: {
        label: "W trakcie",
        color: "bg-yellow-100 text-yellow-800",
        icon: AlertCircle,
      },
      completed: {
        label: "Zakończone",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle2,
      },
    };
    return map[status];
  };

  /* ---------------------------------------------------------------------- */
  /*                                   UI                                   */
  /* ---------------------------------------------------------------------- */
  if (!isAuthenticated) {
    return <div className="p-10 text-center">Ładowanie...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <Header />
      
      {/* Mobile header with sidebar toggle */}
      <header className="lg:hidden bg-white shadow-sm border-b sticky top-16 z-50">
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
            <h1 className="text-lg font-semibold">Panel Operatora</h1>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
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

        {/* ----------------------------- SIDEBAR ---------------------------- */}
        <aside
          className={`bg-white shadow-lg transition-all duration-300 z-50 ${
            sidebarOpen 
              ? "fixed lg:static inset-y-0 left-0 w-64" 
              : "w-64 hidden lg:block"
          }`}
        >
          <div className="p-6 h-full flex flex-col">
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
            
            {/* operator info with animated avatar group */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Avatar className="mr-3">
                    <AvatarImage src={getUserAvatarSrc(user)} />
                    <AvatarFallback>{getUserInitials(user, 'OP')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.name ?? "Operator"}</p>
                    <p className="text-xs text-gray-500">Panel operatora</p>
                  </div>
                </div>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarImage src={getUserAvatarSrc(user)} />
                <AvatarFallback>{getUserInitials(user, 'O')}</AvatarFallback>
              </Avatar>
            </div>

            {/* nav */}
            <nav className="space-y-2 flex-1">
              {sidebarItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id as typeof activeTab);
                    // reflect selection in URL for deep-linking
                    const url = id === 'zadania' ? '/panel-operatora' : `/panel-operatora?tab=${id}`;
                    router.push(url);
                    // Close mobile sidebar when item is clicked
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* -------------------------- MAIN CONTENT -------------------------- */}
        <main className="flex-1 p-6">
          {activeTab === "zadania" && (
            <>
              {/* header row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  Zadania do wykonania
                </h1>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtruj
                  </Button>
                  <Button size="sm" onClick={loadCases} disabled={loading}>
                    {loading ? "Ładowanie..." : "Odśwież"}
                  </Button>
                </div>
              </div>

              {/* simple stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                  title="Oczekujące"
                  value={currentTasks.filter((t) => t.status === "pending").length}
                  color="bg-blue-100 text-blue-800"
                />
                <StatCard
                  title="W trakcie"
                  value={
                    currentTasks.filter((t) => t.status === "in_progress").length
                  }
                  color="bg-yellow-100 text-yellow-800"
                />
                <StatCard
                  title="Zakończone"
                  value={
                    currentTasks.filter((t) => t.status === "completed").length
                  }
                  color="bg-green-100 text-green-800"
                />
              </div>

              {/* task list */}
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Ładowanie spraw...</p>
                  </div>
                ) : currentTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Brak spraw do przetworzenia</p>
                  </div>
                ) : currentTasks.map((task) => {
                  const priorityClass = getPriorityBadge(task.priority);
                  const statusMeta = getStatusBadge(task.status);
                  return (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {task.title}
                              </h3>
                              <div className="flex gap-2 mt-2 sm:mt-0">
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${priorityClass}`}
                                >
                                  {task.priority === "high"
                                    ? "Wysoki"
                                    : task.priority === "medium"
                                      ? "Średni"
                                      : "Niski"}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusMeta.color}`}
                                >
                                  <statusMeta.icon className="h-3 w-3" />
                                  {statusMeta.label}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm font-medium text-gray-500">Klient</p>
                                <p className="text-gray-900">{task.client}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Termin</p>
                                <p className="text-gray-900">{task.deadline.toLocaleDateString("pl-PL")}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Dokumenty</p>
                                <p className="text-gray-900">{task.documents} plików</p>
                              </div>
                            </div>
                            {task.description && (
                              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                                <p className="text-sm font-medium text-blue-800 mb-1">Uwagi klienta:</p>
                                <p className="text-blue-700 text-sm">{task.description}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 lg:ml-4">
                            <Button size="sm" className="w-full lg:w-auto" asChild>
                              <Link href={`/panel-operatora/sprawa/${task.caseId}`}>
                                <FileText className="mr-2 h-4 w-4" />
                                Otwórz sprawę
                              </Link>
                            </Button>
                            {task.status === "pending" && (
                              <Button size="sm" variant="outline" className="w-full lg:w-auto">
                                Rozpocznij pracę
                              </Button>
                            )}
                            {task.status === "in_progress" && (
                              <Button size="sm" variant="outline" className="w-full lg:w-auto">
                                Zakończ
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="w-full lg:w-auto" onClick={() => openContact(Number(task.caseId), "in_app") }>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Kontakt
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {false && (
            <div className="text-center text-gray-500 pt-20">
              Funkcjonalność „{activeTab}” jest w trakcie tworzenia.
            </div>
          )}
          {/* Statystyki Section */}
          {activeTab === "statystyki" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Statystyki</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Sprawy w tym miesiącu"
                  value={currentTasks.length}
                  color="bg-blue-100 text-blue-800"
                />
                <StatCard
                  title="Średni czas realizacji"
                  value={2.5}
                  color="bg-green-100 text-green-800"
                  suffix=" dni"
                />
                <StatCard
                  title="Zadowolenie klientów"
                  value={98}
                  color="bg-purple-100 text-purple-800"
                  suffix="%"
                />
                <StatCard
                  title="Ukończone sprawy"
                  value={currentTasks.filter(t => t.status === "completed").length}
                  color="bg-green-100 text-green-800"
                />
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <h3 className="text-lg font-semibold">Wydajność w czasie</h3>
                    <div className="ml-auto flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={fetchStats}>Odśwież</Button>
                      <Select value={statsRange} onValueChange={(v: any) => setStatsRange(v)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Zakres" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Ostatnie 7 dni</SelectItem>
                          <SelectItem value="14">Ostatnie 14 dni</SelectItem>
                          <SelectItem value="30">Ostatnie 30 dni</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                    <AreaChart data={chartData} margin={{ left: 6, right: 6, top: 6, bottom: 6 }}>
                      <defs>
                        <linearGradient id="fillCases" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="fillAnalyses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="fillTemplates" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <defs>
                        <linearGradient id="fillPayments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} tickFormatter={(value: string) => new Date(value).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(value) => new Date(String(value)).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })} />} />
                      <Area dataKey="cases" name="Sprawy" type="natural" fill="url(#fillCases)" stroke="var(--chart-1)" strokeWidth={2} />
                      <Area dataKey="analyses" name="Analizy" type="natural" fill="url(#fillAnalyses)" stroke="var(--chart-2)" strokeWidth={2} />
                      <Area dataKey="templates" name="Szablony użycia" type="natural" fill="url(#fillTemplates)" stroke="var(--chart-3)" strokeWidth={2} />
                      <Area dataKey="payments" name="Płatności" type="natural" fill="url(#fillPayments)" stroke="var(--chart-4)" strokeWidth={2} />
                      <Area dataKey="revenue" name="Przychód (PLN)" type="natural" fill="url(#fillRevenue)" stroke="var(--chart-5)" strokeWidth={2} />
                      <ChartLegend verticalAlign="bottom" content={<ChartLegendContent />} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Kalendarz terminów (lista nadchodzących) */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3">Kalendarz terminów</h3>
                  <p className="text-sm text-muted-foreground mb-3">Najbliższe 10 terminów ze spraw</p>
                  <div className="space-y-2">
                    {currentTasks
                      .filter(t => t.deadline)
                      .sort((a,b) => a.deadline.getTime() - b.deadline.getTime())
                      .slice(0,10)
                      .map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded border">
                          <div className="text-sm font-medium truncate mr-3">{t.title}</div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">{t.deadline.toLocaleDateString('pl-PL')}</div>
                        </div>
                      ))}
                    {currentTasks.length === 0 && (
                      <div className="text-sm text-muted-foreground">Brak zaplanowanych terminów</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Klienci Section */}
          {activeTab === "klienci" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Klienci</h1>
                <Button size="sm" onClick={() => setAddClientOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj klienta
                </Button>
              </div>

              <div className="space-y-4">
                {Array.from(new Set(currentTasks.map(t => t.client))).map((client, index) => {
                  const clientCases = currentTasks.filter(t => t.client === client);
                  const activeCases = clientCases.filter(t => t.status !== "completed").length;
                  
                  return (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{client}</h3>
                              <p className="text-sm text-gray-500">
                                {clientCases.length} spraw • {activeCases} aktywnych
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => clientCases[0] ? openContact(Number(clientCases[0].caseId), "email") : null}>
                              <Mail className="mr-2 h-4 w-4" />
                              Email
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => clientCases[0] ? openContact(Number(clientCases[0].caseId), "in_app") : null}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Wiadomość
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Szablony Section (reuse full page component) */}
          {activeTab === "szablony" && (
            <div className="space-y-6">
              <OperatorTemplatesPage />
            </div>
          )}

          {/* Wiadomości Section (DB-backed, shared components) */}
          {activeTab === "wiadomosci" && (
            <div className="space-y-6">
              <div className="lg:col-span-3 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Wiadomości</h1>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => exportSectionAsPNG('#operator-chat-container', `czat-${Date.now()}`)}>Eksport PNG</Button>
                  <Button variant="outline" onClick={() => exportSectionAsDOCX('#operator-chat-container', `czat-${Date.now()}`)}>Eksport DOCX</Button>
                  <Button variant="outline" onClick={() => window.print()}>PDF</Button>
                  <Button variant="default" disabled title="Wkrótce">Nowa wiadomość</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <MessageList
                    currentUserRole="operator"
                    onSelectConversationAction={(conversation: any) => setSelectedConversation(conversation)}
                    selectedConversationId={selectedConversation?.id}
                    className="h-96 lg:h-full"
                  />
                </div>
                <div className="lg:col-span-2" id="operator-chat-container">
                  {selectedConversation ? (
                    <MessagingInterface
                      currentUserId={user?.id?.toString() || ""}
                      currentUserRole="operator"
                      caseId={selectedConversation.case_id}
                      conversationId={selectedConversation.id?.toString?.()}
                      recipientId={selectedConversation.participant_id?.toString?.() || undefined}
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

          {/* Kontakt Modal */}
          <Dialog open={contactOpen} onOpenChange={setContactOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kontakt z klientem</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button size="sm" variant={contactMode==='in_app'?'default':'outline'} onClick={() => setContactMode('in_app')}>Wiadomość w panelu</Button>
                  <Button size="sm" variant={contactMode==='email'?'default':'outline'} onClick={() => setContactMode('email')}>Email</Button>
                  <Button size="sm" variant={contactMode==='sms'?'default':'outline'} onClick={() => setContactMode('sms')}>SMS</Button>
                </div>
                {(contactMode === 'email') && (
                  <Input placeholder="Temat" value={contactSubject} onChange={(e) => setContactSubject(e.target.value)} />
                )}
                <textarea className="w-full border rounded-md p-2 h-40" placeholder="Treść wiadomości" value={contactBody} onChange={(e) => setContactBody(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setContactOpen(false)}>Anuluj</Button>
                <Button onClick={submitContact}>Wyślij</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dodaj Klienta Modal */}
          <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj klienta</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Email</label>
                  <Input value={newClient.email} onChange={(e)=>setNewClient({...newClient, email:e.target.value})} placeholder="klient@domena.pl" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Imię</label>
                  <Input value={newClient.first_name} onChange={(e)=>setNewClient({...newClient, first_name:e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Nazwisko</label>
                  <Input value={newClient.last_name} onChange={(e)=>setNewClient({...newClient, last_name:e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Telefon</label>
                  <Input value={newClient.phone} onChange={(e)=>setNewClient({...newClient, phone:e.target.value})} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Hasło (opcjonalnie)</label>
                  <Input type="password" value={newClient.password} onChange={(e)=>setNewClient({...newClient, password:e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setAddClientOpen(false)}>Anuluj</Button>
                <Button onClick={submitNewClient}>Zapisz</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Ustawienia Section */}
          {activeTab === "ustawienia" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Ustawienia</h1>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Powiadomienia</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Nowe sprawy</p>
                          <p className="text-sm text-gray-500">Powiadomienia o nowych sprawach</p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Zbliżające się terminy</p>
                          <p className="text-sm text-gray-500">Alerty o terminach</p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Wiadomości od klientów</p>
                          <p className="text-sm text-gray-500">Powiadomienia o nowych wiadomościach</p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Preferencje pracy</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Maksymalna liczba aktywnych spraw
                        </label>
                        <input 
                          type="number" 
                          defaultValue={10} 
                          className="w-full border rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Preferowany czas pracy
                        </label>
                        <select className="w-full border rounded-md px-3 py-2">
                          <option>8:00 - 16:00</option>
                          <option>9:00 - 17:00</option>
                          <option>10:00 - 18:00</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Automatyczne przypisywanie spraw
                        </label>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Profil</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Imię i nazwisko</label>
                        <input 
                          type="text" 
                          defaultValue={user?.name || ""} 
                          className="w-full border rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input 
                          type="email" 
                          defaultValue={user?.email || ""} 
                          className="w-full border rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Telefon</label>
                        <input 
                          type="tel" 
                          placeholder="+48 123 456 789" 
                          className="w-full border rounded-md px-3 py-2"
                        />
                      </div>
                      <Button className="w-full">
                        <Save className="mr-2 h-4 w-4" />
                        Zapisz zmiany
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Bezpieczeństwo</h3>
                    <div className="space-y-4">
                      <Button variant="outline" className="w-full">
                        Zmień hasło
                      </Button>
                      <Button variant="outline" className="w-full">
                        Włącz dwuskładnikowe uwierzytelnianie
                      </Button>
                      <Button variant="outline" className="w-full">
                        Wyloguj ze wszystkich urządzeń
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Messages list and actions */}
                <Card className="lg:col-span-2">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex flex-wrap gap-2 justify-between items-center">
                      <div className="text-sm text-gray-600">{selectedCaseId ? `Sprawa #${selectedCaseId}` : 'Wybierz sprawę'}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={selectAll} disabled={!caseMessages.length}>Zaznacz wszystkie</Button>
                        <Button size="sm" variant="outline" onClick={clearSelection} disabled={!selectedMsgIdx.length}>Wyczyść zaznaczenie</Button>
                        <Button size="sm" onClick={exportTxt} disabled={!caseMessages.length}>Eksport TXT</Button>
                        <Button size="sm" onClick={exportPdf} disabled={!caseMessages.length}>Eksport PDF</Button>
                        <Button size="sm" variant="destructive" onClick={deleteSelected} disabled={!selectedMsgIdx.length}>Usuń zaznaczone</Button>
                        <Button size="sm" variant="secondary" onClick={archiveSelected} disabled={!selectedMsgIdx.length}>Archiwizuj</Button>
                      </div>
                    </div>

                    <div className="divide-y border rounded-md">
                      {caseMessages.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">Brak wiadomości do wyświetlenia</div>
                      ) : (
                        caseMessages.map((m, idx) => (
                          <div key={idx} className="p-3 flex items-start gap-3">
                            <input type="checkbox" className="mt-1" checked={selectedMsgIdx.includes(idx)} onChange={()=>toggleSelection(idx)} />
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">{new Date(m.ts).toLocaleString('pl-PL')} • {m.sender}</div>
                              <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*                               SUB-COMPONENT                            */
/* ---------------------------------------------------------------------- */
function StatCard({
  title,
  value,
  color,
  suffix = ""
}: {
  title: string;
  value: number;
  color: string;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}{suffix}</p>
      </CardContent>
    </Card>
  );
}
