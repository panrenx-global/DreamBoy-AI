export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
}

export interface StoredAuthUser extends AuthUser {
  password: string;
}

export type AuthMode = 'login' | 'register';
