import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../utils';
import Auth from '../../routes/Auth';

// ──────────────────────────────────────────────
// Mock supabase auth module — hoisted to avoid TDZ
// ──────────────────────────────────────────────

const { mockSignIn, mockSignUp } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockSignUp: vi.fn(),
}));

vi.mock('../../lib/auth/supabaseAuth', () => ({
  signIn: mockSignIn,
  signUp: mockSignUp,
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(() => vi.fn()),
  storeCredential: vi.fn(),
  tryAutofill: vi.fn(),
}));

vi.mock('../../lib/utils/rateLimit', () => ({
  processFailedAttempt: vi.fn((state) => ({
    state: { attempts: state.attempts + 1, lockedUntil: null },
    remaining: 4 - state.attempts,
    lockedSeconds: 0,
  })),
  getLockRemaining: vi.fn(() => 0),
}));

vi.mock('../../lib/credentials/navigatorCredentials', () => ({
  storeCredential: vi.fn(),
  tryAutofill: vi.fn(),
}));

describe('Auth flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login flow', () => {
    it('should render login form by default', () => {
      render(<Auth />);

      expect(screen.getByText('auth.title')).toBeInTheDocument();
      expect(screen.getByText('auth.signInPrompt')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'auth.signIn' })).toBeInTheDocument();
    });

    it('should call signIn with email and password on submit', async () => {
      mockSignIn.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      render(<Auth />);

      fireEvent.change(screen.getByLabelText('auth.emailLabel'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('auth.passwordLabel'), {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'auth.signIn' }));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should show error on failed login', async () => {
      mockSignIn.mockRejectedValue(new Error('Invalid credentials'));

      render(<Auth />);

      fireEvent.change(screen.getByLabelText('auth.emailLabel'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('auth.passwordLabel'), {
        target: { value: 'wrong' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'auth.signIn' }));

      await waitFor(() => {
        expect(screen.getByText(/auth.errorInvalidCredentials/)).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      // Never resolve the signIn promise
      mockSignIn.mockImplementation(() => new Promise(() => {}));

      render(<Auth />);

      fireEvent.change(screen.getByLabelText('auth.emailLabel'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('auth.passwordLabel'), {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'auth.signIn' }));

      expect(screen.getByText('auth.loading')).toBeInTheDocument();
    });
  });

  describe('Sign up flow', () => {
    it('should switch to sign up mode', () => {
      render(<Auth />);

      fireEvent.click(screen.getByText('auth.switchToSignUp'));

      expect(screen.getByText('auth.signUpPrompt')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'auth.signUp' })).toBeInTheDocument();
    });

    it('should call signUp with email and password on submit', async () => {
      mockSignUp.mockResolvedValue({ id: 'user-1', email: 'new@example.com' });

      render(<Auth />);

      fireEvent.click(screen.getByText('auth.switchToSignUp'));

      fireEvent.change(screen.getByLabelText('auth.emailLabel'), {
        target: { value: 'new@example.com' },
      });
      fireEvent.change(screen.getByLabelText('auth.passwordLabel'), {
        target: { value: 'newpassword123' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'auth.signUp' }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'newpassword123');
      });
    });

    it('should switch between login and sign up modes', () => {
      render(<Auth />);

      // Start with login
      expect(screen.getByText('auth.signInPrompt')).toBeInTheDocument();

      // Switch to sign up
      fireEvent.click(screen.getByText('auth.switchToSignUp'));
      expect(screen.getByText('auth.signUpPrompt')).toBeInTheDocument();

      // Switch back to login
      fireEvent.click(screen.getByText('auth.switchToSignIn'));
      expect(screen.getByText('auth.signInPrompt')).toBeInTheDocument();
    });

    it('should clear error when switching modes', async () => {
      mockSignIn.mockRejectedValue(new Error('Invalid credentials'));

      render(<Auth />);

      fireEvent.change(screen.getByLabelText('auth.emailLabel'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('auth.passwordLabel'), {
        target: { value: 'wrong' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'auth.signIn' }));

      await waitFor(() => {
        expect(screen.getByText(/auth.errorInvalidCredentials/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('auth.switchToSignUp'));

      expect(screen.queryByText(/auth.errorInvalidCredentials/)).not.toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('should require email field', () => {
      render(<Auth />);

      const emailInput = screen.getByLabelText('auth.emailLabel');
      expect(emailInput).toBeRequired();
    });

    it('should require password with min length 6', () => {
      render(<Auth />);

      const passwordInput = screen.getByLabelText('auth.passwordLabel');
      expect(passwordInput).toHaveAttribute('minLength', '6');
    });

    it('should have proper autocomplete attributes', () => {
      render(<Auth />);

      expect(screen.getByLabelText('auth.emailLabel')).toHaveAttribute('autocomplete', 'username');
      expect(screen.getByLabelText('auth.passwordLabel')).toHaveAttribute('autocomplete', 'current-password');
    });
  });
});
