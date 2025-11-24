import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuctionCard from '../app/components/AuctionCard';
import { Auction } from '../../shared/types';

jest.mock('../app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../app/services/auctionService', () => ({
  placeBid: jest.fn(),
}));

const mockUseAuth = require('../app/context/AuthContext').useAuth;
const mockPlaceBid = require('../app/services/auctionService').placeBid;

const mockAuction: Auction = {
  id: 'auction1',
  productId: 'product1',
  status: 'active',
  startTime: new Date(),
  endTime: new Date(Date.now() + 3600000), // 1 hour from now
  reservePrice: 10,
  currentBid: 15,
  currentBidderId: 'user1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuctionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders auction information correctly', () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(<AuctionCard auction={mockAuction} />);

    expect(screen.getByText('Auction #auction1')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('shows login button when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(<AuctionCard auction={mockAuction} />);

    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('allows placing a bid when user is authenticated', async () => {
    const mockUser = { uid: 'user2' };
    mockUseAuth.mockReturnValue({ user: mockUser });
    mockPlaceBid.mockResolvedValue();

    render(<AuctionCard auction={mockAuction} />);

    const input = screen.getByPlaceholderText('Min: $15.01');
    const button = screen.getByRole('button', { name: 'Bid' });

    fireEvent.change(input, { target: { value: '16' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockPlaceBid).toHaveBeenCalledWith('auction1', 16, 'user2');
    });
  });

  it('displays countdown timer', () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(<AuctionCard auction={mockAuction} />);

    // The countdown should be displayed
    expect(screen.getByText(/Time Left:/)).toBeInTheDocument();
  });
});