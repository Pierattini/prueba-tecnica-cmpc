import type { User } from '../api/types';

const KEY = 'cmpc.session';

interface Session {
  token: string;
  user: User;
  expiresAt: number;
}

// localStorage por simplicidad; en el README explico la alternativa con cookie httpOnly
export const tokenStorage = {
  save(token: string, user: User, expiresInSeconds: number): void {
    const session: Session = { token, user, expiresAt: Date.now() + expiresInSeconds * 1000 };
    localStorage.setItem(KEY, JSON.stringify(session));
  },

  read(): Session | null {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as Session;
      // una sesion vencida se descarta sin esperar el 401 del backend
      if (!session.token || session.expiresAt <= Date.now()) {
        localStorage.removeItem(KEY);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(KEY);
      return null;
    }
  },

  getToken(): string | null {
    return this.read()?.token ?? null;
  },

  clear(): void {
    localStorage.removeItem(KEY);
  },
};
