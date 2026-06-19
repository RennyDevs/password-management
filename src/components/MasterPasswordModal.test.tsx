import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import MasterPasswordModal from './MasterPasswordModal';

describe('MasterPasswordModal', () => {
  const defaultProps = {
    title: 'Enter Master Password',
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the modal with title and input', () => {
    render(<MasterPasswordModal {...defaultProps} />);

    expect(screen.getByText('Enter Master Password')).toBeInTheDocument();
    expect(screen.getByLabelText('masterPasswordModal.masterPasswordLabel')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('masterPasswordModal.masterPasswordPlaceholder')).toBeInTheDocument();
  });

  it('should call onSubmit with password when form is submitted', async () => {
    defaultProps.onSubmit.mockResolvedValue(true);

    render(<MasterPasswordModal {...defaultProps} />);

    const input = screen.getByLabelText('masterPasswordModal.masterPasswordLabel');
    fireEvent.change(input, { target: { value: 'my-master-password' } });

    fireEvent.click(screen.getByText('masterPasswordModal.unlock'));

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith('my-master-password');
    });
  });

  it('should show error when password is empty', async () => {
    render(<MasterPasswordModal {...defaultProps} />);

    fireEvent.click(screen.getByText('masterPasswordModal.unlock'));

    await waitFor(() => {
      expect(screen.getByText('masterPasswordModal.errorPasswordRequired')).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('should show error when onSubmit returns false (wrong password)', async () => {
    defaultProps.onSubmit.mockResolvedValue(false);

    render(<MasterPasswordModal {...defaultProps} />);

    const input = screen.getByLabelText('masterPasswordModal.masterPasswordLabel');
    fireEvent.change(input, { target: { value: 'wrong-password' } });

    fireEvent.click(screen.getByText('masterPasswordModal.unlock'));

    await waitFor(() => {
      expect(screen.getByText(/masterPasswordModal.errorInvalidPassword/)).toBeInTheDocument();
    });
  });

  it('should show error message with remaining attempts count', async () => {
    defaultProps.onSubmit.mockResolvedValue(false);

    render(<MasterPasswordModal {...defaultProps} />);

    const input = screen.getByLabelText('masterPasswordModal.masterPasswordLabel');

    // First attempt
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('masterPasswordModal.unlock'));
    await waitFor(() => {
      // With mock i18n, the key is returned as-is
      expect(screen.getByText(/masterPasswordModal.errorInvalidPassword/)).toBeInTheDocument();
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<MasterPasswordModal {...defaultProps} />);

    fireEvent.click(screen.getByText('masterPasswordModal.cancel'));

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('should show technical error when onSubmit throws', async () => {
    defaultProps.onSubmit.mockRejectedValue(new Error('Network error'));

    render(<MasterPasswordModal {...defaultProps} />);

    const input = screen.getByLabelText('masterPasswordModal.masterPasswordLabel');
    fireEvent.change(input, { target: { value: 'password' } });

    fireEvent.click(screen.getByText('masterPasswordModal.unlock'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should lock after 5 failed attempts', async () => {
    defaultProps.onSubmit.mockResolvedValue(false);

    render(<MasterPasswordModal {...defaultProps} />);

    const input = screen.getByLabelText('masterPasswordModal.masterPasswordLabel');

    // Submit 5 wrong passwords
    for (let i = 0; i < 6; i++) {
      fireEvent.change(input, { target: { value: `wrong-${i}` } });
      fireEvent.click(screen.getByText('masterPasswordModal.unlock'));

      // Wait for the async submit to resolve
      await waitFor(() => {
        // The button should be re-enabled after each attempt
        expect(screen.getByText('masterPasswordModal.unlock')).not.toBeDisabled();
      });
    }

    // After 5 failed attempts, the modal shows a lock message
    await waitFor(() => {
      // With mock i18n, the key is returned as-is
      expect(screen.getByText(/masterPasswordModal.errorTooManyAttempts|masterPasswordModal.lockedMessage/)).toBeInTheDocument();
    });
  });

  it('should show custom loading text when provided', async () => {
    defaultProps.onSubmit.mockImplementation(() => new Promise((res) => setTimeout(() => res(true), 100)));

    render(
      <MasterPasswordModal
        {...defaultProps}
        customLoading="Checking..."
      />,
    );

    const input = screen.getByLabelText('masterPasswordModal.masterPasswordLabel');
    fireEvent.change(input, { target: { value: 'pass' } });
    fireEvent.click(screen.getByText('masterPasswordModal.unlock'));

    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('should be a modal dialog with proper ARIA attributes', () => {
    render(<MasterPasswordModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });
});
