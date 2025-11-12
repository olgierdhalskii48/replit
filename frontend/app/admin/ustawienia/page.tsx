"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { RefreshCw, Save } from "lucide-react";
import { authAPI } from "@/lib/api/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadAvatar, deleteAvatar } from "@/lib/avatar";
import { useAuth } from "@/lib/auth";

interface AdminSettings {
  // General
  analyticsPublic: boolean;
  emailFrom: string;
  enablePayments: boolean;
  notifyOnUserCreate: boolean;
  brandName: string;
  supportEmail: string;
  legalFooter: string;
  // Payments
  paymentsProvider: 'payu'|'stripe'|'disabled';
  payuPosId?: string;
  payuSecondKey?: string;
  stripePk?: string;
  stripeSk?: string;
  // Notifications
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpSecure?: boolean;
  smsProvider?: 'twilio'|'disabled';
  twilioSid?: string;
  twilioToken?: string;
  twilioFrom?: string;
  // Security
  require2FA?: boolean;
  sessionTimeoutMin?: number;
}

export default function AdminSettingsPage() {
  const { user, updateUser, fetchUserSession } = useAuth();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>({
    analyticsPublic: false,
    emailFrom: "noreply@kancelariax.pl",
    enablePayments: true,
    notifyOnUserCreate: true,
    brandName: "Kancelaria X",
    supportEmail: "support@kancelariax.pl",
    legalFooter: "© 2025 Kancelaria X. Wszelkie prawa zastrzeżone.",
    paymentsProvider: 'payu',
    payuPosId: "",
    payuSecondKey: "",
    stripePk: "",
    stripeSk: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpSecure: true,
    smsProvider: 'disabled',
    twilioSid: "",
    twilioToken: "",
    twilioFrom: "",
    require2FA: false,
    sessionTimeoutMin: 60,
  });
  // Secrets masking controls
  const [showPayu, setShowPayu] = useState(false);
  const [showStripe, setShowStripe] = useState(false);
  const [mask, setMask] = useState<{payuSecondKey?: string; stripeSk?: string; stripePk?: string}>({});
  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await authAPI.makeRequest<AdminSettings>("GET", "/admin/settings", undefined, true);
        setSettings(res);
        // Build masked previews for secrets (show last 4)
        const m: typeof mask = {};
        if (res.payuSecondKey) m.payuSecondKey = `********${res.payuSecondKey.slice(-4)}`;
        if (res.stripeSk) m.stripeSk = `********${res.stripeSk.slice(-4)}`;
        if (res.stripePk) m.stripePk = `****${res.stripePk.slice(-4)}`;
        setMask(m);
      } catch (e) {
        // fallback to existing defaults
        toast({ title: "Nie udało się załadować ustawień", variant: "destructive" });
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (!settings.emailFrom.includes('@')) {
        toast({ title: 'Nieprawidłowy adres e‑mail nadawcy', variant: 'destructive' });
        return;
      }
      if (!settings.supportEmail.includes('@')) {
        toast({ title: 'Nieprawidłowy e‑mail wsparcia', variant: 'destructive' });
        return;
      }
      if (settings.paymentsProvider === 'payu' && (!settings.payuPosId || (!settings.payuSecondKey || settings.payuSecondKey.startsWith('********')))) {
        toast({ title: 'Uzupełnij ustawienia PayU (POS ID i Second Key)', variant: 'destructive' });
        return;
      }
      if (settings.paymentsProvider === 'stripe' && ((!settings.stripePk || settings.stripePk.startsWith('****')) || (!settings.stripeSk || settings.stripeSk.startsWith('********')))) {
        toast({ title: 'Uzupełnij klucze Stripe (Publishable i Secret)', variant: 'destructive' });
        return;
      }
      // Prepare partial payload; include only changed or non-masked secrets
      const payload: any = {};
      const push = (k: keyof AdminSettings) => { (payload as any)[k] = (settings as any)[k]; };
      // Always include core visible fields
      ['analyticsPublic','emailFrom','enablePayments','notifyOnUserCreate','brandName','supportEmail','legalFooter','paymentsProvider','smtpHost','smtpPort','smtpUser','smtpSecure','smsProvider','twilioSid','twilioToken','twilioFrom','require2FA','sessionTimeoutMin']
        .forEach((k) => { if ((settings as any)[k] !== undefined) (payload as any)[k] = (settings as any)[k]; });
      // Provider specific secrets - send only when not masked or user toggled show
      if (settings.paymentsProvider === 'payu') {
        if (settings.payuPosId) payload.payuPosId = settings.payuPosId;
        if (settings.payuSecondKey && !settings.payuSecondKey.startsWith('********')) payload.payuSecondKey = settings.payuSecondKey;
      } else if (settings.paymentsProvider === 'stripe') {
        if (settings.stripePk && !settings.stripePk.startsWith('****')) payload.stripePk = settings.stripePk;
        if (settings.stripeSk && !settings.stripeSk.startsWith('********')) payload.stripeSk = settings.stripeSk;
      }

      const saved = await authAPI.makeRequest<AdminSettings>("PUT", "/admin/settings", payload, true);
      setSettings(saved);
      // Recompute masks after save
      const m: typeof mask = {};
      if (saved.payuSecondKey) m.payuSecondKey = `********${saved.payuSecondKey.slice(-4)}`;
      if (saved.stripeSk) m.stripeSk = `********${saved.stripeSk.slice(-4)}`;
      if (saved.stripePk) m.stripePk = `****${saved.stripePk.slice(-4)}`;
      setMask(m);
      toast({ title: 'Zapisano ustawienia (API)' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profil administratora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarPreview || (user as any)?.avatar_url} />
              <AvatarFallback>
                {(user?.name || user?.email || 'A')
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0,2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setAvatarFile(file);
                  if (file) {
                    if (!file.type.startsWith('image/')) {
                      toast({ title: 'Nieprawidłowy plik', description: 'Wybierz obraz (JPG/PNG/WebP).', variant: 'destructive' });
                      return;
                    }
                    if (file.size > 2 * 1024 * 1024) {
                      toast({ title: 'Plik zbyt duży', description: 'Maksymalny rozmiar to 2MB.', variant: 'destructive' });
                      return;
                    }
                    const url = URL.createObjectURL(file);
                    setAvatarPreview(url);
                  } else {
                    setAvatarPreview("");
                  }
                }}
              />
              <div className="flex gap-2">
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
                      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                      setAvatarFile(null);
                      setAvatarPreview("");
                      toast({ title: 'Avatar zaktualizowany' });
                    } catch (e) {
                      toast({ title: 'Nie udało się zaktualizować avatara', variant: 'destructive' });
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
                      toast({ title: 'Nie udało się usunąć avatara', variant: 'destructive' });
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
              <p className="text-xs text-muted-foreground">JPG, PNG do 2MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ustawienia (Admin)</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4 mr-2"/>Odśwież</Button>
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2"/>{saving ? "Zapisywanie…" : "Zapisz"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Ogólne</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nazwa marki</Label>
              <Input value={settings.brandName} onChange={(e)=>setSettings({...settings, brandName: e.target.value})} />
            </div>
            <div>
              <Label>Wsparcie (e‑mail)</Label>
              <Input value={settings.supportEmail} onChange={(e)=>setSettings({...settings, supportEmail: e.target.value})} />
            </div>
          </div>
          <div>
            <Label htmlFor="emailFrom">Adres nadawcy e‑mail</Label>
            <Input id="emailFrom" value={settings.emailFrom} onChange={(e)=>setSettings({...settings, emailFrom: e.target.value})} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Udostępniaj widok analityki</Label>
              <p className="text-xs text-muted-foreground">Pozwala na publiczny podgląd metryk.</p>
            </div>
            <Switch checked={settings.analyticsPublic} onCheckedChange={(c)=>setSettings({...settings, analyticsPublic: Boolean(c)})} />
          </div>
          <div>
            <Label>Stopka prawna</Label>
            <Textarea rows={3} value={settings.legalFooter} onChange={(e)=>setSettings({...settings, legalFooter: e.target.value})} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Płatności</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Włącz płatności</Label>
              <p className="text-xs text-muted-foreground">Zezwalaj na nowe transakcje.</p>
            </div>
            <Switch checked={settings.enablePayments} onCheckedChange={(c)=>setSettings({...settings, enablePayments: Boolean(c)})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Dostawca</Label>
              <div className="flex gap-2 mt-2">
                <Button variant={settings.paymentsProvider==='payu'?'default':'outline'} onClick={()=>setSettings({...settings, paymentsProvider: 'payu'})}>PayU</Button>
                <Button variant={settings.paymentsProvider==='stripe'?'default':'outline'} onClick={()=>setSettings({...settings, paymentsProvider: 'stripe'})}>Stripe</Button>
                <Button variant={settings.paymentsProvider==='disabled'?'default':'outline'} onClick={()=>setSettings({...settings, paymentsProvider: 'disabled'})}>Wyłączone</Button>
              </div>
            </div>
          </div>
          {settings.paymentsProvider==='payu' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>PayU POS ID</Label>
                <Input value={settings.payuPosId||''} onChange={(e)=>setSettings({...settings, payuPosId: e.target.value})} placeholder="POS ID" />
              </div>
              <div>
                <Label>PayU Second Key</Label>
                <div className="flex gap-2">
                  <Input type={showPayu? 'text':'password'} value={settings.payuSecondKey || mask.payuSecondKey || ''} onChange={(e)=>setSettings({...settings, payuSecondKey: e.target.value})} placeholder="Sekretny klucz" />
                  <Button type="button" variant="outline" onClick={()=>setShowPayu(v=>!v)}>{showPayu?'Ukryj':'Pokaż'}</Button>
                </div>
                {mask.payuSecondKey && !showPayu && (
                  <p className="text-xs text-muted-foreground">Wartość ukryta · pozostanie bez zmian, jeśli jej nie nadpiszesz</p>
                )}
              </div>
            </div>
          )}
          {settings.paymentsProvider==='stripe' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Stripe Publishable Key</Label>
                <div className="flex gap-2">
                  <Input type={showStripe? 'text':'password'} value={settings.stripePk || mask.stripePk || ''} onChange={(e)=>setSettings({...settings, stripePk: e.target.value})} placeholder="pk_live_..." />
                  <Button type="button" variant="outline" onClick={()=>setShowStripe(v=>!v)}>{showStripe?'Ukryj':'Pokaż'}</Button>
                </div>
                {mask.stripePk && !showStripe && (
                  <p className="text-xs text-muted-foreground">Wartość ukryta · pozostanie bez zmian, jeśli jej nie nadpiszesz</p>
                )}
              </div>
              <div>
                <Label>Stripe Secret Key</Label>
                <div className="flex gap-2">
                  <Input type={showStripe? 'text':'password'} value={settings.stripeSk || mask.stripeSk || ''} onChange={(e)=>setSettings({...settings, stripeSk: e.target.value})} placeholder="sk_live_..." />
                  <Button type="button" variant="outline" onClick={()=>setShowStripe(v=>!v)}>{showStripe?'Ukryj':'Pokaż'}</Button>
                </div>
                {mask.stripeSk && !showStripe && (
                  <p className="text-xs text-muted-foreground">Wartość ukryta · pozostanie bez zmian, jeśli jej nie nadpiszesz</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Powiadomienia</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Powiadom o nowym użytkowniku</Label>
              <p className="text-xs text-muted-foreground">Wysyłaj alerty administratorom.</p>
            </div>
            <Switch checked={settings.notifyOnUserCreate} onCheckedChange={(c)=>setSettings({...settings, notifyOnUserCreate: Boolean(c)})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>SMTP Host</Label>
              <Input value={settings.smtpHost || ''} onChange={(e)=>setSettings({...settings, smtpHost: e.target.value})} />
            </div>
            <div>
              <Label>SMTP Port</Label>
              <Input type="number" value={settings.smtpPort || 0} onChange={(e)=>setSettings({...settings, smtpPort: Number(e.target.value)})} />
            </div>
            <div>
              <Label>SMTP User</Label>
              <Input value={settings.smtpUser || ''} onChange={(e)=>setSettings({...settings, smtpUser: e.target.value})} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>SMTP SSL/TLS</Label>
            </div>
            <Switch checked={!!settings.smtpSecure} onCheckedChange={(c)=>setSettings({...settings, smtpSecure: Boolean(c)})} />
          </div>
          <div>
            <Label>SMS Dostawca</Label>
            <div className="flex gap-2 mt-2">
              <Button variant={settings.smsProvider==='twilio'?'default':'outline'} onClick={()=>setSettings({...settings, smsProvider: 'twilio'})}>Twilio</Button>
              <Button variant={settings.smsProvider==='disabled'?'default':'outline'} onClick={()=>setSettings({...settings, smsProvider: 'disabled'})}>Wyłączone</Button>
            </div>
          </div>
          {settings.smsProvider==='twilio' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Twilio SID</Label>
                <Input value={settings.twilioSid || ''} onChange={(e)=>setSettings({...settings, twilioSid: e.target.value})} />
              </div>
              <div>
                <Label>Twilio Token</Label>
                <Input value={settings.twilioToken || ''} onChange={(e)=>setSettings({...settings, twilioToken: e.target.value})} />
              </div>
              <div>
                <Label>Twilio From</Label>
                <Input value={settings.twilioFrom || ''} onChange={(e)=>setSettings({...settings, twilioFrom: e.target.value})} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bezpieczeństwo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Wymagaj 2FA</Label>
              <p className="text-xs text-muted-foreground">Logowanie wymaga dodatkowego kroku.</p>
            </div>
            <Switch checked={!!settings.require2FA} onCheckedChange={(c)=>setSettings({...settings, require2FA: Boolean(c)})} />
          </div>
          <div>
            <Label>Limit czasu sesji (minuty)</Label>
            <Input type="number" value={settings.sessionTimeoutMin || 60} onChange={(e)=>setSettings({...settings, sessionTimeoutMin: Number(e.target.value)})} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 