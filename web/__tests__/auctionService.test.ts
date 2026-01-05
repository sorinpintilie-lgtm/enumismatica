import { validateBid, placeBid, setAutoBid, getAutoBids, endAuction, calculateNextBidAmount } from '../../shared/auctionService';

jest.mock('../../shared/firebaseConfig', () => ({
  db: {},
}));

const mockDoc = jest.fn();
const mockCollection = jest.fn();
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockRunTransaction = jest.fn();
const mockGetDoc = jest.fn();
const mockTimestamp = {
  fromDate: jest.fn(),
};

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  collection: mockCollection,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  getDocs: mockGetDocs,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  runTransaction: mockRunTransaction,
  getDoc: mockGetDoc,
  Timestamp: mockTimestamp,
}));

describe('Auction Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateNextBidAmount', () => {
    it('should calculate next bid amount with 5% increment and round up', () => {
      // 100 * 1.05 = 105, should round up to 105 (already whole number)
      expect(calculateNextBidAmount(100)).toBe(105);
      
      // 100 * 1.05 = 105, should round up to 105
      expect(calculateNextBidAmount(100, 0.05)).toBe(105);
      
      // 21.02 * 1.05 = 22.071, should round up to 23
      expect(calculateNextBidAmount(21.02)).toBe(23);
      
      // 50 * 1.10 = 55.00000000000001 due to floating point precision, should round up to 56
      expect(calculateNextBidAmount(50, 0.10)).toBe(56);
    });
  });

  describe('validateBid', () => {
    const mockAuction = {
      id: '1',
      status: 'active',
      endTime: new Date(Date.now() + 1000),
      currentBidderId: 'user1',
      currentBid: 10,
      reservePrice: 5,
    } as any;

    it('should validate a valid bid', () => {
      // With current bid of 10, next bid should be at least 11 (10 * 1.05 = 10.5, rounded up to 11)
      const result = validateBid(mockAuction, 11, 'user2');

      expect(result.valid).toBe(true);
    });

    it('should reject bid if auction is not active', () => {
      const inactiveAuction = { ...mockAuction, status: 'ended' };

      const result = validateBid(inactiveAuction, 11, 'user2');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Auction is not active');
    });

    it('should reject bid if auction has ended', () => {
      const endedAuction = { ...mockAuction, endTime: new Date(Date.now() - 1000) };

      const result = validateBid(endedAuction, 11, 'user2');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Auction has ended');
    });

    it('should reject bid if user is already highest bidder', () => {
      const result = validateBid(mockAuction, 11, 'user1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('You are already the highest bidder');
    });

    it('should reject bid if amount is too low', () => {
      const result = validateBid(mockAuction, 10, 'user2');

      expect(result.valid).toBe(false);
      // With 5% increment from 10, next bid should be 11 (10 * 1.05 = 10.5, rounded up to 11)
      expect(result.error).toBe('Licitația trebuie să fie cel puțin 11 EUR (increment minim 5% din valoarea curentă)');
    });

    it('should ensure minimum bid is at least reserve price', () => {
      const auctionWithHighReserve = { ...mockAuction, currentBid: 5, reservePrice: 20 };
      const result = validateBid(auctionWithHighReserve, 15, 'user2');

      expect(result.valid).toBe(false);
      // 5 * 1.05 = 5.25, rounded up to 6, but reserve price is 20, so min bid should be 20
      expect(result.error).toBe('Licitația trebuie să fie cel puțin 20 EUR (increment minim 5% din valoarea curentă)');
    });
  });

  describe('setAutoBid', () => {
    it('should create a new auto-bid if none exists', async () => {
      mockGetDocs.mockResolvedValue({ empty: true });
      mockAddDoc.mockResolvedValue(undefined);

      await setAutoBid('auction1', 100, 'user1');

      expect(mockAddDoc).toHaveBeenCalled();
    });

    it('should update existing auto-bid', async () => {
      const mockDocRef = {};
      mockGetDocs.mockResolvedValue({ empty: false, docs: [{ id: 'bid1' }] });
      mockDoc.mockReturnValue(mockDocRef);
      mockUpdateDoc.mockResolvedValue(undefined);

      await setAutoBid('auction1', 100, 'user1');

      expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, expect.any(Object));
    });
  });

  describe('getAutoBids', () => {
    it('should return auto-bids for an auction', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'bid1',
            data: () => ({
              userId: 'user1',
              maxAmount: 100,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await getAutoBids('auction1');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user1');
    });
  });

  describe('endAuction', () => {
    it('should end an active auction', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            status: 'active',
            currentBid: 10,
            reservePrice: 5,
            currentBidderId: 'user1',
          }),
        }),
        update: jest.fn(),
      };
      mockRunTransaction.mockImplementation(async (db, callback) => {
        await callback(mockTransaction);
      });

      await endAuction('auction1');

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ status: 'ended' })
      );
    });

    it('should not end an already ended auction', async () => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ status: 'ended' }),
        }),
        update: jest.fn(),
      };
      mockRunTransaction.mockImplementation(async (db, callback) => {
        await callback(mockTransaction);
      });

      await endAuction('auction1');

      expect(mockTransaction.update).not.toHaveBeenCalled();
    });
  });
});