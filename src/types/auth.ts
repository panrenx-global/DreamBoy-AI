export interface AuthUser {
  id: number;
  username: string;
}

export interface StoredAuthUser extends AuthUser {
  password: string;
}

export type AuthMode = 'login' | 'register';
