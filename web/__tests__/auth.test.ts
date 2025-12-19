jest.mock('../../shared/firebaseConfig', () => ({
  auth: {},
}));

const mockSignInWithEmailAndPassword = jest.fn();
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockSignOut = jest.fn();
const mockOnAuthStateChanged = jest.fn();

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signInWithPopup: mockSignInWithPopup,
  GoogleAuthProvider: jest.fn(),
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
}));

import { signInWithEmail, signUpWithEmail, signInWithGoogle, logout, onAuthStateChange } from '../../shared/auth';

describe('Auth Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithEmail', () => {
    it('should sign in successfully with valid credentials', async () => {
      const mockUser = { uid: '123', email: 'test@example.com' };
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

      const result = await signInWithEmail('test@example.com', 'password123');

      expect(result).toEqual({ user: mockUser, error: null });
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith({}, 'test@example.com', 'password123');
    });

    it('should return error for empty email', async () => {
      const result = await signInWithEmail('', 'password123');

      expect(result).toEqual({ user: null, error: 'Email and password are required' });
      expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('should return error for invalid email format', async () => {
      const result = await signInWithEmail('invalid-email', 'password123');

      expect(result).toEqual({ user: null, error: 'Invalid email format' });
      expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('should return error on Firebase failure', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(new Error('Firebase error'));

      const result = await signInWithEmail('test@example.com', 'password123');

      expect(result).toEqual({ user: null, error: 'Firebase error' });
    });
  });

  describe('signUpWithEmail', () => {
    it('should sign up successfully with valid credentials', async () => {
      const mockUser = { uid: '123', email: 'test@example.com' };
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });

      const result = await signUpWithEmail('test@example.com', 'password123');

      expect(result).toEqual({ user: mockUser, error: null });
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith({}, 'test@example.com', 'password123');
    });

    it('should sign up successfully with identity document data', async () => {
      const mockUser = { uid: '123', email: 'test@example.com' };
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });

      const result = await signUpWithEmail('test@example.com', 'password123', undefined, {
        type: 'ci',
        number: 'AB123456',
      });

      expect(result).toEqual({ user: mockUser, error: null });
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith({}, 'test@example.com', 'password123');
    });

    it('should return error for password too short', async () => {
      const result = await signUpWithEmail('test@example.com', '123');

      expect(result).toEqual({ user: null, error: 'Password must be at least 6 characters' });
      expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('should return error on Firebase failure', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValue(new Error('Firebase error'));

      const result = await signUpWithEmail('test@example.com', 'password123');

      expect(result).toEqual({ user: null, error: 'Firebase error' });
    });
  });

  describe('signInWithGoogle', () => {
    it('should sign in with Google successfully', async () => {
      const mockUser = { uid: '123', email: 'test@example.com' };
      mockSignInWithPopup.mockResolvedValue({ user: mockUser });

      const result = await signInWithGoogle();

      expect(result).toEqual({ user: mockUser, error: null });
      expect(mockSignInWithPopup).toHaveBeenCalled();
    });

    it('should return error on Firebase failure', async () => {
      mockSignInWithPopup.mockRejectedValue(new Error('Google sign-in failed'));

      const result = await signInWithGoogle();

      expect(result).toEqual({ user: null, error: 'Google sign-in failed' });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockSignOut.mockResolvedValue(undefined);

      const result = await logout();

      expect(result).toEqual({ error: null });
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should return error on Firebase failure', async () => {
      mockSignOut.mockRejectedValue(new Error('Logout failed'));

      const result = await logout();

      expect(result).toEqual({ error: 'Logout failed' });
    });
  });

  describe('onAuthStateChange', () => {
    it('should call onAuthStateChanged with callback', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);

      const unsubscribe = onAuthStateChange(mockCallback);

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith({}, mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });
});
