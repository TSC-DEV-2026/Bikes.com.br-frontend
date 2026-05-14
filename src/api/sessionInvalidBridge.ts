type AuthSessionInvalidHandler = () => void;

let handler: AuthSessionInvalidHandler | null = null;

/** Registrado pelo `AuthProvider` para limpar estado quando o refresh de sessão falha. */
export function setAuthSessionInvalidHandler(fn: AuthSessionInvalidHandler | null) {
  handler = fn;
}

export function notifyAuthSessionInvalid() {
  handler?.();
}
