"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Simple theme manager toggling the `dark` class on <html>.
// Persists preference in localStorage under key `theme` ("light" | "dark").
export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldDark = stored ? stored === "dark" : prefersDark;
    applyTheme(shouldDark);
  }, []);

  const applyTheme = (dark: boolean) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setIsDark(dark);
  };

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
      title={isDark ? "Jasny motyw" : "Ciemny motyw"}
      onClick={() => applyTheme(!isDark)}
      className="text-gray-600 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
