"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  // Menu removed - no longer using hamburger menu
  User,
  LogIn,
  LogOut,
  FileText,
  Scale,
  Phone,
  Info,
  Home,
  DollarSign,
  BookOpen,
  Lightbulb,
  Users,
  Briefcase,
  Shield,
  BarChart,
  Gavel,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import ThemeToggle from "@/components/theme/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserAvatarSrc, getUserInitials } from "@/lib/avatar";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  isScrollLink?: boolean;
}

export function Header() {
  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const signOut = useAuth((s) => s.signOut);
  const [isScrolled, setIsScrolled] = useState(false);
  // Mobile menu removed - no longer using hamburger menu
  const pathname = usePathname();
  const role = user?.role;

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems: NavItem[] = [
    { name: "Strona Główna", href: "/", icon: Home, isScrollLink: false },
    { name: "Jak to działa", href: "/#jak-to-dziala", icon: Lightbulb, isScrollLink: true },
    { name: "Funkcje", href: "/#funkcje", icon: BarChart, isScrollLink: true },
    { name: "Cennik", href: "/#cennik", icon: DollarSign, isScrollLink: true },
    { name: "Kancelarie", href: "/#kancelarie", icon: Briefcase, isScrollLink: true },
    { name: "Blog", href: "/#blog", icon: BookOpen, isScrollLink: true },
    { name: "Poradniki", href: "/#poradniki", icon: BookOpen, isScrollLink: true },
    { name: "Dokumentacja API", href: "/#dokumentacja-api", icon: FileText, isScrollLink: true },
    { name: "O nas", href: "/#o-nas", icon: Users, isScrollLink: true },
    { name: "Kontakt", href: "/kontakt", icon: Phone, isScrollLink: false },
  ];
  const servicesDropdown = [
    { name: "Analiza dokumentów", href: "/analiza-dokumentow", icon: FileText, isScrollLink: false },
    { name: "Pisma prawne", href: "/pisma-prawne", icon: Scale, isScrollLink: false },
    { name: "Konsultacje", href: "/konsultacje", icon: Phone, isScrollLink: false },
    { name: "Reprezentacja", href: "/reprezentacja", icon: Gavel, isScrollLink: false },
  ];
  const informationDropdown = [
    { name: "Regulamin", href: "/regulamin", icon: BookOpen, isScrollLink: false },
    { name: "Polityka prywatności", href: "/polityka-prywatnosci", icon: Shield, isScrollLink: false },
    { name: "RODO", href: "/rodo", icon: Shield, isScrollLink: false },
    { name: "FAQ", href: "/faq", icon: Info, isScrollLink: false },
  ];
  const getPanelLink = () => {
    if (role === "admin") return "/admin";
    if (role === "client") return "/panel-klienta";
    if (role === "operator") return "/panel-operatora";
    return null;
  };
  const router = useRouter();
  const panelLink = getPanelLink();
  const isHomePage = pathname === "/";

  // Poprawiona funkcja scrollToSection
  const scrollToSection = (id: string) => {
    const cleanId = id.replace(/.*#/, ""); // wyciąga tylko "funkcje"
    const element = document.getElementById(cleanId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header className={`sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 backdrop-blur-sm transition-all duration-300 ${isScrolled ? "shadow-md" : ""}`}> 
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          {!isHomePage && (
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-gray-600 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400">
              <ArrowLeft className="h-6 w-6" />
              <span className="sr-only">Go back</span>
            </Button>
          )}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-blue-700 dark:text-blue-300">
            <Scale className="h-6 w-6" />
            Kancelaria X
          </Link>
        </div>
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link href="/" className="text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Strona główna
          </Link>
          <Link href="/jak-to-dziala" className="text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Jak dzialamy
          </Link>
          <Link href="/analiza-dokumentow" className="text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Analiza dokumentów
          </Link>
          <Link href="/cennik" className="text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Cennik
          </Link>
          <Link href="/kontakt" className="text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Kontakt
          </Link>
          {isAuthenticated && panelLink && (
            <Link href={panelLink} className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-400 font-medium transition-colors">
              Mój Panel
            </Link>
          )}
        </nav>
        {/* Auth/User Actions */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getUserAvatarSrc(user)} alt={user?.name || user?.email || 'Użytkownik'} />
                    <AvatarFallback>{getUserInitials(user, 'U')}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {panelLink && (
                  <DropdownMenuItem asChild>
                    <Link href={panelLink} className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Mój Panel ({role === "admin" ? "Admin" : role === "client" ? "Klient" : "Operator"})
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => signOut()} className="flex items-center cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Wyloguj
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              {/* Force readable light-mode styles for white/outline button */}
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-slate-900 border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
                asChild
              >
                <Link href="/logowanie">
                  <LogIn className="mr-2 h-4 w-4" />
                  Logowanie
                </Link>
              </Button>
              {/* Ensure strong contrast for primary button in both themes */}
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                asChild
              >
                <Link href="/rejestracja">
                  <User className="mr-2 h-4 w-4" />
                  Rejestracja
                </Link>
              </Button>
            </div>
          )}
          {/* Mobile Menu Button removed */}
        </div>
      </div>
      {/* Mobile Menu removed - no longer using hamburger menu */}
    </header>
  );
}
