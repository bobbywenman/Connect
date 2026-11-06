export const colors = {
  primary: '#1E3A5F',
  accent: '#2980B9',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#111111',
  textSecondary: '#555555',
  textOnPrimary: '#FFFFFF',
  border: '#D0D5DB',
  error: '#C0392B',
  success: '#1A7340',
  /** "Sort of" ratings. Dark enough for text on white. */
  warning: '#9A5B00',
  shadow: '#000000',
} as const;

export type ColorName = keyof typeof colors;

export interface NetworkColor {
  name: string;
  value: string;
}

/** Ordered palette for network colors. Stored by name; keep the order stable. */
export const networkColors: readonly NetworkColor[] = [
  { name: 'blue', value: '#2563B0' },
  { name: 'green', value: '#1E7B45' },
  { name: 'purple', value: '#7A3FA8' },
  { name: 'red', value: '#C0392B' },
  { name: 'orange', value: '#B85C0A' },
  { name: 'teal', value: '#12766F' },
  { name: 'pink', value: '#B83280' },
  { name: 'gray', value: '#5F6773' },
];
