"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, X, Star } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

export default function CennikPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<null | { name: string; price: string }>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"details" | "payment" | "summary">("details");
  const [payment, setPayment] = useState("card");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [agreements, setAgreements] = useState({
    regulamin: false,
    rodo: false,
    poufnosc: false,
  });
  const [form, setForm] = useState({
    typKlienta: "konsument", // "konsument" | "przedsiebiorca"
    imieNazwisko: "",
    telefon: "",
    email: "",
    email2: "",
    ulica: "",
    numerBudynku: "",
    numerLokalu: "",
    kodPocztowy: "",
    miejscowosc: "",
    inneDaneFaktury: false,
  });

  const plans = [
    { name: "Basic", price: "39", period: "PLN za analizę", description: "Podstawowa analiza dokumentów prawnych z wykorzystaniem AI", features: ["Analiza jednego dokumentu","Rozpoznawanie tekstu (OCR)","Podstawowa analiza prawna AI","Identyfikacja kluczowych elementów","Wyciągi w języku polskim","Wsparcie e-mail","Czas realizacji: 24-48h"], notIncluded: ["Szczegółowa analiza ryzyka","Rekomendacje prawne","Wsparcie telefoniczne","Express realizacja"], popular: false },
    { name: "Standard", price: "59", period: "PLN za analizę", description: "Rozszerzona analiza dokumentów z szczegółową oceną prawną", features: ["Wszystko z pakietu Basic","Szczegółowa analiza ryzyka","Identyfikacja problemów prawnych","Podstawowe rekomendacje","Analiza zgodności z przepisami","Wsparcie e-mail i telefon","Czas realizacji: 12-24h"], notIncluded: ["Kompleksowe rekomendacje prawne","Przegląd przez prawnika","Express realizacja (6h)"], popular: true },
    { name: "Premium", price: "89", period: "PLN za analizę", description: "Kompleksowa analiza z profesjonalną oceną prawną", features: ["Wszystko z pakietu Standard","Kompleksowe rekomendacje prawne","Analiza precedensów prawnych","Ocena skutków prawnych","Sugestie działań naprawczych","Priorytetowe wsparcie","Czas realizacji: 6-12h"], notIncluded: ["Przegląd przez prawnika","Bezpośrednie konsultacje","Super express (3h)"], popular: false },
    { name: "Express", price: "129", period: "PLN za analizę", description: "Najszybsza analiza dokumentów z priorytetem realizacji", features: ["Wszystko z pakietu Premium","Express realizacja w 6h","Priorytetowa obsługa","Dedykowany operator","Wsparcie telefoniczne 24/7","Powiadomienia SMS","Gwarancja terminowości"], notIncluded: ["Przegląd przez prawnika","Bezpośrednie konsultacje prawne"], popular: false },
    { name: "Business", price: "199", period: "PLN za analizę", description: "Pakiet biznesowy z przeglądem prawnika i konsultacjami", features: ["Wszystko z pakietu Express","Przegląd przez wykwalifikowanego prawnika","30 min konsultacji telefonicznej","Analiza wielodokumentowa","Rekomendacje biznesowe","Dedykowany prawnik","Priorytet VIP","Realizacja w 3-6h"], notIncluded: [], popular: false },
  ];

  const startFlow = (plan: { name: string; price: string }) => {
    setSelectedPlan(plan);
    setPayment("card");
    setSelectAll(false);
    setAgreements({ regulamin: false, rodo: false, poufnosc: false });
    setForm({
      typKlienta: "konsument",
      imieNazwisko: "",
      telefon: "",
      email: "",
      email2: "",
      ulica: "",
      numerBudynku: "",
      numerLokalu: "",
      kodPocztowy: "",
      miejscowosc: "",
      inneDaneFaktury: false,
    });
    setStep("details");
    setOpen(true);
  };

  const validateDetails = () => {
    const required = [
      form.imieNazwisko,
      form.telefon,
      form.email,
      form.email2,
      form.ulica,
      form.numerBudynku,
      form.kodPocztowy,
      form.miejscowosc,
    ];
    if (required.some((v) => !String(v).trim())) {
      alert("Uzupełnij wszystkie wymagane pola.");
      return false;
    }
    if (form.email !== form.email2) {
      alert("Adresy e-mail nie są zgodne.");
      return false;
    }
    if (!(agreements.regulamin && agreements.rodo && agreements.poufnosc)) {
      alert("Musisz zaakceptować regulamin, RODO oraz klauzulę poufności.");
      return false;
    }
    return true;
  };

  const pay = async () => {
    if (step === "details") {
      if (!validateDetails()) return;
      setStep("payment");
      return;
    }
    if (!selectedPlan) return;
    try {
      const { casesApi } = await import("@/lib/api/cases");
      const packageType = selectedPlan.name.toLowerCase();
      const amount = Number(selectedPlan.price);
      const result = await casesApi.createCase({
        title: `Analiza ${selectedPlan.name} - ${new Date().toLocaleDateString()}`,
        description: `Zamówiony pakiet ${selectedPlan.name} z Cennika`,
        client_notes: `Dane klienta: ${JSON.stringify({
          typKlienta: form.typKlienta,
          imieNazwisko: form.imieNazwisko,
          telefon: form.telefon,
          email: form.email,
          adres: {
            ulica: form.ulica,
            numerBudynku: form.numerBudynku,
            numerLokalu: form.numerLokalu,
            kodPocztowy: form.kodPocztowy,
            miejscowosc: form.miejscowosc,
          },
          zgody: agreements,
        })}`,
        package_type: packageType,
        package_price: amount,
        promo_code: undefined,
        files: [],
      });
      if (result.error || !result.case) {
        alert(`Błąd tworzenia sprawy: ${result.error || 'Nieznany błąd'}`);
        return;
      }
      // redirect to payment with preferred method
      const methodMap: Record<string, string> = { card: 'card', blik: 'blik', transfer: 'transfer', paypal: 'paypal' };
      const m = methodMap[payment] || 'card';
      router.push(`/platnosc?caseId=${result.case.id}&amount=${amount}&method=${m}`);
      setOpen(false);
    } catch (e: any) {
      alert(e?.message || 'Nie udało się rozpocząć płatności');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      {/* Pricing Plans */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${plan.popular ? "ring-2 ring-blue-500 scale-105" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      <Star className="w-4 h-4 mr-1" />
                      Najpopularniejszy
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-slate-100">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{plan.price}</span>
                    <span className="text-gray-600 dark:text-slate-300 ml-2">PLN {plan.period}</span>
                  </div>
                  <p className="text-gray-600 dark:text-slate-300 mt-4">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-slate-300">{feature}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((feature, idx) => (
                      <div key={idx} className="flex items-start opacity-60">
                        <X className="h-5 w-5 text-gray-400 dark:text-slate-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-500 dark:text-slate-400">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6">
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                          : "bg-white text-slate-900 border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => startFlow({ name: plan.name, price: plan.price })}
                    >
                      Wybierz pakiet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Flow dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          {step === "details" && (
            <>
              <DialogHeader>
                <DialogTitle>Wypełnij formularz zamówienia</DialogTitle>
                <DialogDescription>
                  Wybrany plan: <strong>{selectedPlan?.name}</strong> – {selectedPlan?.price} PLN
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* client type */}
                <div className="flex gap-2">
                  <Button variant={form.typKlienta === 'konsument' ? 'default' : 'outline'} onClick={() => setForm({...form, typKlienta: 'konsument'})}>Jestem konsumentem</Button>
                  <Button variant={form.typKlienta === 'przedsiebiorca' ? 'default' : 'outline'} onClick={() => setForm({...form, typKlienta: 'przedsiebiorca'})}>Jestem przedsiębiorcą</Button>
                </div>

                {/* contact fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border rounded px-3 py-2" placeholder="Imię i nazwisko" value={form.imieNazwisko} onChange={(e)=>setForm({...form, imieNazwisko: e.target.value})} />
                  <input className="border rounded px-3 py-2" placeholder="Telefon" value={form.telefon} onChange={(e)=>setForm({...form, telefon: e.target.value})} />
                  <input className="border rounded px-3 py-2 md:col-span-1" placeholder="E-mail" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} />
                  <input className="border rounded px-3 py-2 md:col-span-1" placeholder="Powtórz e-mail" value={form.email2} onChange={(e)=>setForm({...form, email2: e.target.value})} />
                </div>

                {/* address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Ulica" value={form.ulica} onChange={(e)=>setForm({...form, ulica: e.target.value})} />
                  <input className="border rounded px-3 py-2" placeholder="Numer budynku" value={form.numerBudynku} onChange={(e)=>setForm({...form, numerBudynku: e.target.value})} />
                  <input className="border rounded px-3 py-2" placeholder="Numer lokalu (opcjonalnie)" value={form.numerLokalu} onChange={(e)=>setForm({...form, numerLokalu: e.target.value})} />
                  <input className="border rounded px-3 py-2" placeholder="Kod pocztowy" value={form.kodPocztowy} onChange={(e)=>setForm({...form, kodPocztowy: e.target.value})} />
                  <input className="border rounded px-3 py-2" placeholder="Miejscowość" value={form.miejscowosc} onChange={(e)=>setForm({...form, miejscowosc: e.target.value})} />
                </div>

                {/* consents */}
                <div className="space-y-2 border-t pt-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={selectAll} onChange={(e)=>{
                      const v = e.target.checked; setSelectAll(v); setAgreements({ regulamin: v, rodo: v, poufnosc: v });
                    }} />
                    Zaznacz wszystkie
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={agreements.regulamin} onChange={(e)=>setAgreements({...agreements, regulamin: e.target.checked})} />
                    <span>Akceptuję Ogólne Warunki Umowy (regulamin).</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={agreements.rodo} onChange={(e)=>setAgreements({...agreements, rodo: e.target.checked})} />
                    <span>Wyrażam zgodę na przetwarzanie danych osobowych (RODO).</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={agreements.poufnosc} onChange={(e)=>setAgreements({...agreements, poufnosc: e.target.checked})} />
                    <span>Akceptuję klauzulę poufności i zasady ochrony informacji.</span>
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
                <Button onClick={pay}>Dalej - Płatność</Button>
              </DialogFooter>
            </>
          )}

          {step === "payment" && (
            <>
              <DialogHeader>
                <DialogTitle>Wybór metody płatności</DialogTitle>
                <DialogDescription>
                  Kwota do zapłaty: <strong>{selectedPlan?.price} PLN</strong>
                </DialogDescription>
              </DialogHeader>
              <RadioGroup value={payment} onValueChange={setPayment} className="space-y-3">
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <RadioGroupItem value="card" id="pay-card" />
                  <Label htmlFor="pay-card">Karta płatnicza</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <RadioGroupItem value="blik" id="pay-blik" />
                  <Label htmlFor="pay-blik">BLIK</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <RadioGroupItem value="transfer" id="pay-transfer" />
                  <Label htmlFor="pay-transfer">Szybki przelew</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <RadioGroupItem value="paypal" id="pay-paypal" />
                  <Label htmlFor="pay-paypal">PayPal</Label>
                </div>
              </RadioGroup>
              <Separator className="my-2" />
              <div className="text-xs text-gray-500">To demo płatności. Transakcja nie zostanie obciążona.</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("details")}>Wstecz</Button>
                <Button onClick={pay}>Zapłać</Button>
              </DialogFooter>
            </>
          )}

          {step === "summary" && (
            <>
              <DialogHeader>
                <DialogTitle>Podsumowanie zamówienia</DialogTitle>
                <DialogDescription>Twoja płatność została zarejestrowana.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm">Numer zamówienia: <strong>{orderId}</strong></p>
                  <p className="text-sm">Plan: <strong>{selectedPlan?.name}</strong></p>
                  <p className="text-sm">Kwota: <strong>{selectedPlan?.price} PLN</strong></p>
                  <p className="text-sm">Metoda płatności: <strong>{payment.toUpperCase()}</strong></p>
                </div>
                <p className="text-sm text-gray-600">Szczegóły zamówienia znajdziesz w swoim panelu. Wysłaliśmy również potwierdzenie na e-mail.</p>
              </div>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Zamknij</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
