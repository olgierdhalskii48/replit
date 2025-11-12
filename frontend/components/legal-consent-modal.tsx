"use client";

import { useEffect, useState } from "react";

export default function LegalConsentModal() {
  const STORAGE_KEY = "legal-consent-v1";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(STORAGE_KEY);
      if (!accepted) {
        // show on first visit only
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
      document.cookie = `legal-consent=accepted; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
    } catch {}
    setOpen(false);
  };

  const decline = () => {
    // Soft-decline: close modal but do not store acceptance
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">
        <div className="absolute -inset-24 bg-gradient-to-br from-blue-500/5 via-cyan-400/5 to-indigo-500/5 pointer-events-none" />
        <div className="relative p-6 md:p-8 space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Informacja prawna i zgoda</h2>
          <p className="text-sm text-gray-600">
            Korzystając z serwisu, akceptujesz zasady Regulaminu i Polityki Prywatności.
            Treści generowane przez system mają charakter informacyjny i wymagają weryfikacji przez
            wykwalifikowanego prawnika. Nie stanowią porady prawnej w rozumieniu przepisów prawa.
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>Dane mogą być przetwarzane w celu świadczenia usług i poprawy jakości (zgodnie z Polityką Prywatności).</li>
            <li>W każdej chwili możesz cofnąć zgodę kontaktując się z Administratorem.</li>
          </ul>
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500">
              Zapoznaj się: <a href="/regulamin" className="underline">Regulamin</a> • <a href="/polityka-prywatnosci" className="underline">Polityka Prywatności</a>
            </div>
            <div className="flex gap-2">
              <button onClick={decline} className="px-4 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50">Później</button>
              <button onClick={accept} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Akceptuję</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
