import { colors, networkColors } from '@/constants';
import { contrastRatio } from '@/lib/contrast';

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colors', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
  });

  it('is symmetric and supports short hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
  });

  it('rejects invalid colors', () => {
    expect(() => contrastRatio('red', '#fff')).toThrow();
  });
});

describe('design token contrast (WCAG AA 4.5:1)', () => {
  const AA = 4.5;

  it.each([
    ['text', colors.text],
    ['textSecondary', colors.textSecondary],
    ['error', colors.error],
    ['success', colors.success],
    ['warning', colors.warning],
    ['primary', colors.primary],
  ])('%s on background', (_name, fg) => {
    expect(contrastRatio(fg, colors.background)).toBeGreaterThanOrEqual(AA);
  });

  it('textSecondary on surface', () => {
    expect(contrastRatio(colors.textSecondary, colors.surface)).toBeGreaterThanOrEqual(AA);
  });

  it('white text on primary', () => {
    expect(contrastRatio(colors.textOnPrimary, colors.primary)).toBeGreaterThanOrEqual(AA);
  });

  it('white text on error (danger button)', () => {
    expect(contrastRatio(colors.textOnPrimary, colors.error)).toBeGreaterThanOrEqual(AA);
  });

  it.each(networkColors.map((c) => [c.name, c.value] as const))(
    'white text on network color %s',
    (_name, value) => {
      expect(contrastRatio(colors.textOnPrimary, value)).toBeGreaterThanOrEqual(AA);
    },
  );
});
