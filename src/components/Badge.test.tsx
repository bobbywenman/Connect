import { render, screen } from '@testing-library/react-native';

import { Badge } from '@/components';

describe('Badge', () => {
  it('renders its label', async () => {
    await render(<Badge label="Family" />);
    expect(screen.getByLabelText('Family')).toBeOnTheScreen();
  });

  it('uses the given color', async () => {
    await render(<Badge label="Work" color="#12766F" />);
    expect(screen.getByLabelText('Work')).toHaveStyle({ backgroundColor: '#12766F' });
  });
});
