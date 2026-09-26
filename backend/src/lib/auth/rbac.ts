export type Scopes = 'INVOICE:READ' | 'INVOICE:WRITE' | 'TENANT:ADMIN' | 'SUPERADMIN';

export function hasScope(grantedScopes: string[], requiredScope: string): boolean {
  return grantedScopes.includes(requiredScope) || grantedScopes.includes('SUPERADMIN');
}

export function requireScope(grantedScopes: string[], requiredScope: string) {
  if (!hasScope(grantedScopes, requiredScope)) {
    throw new Error(`Forbidden: Requires scope ${requiredScope}`);
  }
}
