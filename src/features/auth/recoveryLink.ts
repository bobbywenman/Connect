// Pure parser for the URL a password-reset email link lands on. Supabase can produce three shapes
// depending on flow type and email template, plus error redirects, so we accept them all:
//   PKCE:            knowthem://reset-password?code=abc
//   Token hash:      knowthem://reset-password?token_hash=abc&type=recovery   (custom template)
//   Implicit:        knowthem://reset-password#access_token=a&refresh_token=b&type=recovery
//   Error redirect:  knowthem://reset-password#error=access_denied&error_code=otp_expired&...
export type RecoveryLink =
  | { kind: 'code'; code: string }
  | { kind: 'tokenHash'; tokenHash: string }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'error'; errorCode: string | null; description: string | null }
  | { kind: 'none' };

function decode(value: string): string {
  const spaced = value.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
}

function parseParams(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of source.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = decode(eq === -1 ? pair : pair.slice(0, eq));
    const value = eq === -1 ? '' : decode(pair.slice(eq + 1));
    if (key && !(key in out)) out[key] = value;
  }
  return out;
}

/** Extracts the recovery credentials (or error) from a deep link / page URL. Never throws. */
export function parseRecoveryLink(url: string | null | undefined): RecoveryLink {
  if (typeof url !== 'string' || url.length === 0) return { kind: 'none' };

  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf('?');
  const query = queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1);

  // The hash wins on conflicts: implicit-flow tokens and error details arrive there.
  const params = { ...parseParams(query), ...parseParams(hash) };

  if (params.error || params.error_code || params.error_description) {
    return {
      kind: 'error',
      errorCode: params.error_code || params.error || null,
      description: params.error_description || null,
    };
  }
  if (params.access_token && params.refresh_token && params.type === 'recovery') {
    return { kind: 'tokens', accessToken: params.access_token, refreshToken: params.refresh_token };
  }
  if (params.token_hash && params.type === 'recovery') {
    return { kind: 'tokenHash', tokenHash: params.token_hash };
  }
  if (params.code) return { kind: 'code', code: params.code };
  return { kind: 'none' };
}
