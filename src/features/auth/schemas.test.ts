import { loginSchema, signUpSchema } from './schemas';

const valid = {
  name: 'Ada',
  email: 'ada@example.com',
  password: 'password123',
  confirmPassword: 'password123',
};

function firstError(result: ReturnType<typeof signUpSchema.safeParse>, path: string) {
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === path)?.message;
}

describe('signUpSchema', () => {
  it('accepts valid input and trims name and email', () => {
    const r = signUpSchema.safeParse({ ...valid, name: '  Ada ', email: ' ada@example.com ' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe('Ada');
      expect(r.data.email).toBe('ada@example.com');
    }
  });

  it('requires a name', () => {
    expect(firstError(signUpSchema.safeParse({ ...valid, name: '   ' }), 'name')).toBe(
      'Enter your name',
    );
  });

  it('rejects bad emails', () => {
    for (const email of ['', 'nope', 'a@b', 'a b@c.com']) {
      expect(firstError(signUpSchema.safeParse({ ...valid, email }), 'email')).toBeDefined();
    }
  });

  it('requires at least 8 characters', () => {
    const short = signUpSchema.safeParse({
      ...valid,
      password: '1234567',
      confirmPassword: '1234567',
    });
    expect(firstError(short, 'password')).toBe('Use at least 8 characters');
    const ok = signUpSchema.safeParse({
      ...valid,
      password: '12345678',
      confirmPassword: '12345678',
    });
    expect(ok.success).toBe(true);
  });

  it('requires the confirmation to match', () => {
    const r = signUpSchema.safeParse({ ...valid, confirmPassword: 'different1' });
    expect(firstError(r, 'confirmPassword')).toBe('Passwords do not match');
  });
});

describe('loginSchema', () => {
  it('accepts an email and any non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });

  it('rejects an invalid email and empty password', () => {
    const r = loginSchema.safeParse({ email: 'bad', password: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map((i) => i.path[0]).sort()).toEqual(['email', 'password']);
    }
  });
});
