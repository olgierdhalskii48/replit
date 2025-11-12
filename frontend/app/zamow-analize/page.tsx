"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import {
  Upload,
  FileText,
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Tag,
  Gift,
  Percent,
} from "lucide-react";

export default function ZamowAnalizePage() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("standard");
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{code: string, discount: number, type: 'percent' | 'amount'} | null>(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [uiPaymentMethod, setUiPaymentMethod] = useState<'card'|'blik'|'transfer'|'gpay'|'payu'>('card');
  // Additional details after choosing package
  const [contactPref, setContactPref] = useState<'email'|'phone'|'any'>('email');
  const [contactPhone, setContactPhone] = useState("");
  const [bestTime, setBestTime] = useState("");
  const [legalCategory, setLegalCategory] = useState<'cywilne'|'karne'|'rodzinne'|'pracy'|'administracyjne'|'inne'>('inne');
  const [urgency, setUrgency] = useState<'normal'|'pilne'|'ekspres'>('normal');
  const [questions, setQuestions] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [outputFormat, setOutputFormat] = useState<'pdf'|'docx'|'pdf_docx'>('pdf');
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Check authentication - redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Store current page to redirect back after login
      localStorage.setItem('redirectAfterLogin', '/zamow-analize');
      router.push('/logowanie');
    }
  }, [isAuthenticated, router]);

  const packages = [
    {
      id: "basic",
      name: "Analiza Podstawowa",
      price: 39,
      originalPrice: 49,
      time: "48h",
      features: [
        "Analiza dokumentu",
        "Podstawowe wskazówki prawne",
        "Odpowiedź przez email",
        "Podsumowanie prawne",
      ],
      badge: "OSZCZĘDŹ 10 ZŁ",
      badgeColor: "bg-green-600",
    },
    {
      id: "standard",
      name: "Analiza Standardowa",
      price: 59,
      time: "24h",
      features: [
        "Szczegółowa analiza prawna",
        "Konkretne wskazówki działania",
        "Propozycje pism do sporządzenia",
        "Konsultacja telefoniczna (15 min)",
        "Terminarz działań prawnych",
      ],
      popular: true,
    },
    {
      id: "premium",
      name: "Analiza Premium",
      price: 89,
      time: "12h",
      features: [
        "Ekspresowa analiza prawna",
        "Pełna strategia obrony",
        "Wszystkie możliwe pisma i wnioski",
        "Konsultacja telefoniczna (30 min)",
        "Analiza ryzyk prawnych",
        "Wsparcie do 7 dni",
      ],
    },
    {
      id: "express",
      name: "Analiza Express",
      price: 129,
      time: "6h",
      features: [
        "Natychmiastowa analiza (do 6h)",
        "Priorytetowe traktowanie",
        "Kompleksowa strategia prawna",
        "Nieograniczona konsultacja (48h)",
        "Przygotowanie wszystkich pism",
        "Dedykowany prawnik",
        "Wsparcie weekendowe",
      ],
      badge: "NAJSZYBSZA",
      badgeColor: "bg-red-600",
    },
  ];

  // Sample promo codes for demo
  const promoCodes = {
    "PRAWNIK10": { discount: 10, type: 'percent' as const, description: "10% zniżki" },
    "NOWY2025": { discount: 15, type: 'amount' as const, description: "15 zł zniżki" },
    "EXPRESS50": { discount: 50, type: 'amount' as const, description: "50 zł zniżki na Express" },
    "WEEKEND20": { discount: 20, type: 'percent' as const, description: "20% zniżki weekendowa" },
  };

  const applyPromoCode = () => {
    const upperCode = promoCode.toUpperCase();
    if (promoCodes[upperCode as keyof typeof promoCodes]) {
      const promo = promoCodes[upperCode as keyof typeof promoCodes];
      setAppliedDiscount({
        code: upperCode,
        discount: promo.discount,
        type: promo.type
      });
      setPromoMessage(`✓ Kod rabatowy zastosowany: ${promo.description}`);
    } else {
      setAppliedDiscount(null);
      setPromoMessage("❌ Nieprawidłowy kod rabatowy");
    }
  };

  const removePromoCode = () => {
    setAppliedDiscount(null);
    setPromoCode("");
    setPromoMessage("");
  };

  const calculateFinalPrice = () => {
    const selectedPkg = packages.find(pkg => pkg.id === selectedPackage);
    if (!selectedPkg || !appliedDiscount) return selectedPkg?.price || 0;

    const basePrice = selectedPkg.price;
    if (appliedDiscount.type === 'percent') {
      const discountAmount = basePrice * (appliedDiscount.discount / 100);
      return parseFloat((basePrice - discountAmount).toFixed(2));
    } else {
      return Math.max(0, basePrice - appliedDiscount.discount);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    
    // Validate files
    const validFiles: File[] = [];
    uploadedFiles.forEach(file => {
      // Check file type - include DOC/DOCX support
      const allowedTypes = [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'image/jpeg',
        'image/jpg', 
        'image/png'
      ];
      
      const isValidType = allowedTypes.includes(file.type) ||
        file.type.includes('pdf') || 
        file.type.includes('image') ||
        file.name.toLowerCase().endsWith('.doc') ||
        file.name.toLowerCase().endsWith('.docx');
      
      // Check file size (10MB max)
      const isValidSize = file.size <= 10 * 1024 * 1024;
      
      if (!isValidType) {
        toast({ title: 'Nieprawidłowy format pliku', description: `Plik ${file.name} nie jest obsługiwany.`, variant: 'destructive' });
        return;
      }
      
      if (!isValidSize) {
        toast({ title: 'Plik za duży', description: `Plik ${file.name} przekracza 10MB.`, variant: 'destructive' });
        return;
      }
      
      validFiles.push(file);
    });
    
    // Check total file count (max 5)
    if (files.length + validFiles.length > 5) {
      toast({ title: 'Limit plików', description: 'Możesz przesłać maksymalnie 5 plików.', variant: 'destructive' });
      return;
    }
    
    setFiles([...files, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    // Validation for step 1 - require at least one file
    if (step === 1) {
      if (files.length === 0) {
        toast({ title: 'Brak dokumentów', description: 'Prześlij przynajmniej jeden plik.', variant: 'destructive' });
        return;
      }
    }
    
    // Validation for step 2 - require package selection
    if (step === 2) {
      if (!selectedPackage) {
        toast({ title: 'Wybierz pakiet', description: 'Musisz wybrać pakiet analizy.', variant: 'destructive' });
        return;
      }
    }
    
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmitOrder = async () => {
    // Create case with uploaded files
    try {
      const { casesApi } = await import("@/lib/api/cases");
      const selectedPkg = packages.find(pkg => pkg.id === selectedPackage);
      
      const finalPrice = appliedDiscount ? calculateFinalPrice() : selectedPkg?.price;
      
      const result = await casesApi.createCase({
        title: `Analiza ${selectedPkg?.name || 'dokumentów'} - ${new Date().toLocaleDateString()}`,
        description: description || `Zamówiona analiza w pakiecie ${selectedPkg?.name}`,
        client_notes: description,
        package_type: selectedPackage,
        package_price: finalPrice,
        promo_code: appliedDiscount?.code,
        metadata: {
          contact_preference: contactPref,
          contact_phone: contactPhone,
          best_time: bestTime,
          legal_category: legalCategory,
          urgency,
          questions,
          gdpr_consent: gdprConsent,
          output_format: outputFormat,
        },
        files: files,
      });

      if (result.error) {
        toast({ title: 'Błąd tworzenia sprawy', description: String(result.error), variant: 'destructive' });
        return;
      }

      if (result.case) {
        // Store case ID and promo code for payment
        localStorage.setItem('pendingCaseId', result.case.id);
        if (appliedDiscount?.code) {
          localStorage.setItem('appliedPromoCode', appliedDiscount.code);
          console.log('Saved promo code to localStorage:', appliedDiscount.code);
        } else {
          localStorage.removeItem('appliedPromoCode');
        }
        // Redirect to payment with final price (including discount) and chosen method
        window.location.href = `/platnosc?caseId=${result.case.id}&amount=${finalPrice}&method=${uiPaymentMethod}`;
      }
    } catch (error) {
      toast({ title: 'Wystąpił błąd', description: error instanceof Error ? error.message : 'Nieznany błąd', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót
          </Button>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">
                Krok {step} z 3
              </span>
              <span className="text-sm text-gray-500">
                {step === 1 && "Prześlij dokumenty"}
                {step === 2 && "Wybierz pakiet"}
                {step === 3 && "Płatność"}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Upload Documents */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Prześlij dokumenty do analizy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      Przeciągnij pliki tutaj lub kliknij aby wybrać
                    </p>
                    <p className="text-gray-500">
                      Obsługujemy pliki PDF, JPG, PNG (max 10MB każdy)
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button className="mt-4" asChild>
                      <span>Wybierz pliki</span>
                    </Button>
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Przesłane pliki:</h4>
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          Usuń
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Opisz swoją sytuację (opcjonalnie)
                  </label>
                  <Textarea
                    placeholder="Powiedz nam o swojej sytuacji: czy zgadzasz się z treścią pisma? Jakie są Twoje oczekiwania? Czy masz dodatkowe pytania?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                  <p className="text-sm text-gray-500">
                    Im więcej informacji podasz, tym bardziej precyzyjna będzie
                    analiza
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">
                        Ważne informacje:
                      </p>
                      <ul className="mt-1 text-yellow-700 space-y-1">
                        <li>• Maksymalnie 5 plików, każdy do 10MB</li>
                        <li>• Upewnij się, że dokumenty są czytelne</li>
                        <li>• Możesz dodać zdjęcia zrobione telefonem</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  className="w-full"
                  disabled={files.length === 0}
                >
                  Dalej - Wybierz pakiet
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Choose Package */}
          {step === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Wybierz pakiet analizy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {packages.map((pkg) => (
                      <Card
                        key={pkg.id}
                        className={`cursor-pointer transition-all ${
                          selectedPackage === pkg.id
                            ? "ring-2 ring-red-500 bg-red-50"
                            : "hover:shadow-md"
                        } ${pkg.popular ? "relative" : ""}`}
                        onClick={() => setSelectedPackage(pkg.id)}
                      >
                        {pkg.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-red-600 text-white">
                              Najpopularniejszy
                            </Badge>
                          </div>
                        )}
                        {pkg.badge && !pkg.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className={`${pkg.badgeColor} text-white`}>
                              {pkg.badge}
                            </Badge>
                          </div>
                        )}

                        <CardContent className="p-6 text-center">
                          <h3 className="text-lg font-semibold mb-2">
                            {pkg.name}
                          </h3>
                          <div className="mb-2">
                            {pkg.originalPrice && (
                              <div className="text-lg line-through text-gray-400 mb-1">
                                {pkg.originalPrice} zł
                              </div>
                            )}
                            <div className="text-3xl font-bold text-red-600">
                              {pkg.price} zł
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 mb-4">
                            Realizacja: {pkg.time}
                          </div>

                          <ul className="text-sm space-y-2 text-left">
                            {pkg.features.map((feature, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-green-500 mr-2">✓</span>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Promo Code Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gift className="mr-2 h-5 w-5" />
                    Kod rabatowy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!appliedDiscount ? (
                    <div className="space-y-4">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Wprowadź kod rabatowy"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={applyPromoCode}
                          variant="outline"
                          disabled={!promoCode.trim()}
                        >
                          <Tag className="mr-2 h-4 w-4" />
                          Zastosuj
                        </Button>
                      </div>
                      {promoMessage && (
                        <div className={`text-sm ${promoMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                          {promoMessage}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        💡 <strong>Dostępne kody:</strong> PRAWNIK10, NOWY2025, EXPRESS50, WEEKEND20
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                        <div className="flex items-center">
                          <Percent className="mr-2 h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800">
                            Kod {appliedDiscount.code} zastosowany
                          </span>
                        </div>
                        <Button 
                          onClick={removePromoCode}
                          size="sm"
                          variant="ghost"
                          className="text-green-800 hover:text-green-900"
                        >
                          Usuń
                        </Button>
                      </div>
                      <div className="text-sm text-green-600">
                        Oszczędzasz: {appliedDiscount.type === 'percent' 
                          ? `${appliedDiscount.discount}%` 
                          : `${appliedDiscount.discount} zł`}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 bg-transparent"
                >
                  Wstecz
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Dalej - Płatność {appliedDiscount ? `(${calculateFinalPrice()} zł)` : ''}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Additional Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Dodatkowe informacje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Preferowany kontakt</Label>
                      <div className="flex gap-2 mt-2">
                        <Button variant={contactPref==='email'?'default':'outline'} onClick={()=>setContactPref('email')}>Email</Button>
                        <Button variant={contactPref==='phone'?'default':'outline'} onClick={()=>setContactPref('phone')}>Telefon</Button>
                        <Button variant={contactPref==='any'?'default':'outline'} onClick={()=>setContactPref('any')}>Dowolny</Button>
                      </div>
                    </div>
                    <div>
                      <Label>Telefon do kontaktu</Label>
                      <Input value={contactPhone} onChange={(e)=>setContactPhone(e.target.value)} placeholder="+48 123 456 789" />
                    </div>
                    <div>
                      <Label>Najlepszy czas kontaktu</Label>
                      <Input value={bestTime} onChange={(e)=>setBestTime(e.target.value)} placeholder="np. 9:00-12:00" />
                    </div>
                    <div>
                      <Label>Kategoria prawna</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(['cywilne','karne','rodzinne','pracy','administracyjne','inne'] as const).map(cat => (
                          <Button key={cat} variant={legalCategory===cat?'default':'outline'} onClick={()=>setLegalCategory(cat)} className="capitalize">{cat}</Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Pilność</Label>
                      <div className="flex gap-2 mt-2">
                        <Button variant={urgency==='normal'?'default':'outline'} onClick={()=>setUrgency('normal')}>Normalna</Button>
                        <Button variant={urgency==='pilne'?'default':'outline'} onClick={()=>setUrgency('pilne')}>Pilne</Button>
                        <Button variant={urgency==='ekspres'?'default':'outline'} onClick={()=>setUrgency('ekspres')}>Ekspres</Button>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Dodatkowe pytania do prawnika</Label>
                      <Textarea rows={4} value={questions} onChange={(e)=>setQuestions(e.target.value)} placeholder="Opisz swoje pytania lub wątpliwości" />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <input id="gdpr" type="checkbox" checked={gdprConsent} onChange={(e)=>setGdprConsent(e.target.checked)} />
                      <Label htmlFor="gdpr" className="text-sm">Wyrażam zgodę na przetwarzanie danych osobowych w celu realizacji zamówienia.</Label>
                    </div>
                    <div>
                      <Label>Preferowany format wyników</Label>
                      <div className="flex gap-2 mt-2">
                        <Button variant={outputFormat==='pdf'?'default':'outline'} onClick={()=>setOutputFormat('pdf')}>PDF</Button>
                        <Button variant={outputFormat==='docx'?'default':'outline'} onClick={()=>setOutputFormat('docx')}>DOCX</Button>
                        <Button variant={outputFormat==='pdf_docx'?'default':'outline'} onClick={()=>setOutputFormat('pdf_docx')}>PDF + DOCX</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Podsumowanie i płatność
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">
                      Podsumowanie zamówienia:
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Pakiet:</span>
                        <span>
                          {packages.find((p) => p.id === selectedPackage)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Liczba dokumentów:</span>
                        <span>{files.length}</span>
                      </div>
                      {appliedDiscount && (
                        <div className="flex justify-between text-sm text-gray-500 line-through">
                          <span>Cena przed rabatem:</span>
                          <span>{packages.find((p) => p.id === selectedPackage)?.price} zł</span>
                        </div>
                      )}
                      {appliedDiscount && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Rabat ({appliedDiscount.code}):</span>
                          <span>
                            -{appliedDiscount.type === 'percent' 
                              ? `${appliedDiscount.discount}%` 
                              : `${appliedDiscount.discount} zł`}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium text-lg border-t pt-2">
                        <span>Do zapłaty:</span>
                        <span className="text-red-600">
                          {appliedDiscount ? calculateFinalPrice() : packages.find((p) => p.id === selectedPackage)?.price} zł
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Wybierz metodę płatności:</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      <Card className={`cursor-pointer hover:shadow-md ${uiPaymentMethod==='card' ? 'border-2 border-red-500' : ''}`} onClick={()=>setUiPaymentMethod('card')}>
                        <CardContent className="p-3 md:p-4 text-center">
                          <div className="text-base md:text-lg font-medium mb-1 md:mb-2">
                            Karta płatnicza
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            Visa, Mastercard
                          </div>
                          <Badge className="mt-1 md:mt-2 bg-yellow-100 text-yellow-800 text-xs">
                            SZYBKO I BEZPIECZNIE
                          </Badge>
                        </CardContent>
                      </Card>

                      <Card className={`cursor-pointer hover:shadow-md ${uiPaymentMethod==='blik' ? 'border-2 border-red-500' : ''}`} onClick={()=>setUiPaymentMethod('blik')}>
                        <CardContent className="p-3 md:p-4 text-center">
                          <div className="text-base md:text-lg font-medium mb-1 md:mb-2">BLIK</div>
                          <div className="text-xs md:text-sm text-gray-500">
                            Kod z aplikacji bankowej
                          </div>
                        </CardContent>
                      </Card>

                      <Card className={`cursor-pointer hover:shadow-md ${uiPaymentMethod==='transfer' ? 'border-2 border-red-500' : ''}`} onClick={()=>setUiPaymentMethod('transfer')}>
                        <CardContent className="p-3 md:p-4 text-center">
                          <div className="text-base md:text-lg font-medium mb-1 md:mb-2">
                            Przelew internetowy
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">23 banki</div>
                        </CardContent>
                      </Card>

                      <Card className={`cursor-pointer hover:shadow-md ${uiPaymentMethod==='gpay' ? 'border-2 border-red-500' : ''}`} onClick={()=>setUiPaymentMethod('gpay')}>
                        <CardContent className="p-3 md:p-4 text-center">
                          <div className="text-base md:text-lg font-medium mb-1 md:mb-2">
                            Google Pay
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            Płatność mobilna
                          </div>
                        </CardContent>
                      </Card>

                      {/* Dodany kafelek PayU */}
                      <Card className={`cursor-pointer hover:shadow-md ${uiPaymentMethod==='payu' ? 'border-2 border-red-500' : ''}`} onClick={()=>setUiPaymentMethod('payu')}>
                        <CardContent className="p-3 md:p-4 text-center">
                          <div className="text-base md:text-lg font-medium mb-1 md:mb-2">
                            PayU
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            Szybkie płatności online
                          </div>
                          <Badge className="mt-1 md:mt-2 bg-green-100 text-green-800 text-xs">
                            Popularne w Polsce
                          </Badge>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 mb-1">
                        Co dzieje się po płatności?
                      </p>
                      <ul className="text-blue-700 space-y-1">
                        <li>• Otrzymasz potwierdzenie na email</li>
                        <li>• Prawnik przystąpi do analizy dokumentów</li>
                        <li>
                          • Powiadomimy Cię SMS-em gdy analiza będzie gotowa
                        </li>
                        <li>• Analizę otrzymasz w panelu klienta i na email</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 bg-transparent"
                >
                  Wstecz
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleSubmitOrder}
                >
                  Zapłać i Zamów
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* USUWAM <Footer /> */}
    </div>
  );
}
