"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Clock,
  Shield,
  CheckCircle,
  Upload,
  Star,
  ArrowRight,
  Users,
  Award,
  Phone,
  Mail,
  MapPin,
  Scale,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import heroImg from "@/public/legal-gavel.png";

export default function HomePage() {
  const services = [
    {
      title: "Analiza Nakazu Zapłaty",
      description: "Sprawdzimy czy nakaz zapłaty jest prawidłowy i podpowiemy jak się bronić",
      price: "49 zł",
      icon: FileText,
      popular: true,
    },
    {
      title: "Odpowiedź na Wezwanie Komornika",
      description: "Przygotujemy profesjonalną odpowiedź na działania komornicze",
      price: "79 zł",
      icon: Shield,
      popular: false,
    },
    {
      title: "Skarga na Czynność Komornika",
      description: "Zaskarżymy nieprawidłowe działania komornika sądowego",
      price: "99 zł",
      icon: FileText,
      popular: false,
    },
    {
      title: "Sprzeciw od Nakazu Zapłaty",
      description: "Złożymy sprzeciw w odpowiednim terminie z uzasadnieniem",
      price: "89 zł",
      icon: Clock,
      popular: false,
    },
  ];

  const stats = [
    { value: "2500+", label: "Przeanalizowanych dokumentów", icon: FileText },
    { value: "1200+", label: "Zadowolonych klientów", icon: Users },
    { value: "24h", label: "Średni czas realizacji", icon: Clock },
    { value: "98%", label: "Skuteczność naszych pism", icon: Award },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1">
        {/* Hero Section */}
        <section id="home" className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white py-20 relative overflow-hidden dark:from-slate-800 dark:via-slate-900 dark:to-black">
          <div className="absolute inset-0 bg-black/10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="bg-blue-800 text-blue-100 mb-4 font-medium dark:bg-blue-900 dark:text-blue-200">
                  PROFESJONALNA POMOC PRAWNA
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-white dark:text-white">
                  Otrzymałeś pismo prawne?
                  <span className="text-blue-200"> Pomożemy Ci!</span>
                </h1>
                <p className="text-xl text-blue-100 mb-8 leading-relaxed dark:text-blue-200">
                  Analizujemy dokumenty prawne i przygotowujemy odpowiedzi w
                  ciągu 24 godzin. Profesjonalnie, szybko i w przystępnej cenie.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-gray-100 font-semibold"
                    asChild
                  >
                    <Link href="/zamow-analize">
                      <Upload className="mr-2 h-5 w-5" />
                      Zamów Analizę
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-blue-600 bg-transparent font-semibold"
                    asChild
                  >
                    <Link href="/jak-to-dziala">Zobacz Przykłady</Link>
                  </Button>
                </div>
              </div>
              <div className="relative text-white dark:text-white">
                <div className="flex justify-center items-center">
                  <div className="group relative w-full max-w-md rounded-2xl ring-2 ring-white/40 shadow-[0_0_80px_-10px_rgba(59,130,246,0.65)] overflow-hidden">
                    {/* subtle gradient glow background */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-400/20 to-indigo-500/20" />
                    {/* image */}
                    <Image 
                      src={heroImg}
                      alt="Kancelaria X – główne zdjęcie strony głównej (młotek sędziego)" 
                      width={1024}
                      height={716}
                      placeholder="blur"
                      priority
                      sizes="(min-width: 1024px) 28rem, 100vw"
                      className="relative w-full h-auto object-cover rounded-2xl transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />
                    {/* animated shine sweep */}
                    <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 group-hover:opacity-100 animate-[shine_2.4s_ease-in-out_infinite]" />
                    {/* pulsing radial glow */}
                    <span className="pointer-events-none absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.35)_0%,rgba(255,255,255,0)_60%)] opacity-60 animate-[pulse_glow_2.4s_ease-in-out_infinite]" />
                    {/* sparkle layer */}
                    <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-60">
                      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.35)_1px,transparent_2px)] [background-size:12px_12px] animate-[sparkle_3.6s_linear_infinite]" />
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mt-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-300" />
                      <span>Analiza w 24h</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-300" />
                      <span>Profesjonalna odpowiedź</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-300" />
                      <span>Przystępne ceny</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-16 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-4">
                Nasze Usługi
              </h2>
              <p className="text-lg text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
                Oferujemy kompleksową pomoc prawną w sprawach związanych z
                dokumentami sądowymi i komorniczymi
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, index) => {
                const IconComponent = service.icon;
                return (
                  <Card
                    key={index}
                    className={`relative h-full hover:shadow-lg transition-shadow ${
                      service.popular ? "border-blue-500 border-2" : ""
                    }`}
                  >
                    {service.popular && (
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white">
                        Najpopularniejsze
                      </Badge>
                    )}
                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                        <IconComponent className="h-6 w-6 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                        {service.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-900 dark:text-slate-100">
                      <p className="text-gray-600 dark:text-slate-300 mb-4 text-sm">
                        {service.description}
                      </p>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                        {service.price}
                      </div>
                      <Button className="w-full" asChild>
                        <Link href="/zamow-analize">
                          Zamów teraz
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-gray-50 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="text-center text-gray-900 dark:text-slate-100">
                    <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                      <IconComponent className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                      {stat.value}
                    </div>
                    <div className="text-gray-600 dark:text-slate-300">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Gotowy na Profesjonalną Pomoc?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Nie czekaj - każdy dzień zwłoki może mieć znaczenie prawne. Zamów
              analizę już dziś!
            </p>
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold"
              asChild
            >
              <Link href="/zamow-analize">
                <Upload className="mr-2 h-5 w-5" />
                Zamów Analizę Teraz
              </Link>
            </Button>
          </div>
        </section>

        {/* Bottom Illustration */}
        <section className="py-8 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative w-full">
              <div className="group relative w-full rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-[0_10px_40px_-10px_rgba(59,130,246,0.35)]">
                <Image
                  src={heroImg}
                  alt="Kancelaria X – główne zdjęcie (dół strony, młotek sędziego)"
                  width={1600}
                  height={1120}
                  placeholder="blur"
                  sizes="100vw"
                  className="w-full h-auto rounded-2xl object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
                {/* animated shine sweep */}
                <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 animate-[shine_3.2s_ease-in-out_infinite]" />
                {/* soft vignette */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
              </div>
            </div>
            <div className="mt-6 text-center text-gray-900 dark:text-slate-100">
              <p className="text-gray-700 dark:text-slate-200 text-lg mb-4">
                Połącz tradycyjną wiedzę prawniczą z nowoczesną technologią — skorzystaj z naszej pomocy już dziś.
              </p>
              <Button asChild>
                <Link href="/zamow-analize">
                  Zamów analizę
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}