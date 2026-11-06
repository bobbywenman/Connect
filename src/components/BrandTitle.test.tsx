import { render, screen } from '@testing-library/react-native';

import { BrandTitle } from '@/components';

describe('BrandTitle', () => {
  it('renders the app name as a header', async () => {
    await render(<BrandTitle />);
    expect(screen.getByRole('header')).toHaveTextContent('KnowThem');
  });

  it('renders the subtitle when given', async () => {
    await render(<BrandTitle subtitle="Remember the people in your life" />);
    expect(screen.getByText('Remember the people in your life')).toBeOnTheScreen();
  });
});
