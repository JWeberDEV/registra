import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    user?: {
      id: number;
      email: string;
      nome: string;
      tipo_usuario: string;
    };
    originalAdmin?: {
      id: number;
      email: string;
      nome: string;
      tipo_usuario: string;
    };
    isImpersonating?: boolean;
  }
}