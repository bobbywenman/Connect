import { render, screen } from '@testing-library/react-native';

import { Avatar, avatarColor, getInitials } from '@/components';

describe('Avatar', () => {
  it('falls back to initials without a photo', async () => {
    await render(<Avatar firstName="ada" lastName="Lovelace" />);
    expect(screen.getByText('AL')).toBeOnTheScreen();
    expect(screen.getByLabelText('ada Lovelace')).toBeOnTheScreen();
  });

  it('renders a photo when photoUrl is given', async () => {
    await render(<Avatar firstName="Ada" lastName="Lovelace" photoUrl="https://x.test/a.jpg" />);
    expect(screen.getByLabelText('Photo of Ada Lovelace')).toBeOnTheScreen();
    expect(screen.queryByText('AL')).toBeNull();
  });

  it.each([
    ['sm', 32],
    ['md', 48],
    ['lg', 64],
    ['xl', 96],
  ] as const)('size %s is %ipt', async (size, px) => {
    await render(<Avatar firstName="Ada" size={size} />);
    expect(screen.getByLabelText('Ada')).toHaveStyle({ width: px, height: px });
  });
});

describe('avatar helpers', () => {
  it('derives initials', () => {
    expect(getInitials('Ada', 'Lovelace')).toBe('AL');
    expect(getInitials('Ada')).toBe('A');
    expect(getInitials('', '')).toBe('?');
  });

  it('derives the same color for the same name, case-insensitively', () => {
    expect(avatarColor('Ada Lovelace')).toBe(avatarColor('ada lovelace'));
    expect(avatarColor('Ada Lovelace')).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
