"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { casesApi, type Case } from "@/lib/api/cases";
import { 
  ArrowLeft, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  Loader2,
  FileText,
  Clock
} from "lucide-react";

export default function PlatnoscPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  
  const caseId = searchParams.get('caseId');
  const amount = searchParams.get('amount');
  
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'PAYU' | 'STRIPE' | 'BANK_TRANSFER' | 'PAYPAL'>('PAYU');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<{paymentId:number; amount:number; provider:string; paidAt:string} | null>(null);

  // Helper: detect if token exists in storage even if auth state hasn't hydrated yet
  const tokenInStorage = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;

  // Helper: dynamically load a script from CDN (for PNG/DOCX exports)
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

  // PNG export via html2canvas loaded from CDN
  const exportSuccessAsPNG = async () => {
    const el = document.querySelector('#payment-success-summary') as HTMLElement | null;
    if (!el) return;
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
      const h2c = (window as any).html2canvas;
      if (!h2c) throw new Error('html2canvas not available');
      const canvas = await h2c(el, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `potwierdzenie-platnosci-${Date.now()}.png`;
      link.click();
    } catch (e) {
      // Fallback: let user print to PDF if PNG fails
      console.warn('PNG export failed', e);
      window.print();
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    // If we have no auth state AND no token, redirect to login.
    // If a token exists (persisted session), allow page to render and let auth hydrate.
    if (!isAuthenticated && !tokenInStorage) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
        }
      } catch {}
      router.push('/logowanie');
    }
  }, [isAuthenticated, tokenInStorage, router]);

  // Load case data
  useEffect(() => {
    // Respect preferred method from query string
    const method = searchParams.get('method');
    if (method) {
      const map: Record<string, 'PAYU'|'STRIPE'|'BANK_TRANSFER'|'PAYPAL'> = {
        payu: 'PAYU',
        card: 'STRIPE',
        blik: 'STRIPE', // routed through Stripe in demo
        transfer: 'BANK_TRANSFER',
        gpay: 'STRIPE',
      };
      const mapped = map[method.toLowerCase()];
      if (mapped) setPaymentMethod(mapped);
    }

    const loadCaseData = async () => {
      if (!caseId) {
        setError('Brak ID sprawy w parametrach');
        setLoading(false);
        return;
      }

      try {
        const result = await casesApi.getCase(parseInt(caseId));
        if (result.error) {
          setError(result.error);
        } else if (result.case) {
          setCaseData(result.case);
        }
      } catch (err) {
        setError('Błąd podczas ładowania danych sprawy');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && caseId) {
      loadCaseData();
    }
  }, [isAuthenticated, caseId]);

  const handlePayment = async () => {
    if (!caseData || !amount) return;
    
    setProcessing(true);
    
    try {
      // Create payment via API
      const { paymentsApi } = await import("@/lib/api/payments");
      
      // Get promo code from localStorage if available
      const appliedPromoCode = localStorage.getItem('appliedPromoCode');
      
      const paymentResult = await paymentsApi.createPayment({
        case_id: Number(caseData.id),
        amount: parseFloat(amount),
        payment_type: 'analysis',
        provider: paymentMethod,
        description: `Analiza dokumentów - sprawa #${caseData.id}`,
        promo_code: appliedPromoCode || undefined
      });

      if (paymentResult.error) {
        toast({ title: "Błąd tworzenia płatności", description: String(paymentResult.error), variant: "destructive" });
        return;
      }

      if (paymentResult.payment) {
        // Simulate payment success (for development)
        const simulateResult = await paymentsApi.simulatePaymentSuccess(paymentResult.payment.id);
        
        if (simulateResult.error) {
          toast({ title: "Błąd symulacji płatności", description: String(simulateResult.error), variant: "destructive" });
          return;
        }

        // Clear stored promo code after successful payment
        localStorage.removeItem('appliedPromoCode');
        localStorage.removeItem('pendingCaseId');
        
        // Persist success and keep user on summary page (no redirect)
        setSuccess({
          paymentId: paymentResult.payment.id,
          amount: Number(amount),
          provider: paymentMethod,
          paidAt: new Date().toISOString(),
        });
      }
      
    } catch (error) {
      toast({ title: "Błąd płatności", description: error instanceof Error ? error.message : 'Nieznany błąd', variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // (Removed duplicate PNG exporter that attempted dynamic import)

  const exportSuccessAsDOC = () => {
    const el = document.querySelector('#payment-success-summary') as HTMLElement | null;
    if (!el) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Potwierdzenie płatności</title></head><body>${el.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `potwierdzenie-platnosci-${Date.now()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSuccessAsDOCX = async () => {
    const el = document.querySelector('#payment-success-summary') as HTMLElement | null;
    if (!el) return;
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/html-docx-js@0.4.1/dist/html-docx.min.js');
      const HTMLDocx = (window as any).HTMLDocx;
      if (!HTMLDocx) throw new Error('html-docx-js not available');
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${el.outerHTML}</body></html>`;
      const blob = HTMLDocx.asBlob(html);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `potwierdzenie-platnosci-${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: 'Nie udało się zapisać DOCX', description: 'Sprawdź połączenie internetowe lub spróbuj PDF/PNG.', variant: 'destructive' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Sprawdzanie autoryzacji...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Ładowanie danych płatności...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="text-red-600 mb-4">
                <Shield className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-bold mb-2">Błąd</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.push('/zamow-analize')}>
                Powrót do zamówienia
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-montserrat">
      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Order Summary */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Podsumowanie zamówienia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{caseData.title || caseData.name}</h3>
                      <p className="text-sm text-gray-600">
                        Pakiet: {caseData.package_type || 'standard'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Dokumenty: {caseData.documents.length} plik(ów)
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      Nowa sprawa
                    </Badge>
                  </div>

                  {/* Documents list */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Przesłane dokumenty:</h4>
                    <div className="space-y-2">
                      {caseData.documents.map((doc, index) => (
                        <div key={doc.id} className="flex items-center text-sm">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{doc.name}</span>
                          <span className="ml-auto text-gray-500">
                            {(doc.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  {caseData.description && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Opis sprawy:</h4>
                      <p className="text-sm text-gray-600">{caseData.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Wybierz metodę płatności
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        {
                          'PAYU': 'border-blue-500 bg-blue-50',
                          'default': 'border-gray-200 hover:border-gray-300'
                        }[paymentMethod === 'PAYU' ? 'PAYU' : 'default']}`}
                      onClick={() => setPaymentMethod('PAYU')}
                    >
                      <div className="font-medium">PayU</div>
                      <div className="text-sm text-gray-600">
                        Szybkie płatności online
                      </div>
                      <Badge className="mt-2 bg-green-100 text-green-800">
                        Popularne w Polsce
                      </Badge>
                    </div>

                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${{
                        'STRIPE': 'border-blue-500 bg-blue-50',
                        'default': 'border-gray-200 hover:border-gray-300'
                      }[paymentMethod === 'STRIPE' ? 'STRIPE' : 'default']}`}
                      onClick={() => setPaymentMethod('STRIPE')}
                    >
                      <div className="font-medium">Karta płatnicza</div>
                      <div className="text-sm text-gray-600">
                        Visa, Mastercard, BLIK
                      </div>
                    </div>

                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${{
                        'BANK_TRANSFER': 'border-blue-500 bg-blue-50',
                        'default': 'border-gray-200 hover:border-gray-300'
                      }[paymentMethod === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'default']}`}
                      onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    >
                      <div className="font-medium">Przelew internetowy</div>
                      <div className="text-sm text-gray-600">
                        23 banki
                      </div>
                    </div>

                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${{
                        'PAYPAL': 'border-blue-500 bg-blue-50',
                        'default': 'border-gray-200 hover:border-gray-300'
                      }[paymentMethod === 'PAYPAL' ? 'PAYPAL' : 'default']}`}
                      onClick={() => setPaymentMethod('PAYPAL')}
                    >
                      <div className="font-medium">PayPal</div>
                      <div className="text-sm text-gray-600">
                        Płatność bezpieczna
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Podsumowanie płatności</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Analiza dokumentów</span>
                    <span>{amount} zł</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>VAT (23%)</span>
                    <span>Wliczone w cenę</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Do zapłaty</span>
                      <span>{amount} zł</span>
                    </div>
                  </div>

                  {!success ? (
                    <Button 
                      className="w-full mt-6" 
                      onClick={handlePayment}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Przetwarzanie...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Zapłać {amount} zł
                        </>
                      )}
                    </Button>
                  ) : (
                    <div id="payment-success-summary" className="mt-4 p-4 rounded-md bg-green-50 border border-green-200">
                      <div className="font-medium mb-1">Płatność zakończona pomyślnie</div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div>Numer płatności: <strong>{success.paymentId}</strong></div>
                        <div>Kwota: <strong>{success.amount} zł</strong></div>
                        <div>Metoda: <strong>{success.provider}</strong></div>
                        <div>Data: <strong>{new Date(success.paidAt).toLocaleString('pl-PL')}</strong></div>
                      </div>
                      <div className="mt-3">
                        <label className="text-xs text-gray-600">Notatka (zostanie uwzględniona w eksporcie):</label>
                        <textarea className="w-full mt-1 text-sm p-2 border rounded bg-white" placeholder="Dodaj własną notatkę..." />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button variant="outline" onClick={() => window.print()}>Zapisz jako PDF</Button>
                        <Button variant="outline" onClick={exportSuccessAsDOC}>Zapisz jako DOC</Button>
                        <Button variant="outline" onClick={exportSuccessAsPNG}>Zapisz jako PNG</Button>
                        <Button variant="outline" onClick={exportSuccessAsDOCX}>Zapisz jako DOCX</Button>
                        <Button variant="outline" onClick={() => router.push('/panel-klienta')}>Przejdź do panelu klienta</Button>
                        <Button variant="outline" onClick={() => router.push('/panel-operatora')}>Przejdź do panelu operatora</Button>
                        <Button onClick={() => router.push('/')}>Wróć do strony głównej</Button>
                      </div>
                    </div>
                  )}

                  <div className="text-center text-sm text-gray-600 mt-4">
                    <Shield className="h-4 w-4 inline mr-1" />
                    Bezpieczna płatność SSL
                  </div>
                </CardContent>
              </Card>

              {/* What happens next */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Co dzieje się dalej?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Otrzymasz potwierdzenie na email</span>
                  </div>
                  <div className="flex items-start">
                    <Clock className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Prawnik przystąpi do analizy dokumentów</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Powiadomimy Cię SMS-em gdy analiza będzie gotowa</span>
                  </div>
                  <div className="flex items-start">
                    <FileText className="h-4 w-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Analizę otrzymasz w panelu klienta i na email</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}