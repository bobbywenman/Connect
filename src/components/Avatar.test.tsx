import { fireEvent, render, screen } from '@testing-library/react-native';

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

  it('passes the cache key to the image and falls back to initials if it fails to load', async () => {
    await render(
      <Avatar
        firstName="Ada"
        lastName="Lovelace"
        photoUrl="https://x.test/a.jpg"
        photoCacheKey="u/p.jpg?v=1"
      />,
    );
    const image = screen.getByLabelText('Photo of Ada Lovelace');
    expect(image.props.source[0]).toMatchObject({
      uri: 'https://x.test/a.jpg',
      cacheKey: 'u/p.jpg?v=1',
    });
    await fireEvent(image, 'error', { nativeEvent: { error: 'x' } });
    expect(await screen.findByText('AL')).toBeOnTheScreen();
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
