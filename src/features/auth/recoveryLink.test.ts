import { parseRecoveryLink } from './recoveryLink';

describe('parseRecoveryLink', () => {
  it('parses a PKCE code (native scheme and web URL)', () => {
    expect(parseRecoveryLink('knowthem://reset-password?code=abc-123')).toEqual({
      kind: 'code',
      code: 'abc-123',
    });
    expect(parseRecoveryLink('http://localhost:8081/reset-password?code=xyz')).toEqual({
      kind: 'code',
      code: 'xyz',
    });
  });

  it('parses a token_hash link and requires type=recovery', () => {
    expect(parseRecoveryLink('knowthem://reset-password?token_hash=h4sh&type=recovery')).toEqual({
      kind: 'tokenHash',
      tokenHash: 'h4sh',
    });
    expect(parseRecoveryLink('knowthem://reset-password?token_hash=h4sh&type=signup')).toEqual({
      kind: 'none',
    });
    expect(parseRecoveryLink('knowthem://reset-password?token_hash=h4sh')).toEqual({
      kind: 'none',
    });
  });

  it('parses implicit-flow tokens from the hash', () => {
    expect(
      parseRecoveryLink(
        'knowthem://reset-password#access_token=a.b.c&refresh_token=r1&expires_in=3600&token_type=bearer&type=recovery',
      ),
    ).toEqual({ kind: 'tokens', accessToken: 'a.b.c', refreshToken: 'r1' });
  });

  it('ignores implicit tokens that are not a recovery', () => {
    expect(parseRecoveryLink('knowthem://x#access_token=a&refresh_token=r&type=signup')).toEqual({
      kind: 'none',
    });
    expect(parseRecoveryLink('knowthem://x#access_token=a&type=recovery')).toEqual({
      kind: 'none',
    });
  });

  it('parses error redirects from hash or query, decoding the description', () => {
    expect(
      parseRecoveryLink(
        'knowthem://reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      ),
    ).toEqual({
      kind: 'error',
      errorCode: 'otp_expired',
      description: 'Email link is invalid or has expired',
    });
    expect(parseRecoveryLink('http://localhost:8081/reset-password?error=access_denied')).toEqual({
      kind: 'error',
      errorCode: 'access_denied',
      description: null,
    });
  });

  it('prefers an error over credentials, and the hash over the query', () => {
    expect(parseRecoveryLink('x://y?code=1#error_code=otp_expired').kind).toBe('error');
    expect(parseRecoveryLink('x://y?code=1#code=2')).toEqual({ kind: 'code', code: '2' });
  });

  it('percent-decodes values and survives malformed escapes', () => {
    expect(parseRecoveryLink('x://y?code=a%2Bb')).toEqual({ kind: 'code', code: 'a+b' });
    expect(parseRecoveryLink('x://y?code=%E0%A4%A')).toEqual({ kind: 'code', code: '%E0%A4%A' });
  });

  it('returns none for garbage, empty and non-string input', () => {
    for (const input of ['', 'garbage', '?', '#', '&&&', 'knowthem://reset-password', '%%%']) {
      expect(parseRecoveryLink(input)).toEqual({ kind: 'none' });
    }
    expect(parseRecoveryLink(null)).toEqual({ kind: 'none' });
    expect(parseRecoveryLink(undefined)).toEqual({ kind: 'none' });
    expect(parseRecoveryLink(42 as unknown as string)).toEqual({ kind: 'none' });
  });
});
