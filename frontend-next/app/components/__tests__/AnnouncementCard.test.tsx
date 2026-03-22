import { render, screen } from '@testing-library/react';
import { AnnouncementCard } from '../AnnouncementCard';
import type { AnnouncementCard as CardType } from '@/app/lib/types';

// Mock analytics
jest.mock('@/app/lib/analytics', () => ({
  trackEvent: jest.fn(),
}));

describe('AnnouncementCard', () => {
  const mockCard: CardType = {
    id: 'test-1',
    title: 'UPSC Civil Services 2026',
    slug: 'upsc-civil-services-2026',
    type: 'job',
    category: 'Latest Jobs',
    organization: 'UPSC',
    postedAt: '2026-03-20T08:00:00.000Z',
    viewCount: 1500,
    totalPosts: 1206,
    deadline: '2026-04-28T00:00:00.000Z',
  };

  it('renders announcement card with title', () => {
    render(<AnnouncementCard card={mockCard} />);
    expect(screen.getByText('UPSC Civil Services 2026')).toBeInTheDocument();
  });

  it('displays organization name', () => {
    render(<AnnouncementCard card={mockCard} />);
    expect(screen.getByText('UPSC')).toBeInTheDocument();
  });

  it('shows deadline when available', () => {
    render(<AnnouncementCard card={mockCard} />);
    expect(screen.getByText(/28.*Apr.*2026/i)).toBeInTheDocument();
  });

  it('displays total posts when available', () => {
    render(<AnnouncementCard card={mockCard} />);
    expect(screen.getByText(/1,206.*Posts/i)).toBeInTheDocument();
  });

  it('renders correct link href', () => {
    render(<AnnouncementCard card={mockCard} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/job/upsc-civil-services-2026');
  });

  it('shows NEW badge for fresh posts', () => {
    const freshCard = {
      ...mockCard,
      postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    };
    render(<AnnouncementCard card={freshCard} />);
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('does not show NEW badge for old posts', () => {
    const oldCard = {
      ...mockCard,
      postedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    };
    render(<AnnouncementCard card={oldCard} />);
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('renders different content types correctly', () => {
    const resultCard: CardType = {
      ...mockCard,
      type: 'result',
      category: 'Results',
    };
    render(<AnnouncementCard card={resultCard} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/result/upsc-civil-services-2026');
  });
});
