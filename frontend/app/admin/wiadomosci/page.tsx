"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminMessagesPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push("/admin?tab=wiadomosci");
  }, [router]);

  return (
    <div className="p-8 text-center">
      <p>Przenoszenie do panelu wiadomości…</p>
      <p className="mt-2">
        Jeśli nie nastąpi przekierowanie, przejdź do {" "}
        <Link href="/admin?tab=wiadomosci" className="text-blue-600 underline">
          /admin?tab=wiadomosci
        </Link>
      </p>
    </div>
  );
}
