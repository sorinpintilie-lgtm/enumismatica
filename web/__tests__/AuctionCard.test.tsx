import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import AuctionCard from '../app/components/AuctionCard';
import type { Auction } from '../../shared/types';

jest.mock('../app/context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../app/components/ToastProvider', () => ({
	useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('../app/hooks/useProducts', () => ({
	useProduct: jest.fn(),
}));

jest.mock('shared/auctionService', () => ({
	placeBid: jest.fn(),
	calculateNextBidAmount: jest.fn(() => 16),
}));

const mockUseAuth = require('../app/context/AuthContext').useAuth;
const mockUseProduct = require('../app/hooks/useProducts').useProduct;

const mockAuction: Auction = {
	id: 'auction_123456',
	productId: 'product_1',
	status: 'active',
	startTime: new Date(),
	endTime: new Date(Date.now() + 3600000),
	reservePrice: 10,
	currentBid: 15,
	createdAt: new Date(),
	updatedAt: new Date(),
};

describe('AuctionCard', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('appends width using & when the image URL already has query params (Firebase Storage)', () => {
		mockUseAuth.mockReturnValue({ user: null });

		mockUseProduct.mockReturnValue({
			product: {
				id: 'product_1',
				name: 'Test Product',
				images: ['https://firebasestorage.googleapis.com/v0/b/bucket/o/path.webp?alt=media&token=abc'],
				imagesRaw: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});

		render(<AuctionCard auction={mockAuction} />);

		const img = screen.getByRole('img');
		expect(img.getAttribute('src')).toContain('&width=400');
	});

	it('falls back to imagesRaw when images is empty', () => {
		mockUseAuth.mockReturnValue({ user: null });

		mockUseProduct.mockReturnValue({
			product: {
				id: 'product_1',
				name: 'Test Product',
				images: [],
				imagesRaw: ['https://firebasestorage.googleapis.com/v0/b/bucket/o/raw.jpg?alt=media&token=rawtoken'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});

		render(<AuctionCard auction={mockAuction} />);

		const img = screen.getByRole('img');
		expect(img.getAttribute('src')).toContain('&width=400');
	});
});
