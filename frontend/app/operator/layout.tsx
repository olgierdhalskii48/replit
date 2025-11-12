"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  BarChart3,
  Users,
  MessageSquare,
  Settings,
  Menu,
  LogOut,
  User,
  Bell,
  Headphones,
  FileText,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserAvatarSrc, getUserInitials } from "@/lib/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navigation = [
  {
    name: "Zadania",
    href: "/panel-operatora",
    icon: FileText,
    current: false,
  },
  {
    name: "Statystyki",
    href: "/panel-operatora?tab=statystyki",
    icon: BarChart3,
    current: false,
  },
  {
    name: "Klienci",
    href: "/panel-operatora?tab=klienci",
    icon: Users,
    current: false,
  },
  {
    name: "Szablony odpowiedzi",
    href: "/panel-operatora?tab=szablony",
    icon: MessageSquare,
    current: false,
  },
  {
    name: "Ustawienia",
    href: "/panel-operatora?tab=ustawienia",
    icon: Settings,
    current: false,
  },
];


export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/logowanie";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center px-6 border-b">
              <Headphones className="h-8 w-8 text-green-600" />
              <span className="ml-2 text-xl font-bold">Panel Operatora</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-green-100 text-green-700"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0",
                        isActive
                          ? "text-green-500"
                          : "text-gray-400 group-hover:text-gray-500",
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}

              {/* Divider */}
              <div className="my-4 border-t border-dashed border-gray-200" />

              {/* Alternatywne (Beta) */}
              <div className="px-2 py-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase text-gray-500">Alternatywne (Beta)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600">BETA</span>
                </div>
                <div className="space-y-1">
                  <Link href="/operator" className="block text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">Zadania</Link>
                  <Link href="/operator/statystyki" className="block text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">Statystyki</Link>
                  <Link href="/operator/klienci" className="block text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">Klienci</Link>
                  <Link href="/operator/szablony" className="block text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">Szablony odpowiedzi</Link>
                  <Link href="/operator/ustawienia" className="block text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">Ustawienia</Link>
                </div>
              </div>
            </nav>

            {/* User info */}
            <div className="border-t p-4">
              <div className="flex items-center">
                <span className="mr-3 inline-flex items-center rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold uppercase">Operator</span>
                <Avatar className="h-12 w-12">
                  {(() => {
                    const src =
                      (user as any)?.avatar_url ||
                      (user as any)?.photo_url ||
                      (user as any)?.image_url ||
                      (user as any)?.picture ||
                      (user?.email ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}` : undefined);
                    return (
                      <AvatarImage src={src} alt={user?.name || user?.email || 'Użytkownik'} />
                    );
                  })()}
                  <AvatarFallback>
                    {(user?.name || user?.email || "O")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b">
            <Headphones className="h-8 w-8 text-green-600" />
            <span className="ml-2 text-xl font-bold">Panel Operatora</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-green-100 text-green-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive
                        ? "text-green-500"
                        : "text-gray-400 group-hover:text-gray-500",
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="my-4 border-t border-dashed border-gray-200" />

            {/* Alternatywne (Beta) */}
            <div className="px-2 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-gray-500">Alternatywne (Beta)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600">BETA</span>
              </div>
              <div className="space-y-1">
                <Link href="/operator" className="block text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">Zadania</Link>
                <Link href="/operator/statystyki" className="block text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">Statystyki</Link>
                <Link href="/operator/klienci" className="block text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">Klienci</Link>
                <Link href="/operator/szablony" className="block text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">Szablony odpowiedzi</Link>
                <Link href="/operator/ustawienia" className="block text-sm px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">Ustawienia</Link>
              </div>
            </div>
          </nav>

          {/* User info */}
          <div className="border-t p-4">
            <div className="flex items-center">
              <span className="mr-3 inline-flex items-center rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold uppercase">Operator</span>
              <Avatar className="h-12 w-12">
                <AvatarImage src={getUserAvatarSrc(user)} alt={user?.name || user?.email || 'Użytkownik'} />
                <AvatarFallback>{getUserInitials(user, 'O')}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user?.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notifications */}
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>

              {/* Profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getUserAvatarSrc(user)} alt={user?.name || user?.email || 'Użytkownik'} />
                      <AvatarFallback>{getUserInitials(user, 'O')}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Ustawienia</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Wyloguj</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}