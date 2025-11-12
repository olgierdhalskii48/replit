export type AnyUser = {
  name?: string;
  email?: string;
  avatar_url?: string;
  photo_url?: string;
  image_url?: string;
  picture?: string;
};

export function getUserAvatarSrc(user?: AnyUser | null): string | undefined {
  if (!user) return undefined;
  const src = user.avatar_url || user.photo_url || user.image_url || user.picture;
  if (src) return src;
  if (user.email || user.name) {
    const seed = encodeURIComponent(user.name || user.email || "");
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
  }
  return undefined;
}

export function getUserInitials(user?: AnyUser | null, fallback = "U"): string {
  const base = user?.name || user?.email || fallback;
  return base
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

/** Upload avatar via API (or mock). Returns the new avatar URL. */
export async function uploadAvatar(file: File): Promise<string> {
  const useMock = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AVATAR_UPLOAD_MOCK === '1';
  if (useMock) {
    // In mock mode, return a blob URL (note: will not persist across reloads)
    return new Promise<string>((resolve) => {
      const url = URL.createObjectURL(file);
      resolve(url);
    });
  }
  const { authAPI } = await import("@/lib/api/auth");
  const fd = new FormData();
  fd.append('avatar', file);
  const res = await authAPI.makeRequest<any>('POST', '/auth/me/avatar', fd, true);
  const newUrl = res?.avatar_url || res?.url || res?.avatar;
  if (!newUrl) throw new Error('Brak adresu URL avatara w odpowiedzi API');
  return newUrl as string;
}

/** Delete avatar via API (or mock). */
export async function deleteAvatar(): Promise<void> {
  const useMock = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AVATAR_UPLOAD_MOCK === '1';
  if (useMock) {
    return; // nothing to do in mock mode
  }
  const { authAPI } = await import("@/lib/api/auth");
  await authAPI.makeRequest('DELETE', '/auth/me/avatar', undefined, true);
}
