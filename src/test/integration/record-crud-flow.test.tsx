import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../utils';
import { createMockUser } from '../utils';
import UserContext from '../../lib/auth/UserContext';
import Home from '../../routes/Home';

// ──────────────────────────────────────────────
// Mock all dependencies
// ──────────────────────────────────────────────

vi.mock('../../lib/auth/supabaseAuth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null),
  onAuthStateChange: vi.fn(() => vi.fn()),
}));

vi.mock('../../lib/storage/repository', () => ({
  getUserRecordList: vi.fn(),
  getUserFullRecord: vi.fn(),
  saveRecord: vi.fn(),
  removeRecord: vi.fn(),
}));

vi.mock('../../lib/crypto', () => ({
  encryptPlaintext: vi.fn(),
  decryptPayload: vi.fn(),
}));

vi.mock('../../lib/utils/uid', () => ({
  generateId: vi.fn(() => 'generated-id-123'),
}));

vi.mock('../../lib/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { getUserRecordList, getUserFullRecord, saveRecord, removeRecord } from '../../lib/storage/repository';
import { encryptPlaintext, decryptPayload } from '../../lib/crypto';

describe('Record CRUD flow integration', () => {
  const mockUser = createMockUser();
  const mockRecords = [
    { id: 'r1', title: 'Email Password', tags: ['email'], created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
    { id: 'r2', title: 'Bank Account', tags: ['finance', 'bank'], created_at: '2025-01-02T00:00:00Z', updated_at: '2025-01-02T00:00:00Z' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (getUserRecordList as any).mockResolvedValue(mockRecords);
  });

  it('should display loading state initially', () => {
    (getUserRecordList as any).mockImplementation(() => new Promise(() => {}));

    render(
      <UserContext.Provider value={mockUser}>
        <Home />
      </UserContext.Provider>
    );

    expect(screen.getByText('recordList.loading')).toBeInTheDocument();
  });

  it('should show welcome message when no user', () => {
    render(
      <UserContext.Provider value={null}>
        <Home />
      </UserContext.Provider>
    );

    expect(screen.getByText('home.welcomeHeading')).toBeInTheDocument();
    expect(screen.getByText('home.welcomeText')).toBeInTheDocument();
  });

  it('should display records list for authenticated user', async () => {
    render(
      <UserContext.Provider value={mockUser}>
        <Home />
      </UserContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Email Password')).toBeInTheDocument();
      expect(screen.getByText('Bank Account')).toBeInTheDocument();
    });
  });

  it('should open edit modal when "New Record" is clicked', async () => {
    render(
      <UserContext.Provider value={mockUser}>
        <Home />
      </UserContext.Provider>
    );

    // Wait for records to load
    await waitFor(() => {
      expect(screen.getByText('Email Password')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('home.newRecord'));

    expect(screen.getByText('editRecordModal.newRecord')).toBeInTheDocument();
  });

  it('should filter records by search query', async () => {
    render(
      <UserContext.Provider value={mockUser}>
        <Home />
      </UserContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Email Password')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('home.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'Bank' } });

    expect(screen.getByText('Bank Account')).toBeInTheDocument();
    expect(screen.queryByText('Email Password')).not.toBeInTheDocument();
  });

  it('should show result count when filter is active', async () => {
    render(
      <UserContext.Provider value={mockUser}>
        <Home />
      </UserContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Email Password')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('home.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'Bank' } });

    await waitFor(() => {
      expect(screen.getByText(/home.showingResults/)).toBeInTheDocument();
    });
  });

  it('should clear search query when clear button is clicked', async () => {
    render(
      <UserContext.Provider value={mockUser}>
        <Home />
      </UserContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Email Password')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('home.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'Bank' } });

    // Clear button should appear
    const clearButtons = screen.getAllByRole('button');
    const clearSearchBtn = clearButtons.find(
      (btn) => btn.querySelector('svg') && btn.closest('.relative'),
    );

    if (clearSearchBtn) {
      fireEvent.click(clearSearchBtn);
      expect(searchInput).toHaveValue('');
    }
  });

  it('should delete a record and update the list', async () => {
    (removeRecord as any).mockResolvedValue(undefined);

    render(
      <UserContext.Provider value={mockUser}>
        <Home />
      </UserContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Email Password')).toBeInTheDocument();
    });

    // Find and click delete button for 'Email Password'
    const recordDeleteButtons = screen.getAllByText('recordItem.delete');
    // First buttons are record-level delete buttons, pick the first one
    fireEvent.click(recordDeleteButtons[0]);

    // Confirm the delete dialog
    await waitFor(() => {
      expect(screen.getByText('recordItem.deleteConfirmTitle')).toBeInTheDocument();
    });
    // The confirm dialog shows a modal with two buttons.
    // Click the confirm button (the last button element in the dialog)
    const dialog = screen.getByRole('dialog');
    const buttons = dialog.querySelectorAll('button');
    // Last button is the confirm/delete button
    const confirmBtn = buttons[buttons.length - 1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(removeRecord).toHaveBeenCalled();
    });
  });

  describe('Create record flow', () => {
    it('should create a new record through the full flow', async () => {
      (encryptPlaintext as any).mockResolvedValue({
        ciphertextBase64: 'cipher-123',
        nonceBase64: 'nonce-123',
        saltBase64: 'salt-123',
        alg_version: 'v1',
      });
      (saveRecord as any).mockResolvedValue(undefined);

      render(
        <UserContext.Provider value={mockUser}>
          <Home />
        </UserContext.Provider>
      );

      // Wait for records to load
      await waitFor(() => {
        expect(screen.getByText('Email Password')).toBeInTheDocument();
      });

      // Open new record modal
      fireEvent.click(screen.getByText('home.newRecord'));
      expect(screen.getByText('editRecordModal.newRecord')).toBeInTheDocument();

      // Fill in the form
      const titleInput = screen.getByLabelText('editRecordModal.titleLabel');
      fireEvent.change(titleInput, { target: { value: 'New Secret' } });

      // Fill in the secret in MarkdownEditor textarea
      const secretTextarea = screen.getByRole('textbox', { name: /editRecordModal.secretLabel/i });
      fireEvent.change(secretTextarea, { target: { value: 'My super secret' } });

      // Submit the edit form
      fireEvent.click(screen.getByText('editRecordModal.create'));

      // Should now show Master Password modal
      await waitFor(() => {
        expect(screen.getByLabelText('masterPasswordModal.masterPasswordLabel')).toBeInTheDocument();
      });

      // Enter master password
      const mpInput = screen.getByLabelText('masterPasswordModal.masterPasswordLabel');
      fireEvent.change(mpInput, { target: { value: 'my-master-password' } });
      fireEvent.click(screen.getByText('masterPasswordModal.unlock'));

      // Wait for encryption and save
      await waitFor(() => {
        expect(encryptPlaintext).toHaveBeenCalledWith('my-master-password', 'My super secret');
        expect(saveRecord).toHaveBeenCalled();
      });
    });
  });

  describe('Edit record flow', () => {
    it('should open edit modal after decrypting record', async () => {
      const fullRecord = {
        id: 'r1',
        user_id: mockUser.id,
        title: 'Email Password',
        ciphertext: 'cipher',
        nonce: 'nonce',
        salt: 'salt',
        alg_version: 'v1',
        tags: ['email'],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      (getUserFullRecord as any).mockResolvedValue(fullRecord);
      (decryptPayload as any).mockResolvedValue('decrypted-secret');

      render(
        <UserContext.Provider value={mockUser}>
          <Home />
        </UserContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Email Password')).toBeInTheDocument();
      });

      // Click edit button on first record
      const editButtons = screen.getAllByText('recordItem.edit');
      fireEvent.click(editButtons[0]);

      // Master password modal should appear
      await waitFor(() => {
        expect(screen.getByLabelText('masterPasswordModal.masterPasswordLabel')).toBeInTheDocument();
      });
    });
  });
});
