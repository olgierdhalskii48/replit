# Rozmowa – wdrożenia i zmiany (23.09.2025)

Poniżej zapis działań wykonanych w trakcie rozmowy wraz z listą plików i zmian.

## Streszczenie
- Usunięto przycisk „JAk dziaamy” z nagłówka panelu admina.
- Ujednolicono wyświetlanie avatarów w całej aplikacji (Admin/Operator/Klient/Publiczny header) – zdjęcie jeśli dostępne, inaczej inicjały.
- Dodano upload oraz usuwanie avatarów (walidacja image/*, maks 2MB) w panelach Admin/Operator/Klient, z natychmiastowym odświeżeniem sesji użytkownika.
- Dodano helpery do avatarów i scentralizowano logikę (renderowanie, upload, usuwanie, mockowanie).
- Zrefaktoryzowano tabele (użytkownicy, subskrypcje, klienci operatora), by używały wspólnej logiki avatarów.

## Zmodyfikowane / dodane pliki

- frontend/app/admin/layout.tsx
  - Usunięto przycisk „JAk dziaamy”.
  - Avatary korzystają z helperów `getUserAvatarSrc`, `getUserInitials`.

- frontend/components/layout/header.tsx
  - Avatary (publiczny header) korzystają z helperów.

- frontend/app/operator/layout.tsx
  - Avatary (sidebar + top-right) korzystają z helperów.

- frontend/app/panel-klienta/page.tsx
  - Dodano upload/usuwanie avatara (image/*, ≤2MB), podgląd miniatury.
  - Po powodzeniu: `updateUser({ avatar_url })` + `fetchUserSession()` dla natychmiastowej spójności UI.
  - Zrefaktoryzowano wszystkie lokalne rendery Avatar do użycia helperów.

- frontend/app/operator/ustawienia/page.tsx
  - Dodano upload/usuwanie avatara, walidacja, podgląd.
  - Po powodzeniu: `updateUser(...)` + `fetchUserSession()`.

- frontend/app/admin/ustawienia/page.tsx
  - Dodano sekcję „Profil administratora” z uploadem/usuwaniem, walidacją, podglądem.
  - Po powodzeniu: `updateUser(...)` + `fetchUserSession()`.

- frontend/app/panel-operatora/page.tsx
  - Zrefaktoryzowano avatary w sidebarze na helpery.

- frontend/app/admin/subskrypcje/page.tsx
  - Avatary w tabeli subskrypcji używają helperów (inicjały dla imienia/nazwiska lub e-mail).

- frontend/app/admin/uzytkownicy/page.tsx
  - Avatary w tabeli użytkowników używają helperów.

- frontend/app/operator/klienci/page.tsx
  - Avatary w tabeli klientów operatora – zrefaktoryzowane (inicjały, spójny styl).

- frontend/lib/api/auth.ts
  - Interfejs `User`: dodano `avatar_url?: string`.

- frontend/lib/auth.ts
  - Interfejs `User`: dodano `avatar_url?: string`.
  - Poprawiono `mockLogin` (używa `created_at: string`, dodano `auth_provider`, `is_verified`).

- frontend/lib/avatar.ts (NOWY / ROZBUDOWANY)
  - `getUserAvatarSrc(user)`: wybiera `avatar_url|photo_url|image_url|picture` albo generuje inicjały (DiceBear) jako fallback.
  - `getUserInitials(user)`: generuje inicjały (2 znaki).
  - `uploadAvatar(file)`: scentralizowany upload (POST `/api/v1/auth/me/avatar`), mockowalny przez `NEXT_PUBLIC_AVATAR_UPLOAD_MOCK=1`.
  - `deleteAvatar()`: scentralizowane usuwanie (DELETE `/api/v1/auth/me/avatar`), mockowalne.

## Wymagania backendowe
Aby całość działała w trybie produkcyjnym:
- Endpointy:
  - `POST /api/v1/auth/me/avatar` (multipart, pole `avatar`) – zwraca `{ "avatar_url": "https://..." }`.
  - `DELETE /api/v1/auth/me/avatar` – usuwa avatar (200/204).
  - `GET /api/v1/auth/me` oraz odpowiedzi login/register – zwracają `avatar_url` w obiekcie `user`.

## Tryb mock uploadu avatara (bez backendu)

- Ustaw zmienną środowiskową po stronie frontendu:
  - `NEXT_PUBLIC_AVATAR_UPLOAD_MOCK=1`
- W tym trybie:
  - `uploadAvatar(file)` zwróci tymczasowy `blob:` URL (działa do odświeżenia strony)
  - `deleteAvatar()` nic nie robi (mock)
- Docelowo wyłącz ten tryb w produkcji (nie ustawiaj zmiennej lub ustaw `0`).

## Jak przetestować (checklista)

- [ ] Zaloguj się jako admin i przejdź do `app/admin/ustawienia`:
  - [ ] Wgraj plik ≤2MB (JPG/PNG/WebP) – avatar w prawym górnym rogu i w sidebarze odświeży się.
  - [ ] Kliknij „Usuń avatar” – wróci fallback do inicjałów.
- [ ] Zaloguj się jako operator i przejdź do `app/operator/ustawienia` – powtórz kroki.
- [ ] Zaloguj się jako klient i przejdź do `app/panel-klienta` → Ustawienia → „Aktualizuj dane osobowe” – powtórz kroki.
- [ ] Sprawdź widoki list (Admin → Użytkownicy, Subskrypcje; Operator → Klienci) – avatary renderują inicjały przy braku zdjęcia.

## Walidacja i UX
- Walidacja pliku avatara: tylko `image/*`, rozmiar ≤ 2MB; komunikaty błędów w UI (toast).
- Po upload/usunięciu: `updateUser(...)` + `fetchUserSession()` dla spójności globalnej.
- UI pokazuje podgląd i pozwala wyczyścić tymczasowy podgląd (revokowanie URL dla blobów).

## Uwagi dodatkowe
- `NEXT_PUBLIC_AVATAR_UPLOAD_MOCK=1` umożliwia szybkie testy UI bez gotowego backendu – w tym trybie `uploadAvatar` zwraca tymczasowy `blob:` URL, który nie przetrwa odświeżenia strony.
- Jeśli chcesz, mogę dopisać krótką sekcję w README z instrukcją mockowania i minimalnymi wymaganiami backendu.

## Proponowane następne kroki
- Dodać e2e test scenariusza upload/usuwania avatara.
- Ujednolicić wszystkie pozostałe rozproszone miejsca (jeśli się pojawią) do `getUserAvatarSrc/getUserInitials`.
- Potwierdzić backendowe kontrakty: responsy, pola i kody odpowiedzi dla endpointów avatara.
