import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import EditRecordModal from './EditRecordModal';

describe('EditRecordModal', () => {
  const defaultProps = {
    title: '',
    secret: '',
    tags: [],
    onSave: vi.fn(),
    onCancel: vi.fn(),
    mode: 'create' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render in create mode with empty fields', () => {
    render(<EditRecordModal {...defaultProps} />);

    expect(screen.getByText('editRecordModal.newRecord')).toBeInTheDocument();
    expect(screen.getByLabelText('editRecordModal.titleLabel')).toHaveValue('');
    expect(screen.getByText('editRecordModal.create')).toBeInTheDocument();
  });

  it('should render in edit mode with pre-filled fields', () => {
    render(
      <EditRecordModal
        {...defaultProps}
        title="Existing Title"
        secret="Existing Secret"
        tags={['tag1', 'tag2']}
        mode="edit"
      />,
    );

    expect(screen.getByText('editRecordModal.editRecord')).toBeInTheDocument();
    expect(screen.getByText('editRecordModal.save')).toBeInTheDocument();
    // Tags should be rendered
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('should call onSave with title and secret when form is submitted', async () => {
    defaultProps.onSave.mockResolvedValue(undefined);

    render(<EditRecordModal {...defaultProps} />);

    const titleInput = screen.getByLabelText('editRecordModal.titleLabel');
    fireEvent.change(titleInput, { target: { value: 'My Record' } });

    // The secret is in a MarkdownEditor — get the textarea by its id
    const secretTextarea = screen.getByRole('textbox', { name: /editRecordModal.secretLabel/i });
    fireEvent.change(secretTextarea, { target: { value: 'My Secret' } });

    fireEvent.click(screen.getByText('editRecordModal.create'));

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith('My Record', 'My Secret', []);
    });
  });

  it('should show error when title is empty', async () => {
    render(<EditRecordModal {...defaultProps} />);

    fireEvent.click(screen.getByText('editRecordModal.create'));

    await waitFor(() => {
      expect(screen.getByText('editRecordModal.errorTitleRequired')).toBeInTheDocument();
    });
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('should call onCancel when cancel is clicked', () => {
    render(<EditRecordModal {...defaultProps} />);

    fireEvent.click(screen.getByText('editRecordModal.cancel'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('should add a tag when Enter is pressed', () => {
    render(<EditRecordModal {...defaultProps} />);

    const tagInput = screen.getByPlaceholderText('editRecordModal.tagsPlaceholder');
    fireEvent.change(tagInput, { target: { value: 'new-tag' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    expect(screen.getByText('new-tag')).toBeInTheDocument();
  });

  it('should remove a tag when its remove button is clicked', () => {
    render(
      <EditRecordModal
        {...defaultProps}
        tags={['tag1', 'tag2']}
      />,
    );

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();

    const removeButtons = screen.getAllByText('×');
    fireEvent.click(removeButtons[0]);

    expect(screen.queryByText('tag1')).not.toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('should show error when onSave throws', async () => {
    defaultProps.onSave.mockRejectedValue(new Error('Save failed'));

    render(<EditRecordModal {...defaultProps} />);

    const titleInput = screen.getByLabelText('editRecordModal.titleLabel');
    fireEvent.change(titleInput, { target: { value: 'Title' } });

    const secretTextarea = screen.getByRole('textbox', { name: /editRecordModal.secretLabel/i });
    fireEvent.change(secretTextarea, { target: { value: 'Secret' } });

    fireEvent.click(screen.getByText('editRecordModal.create'));

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  it('should be a modal dialog with proper ARIA attributes', () => {
    render(<EditRecordModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('should disable inputs while saving', async () => {
    // Never resolve the save promise
    defaultProps.onSave.mockImplementation(() => new Promise(() => {}));

    render(<EditRecordModal {...defaultProps} />);

    const titleInput = screen.getByLabelText('editRecordModal.titleLabel');
    fireEvent.change(titleInput, { target: { value: 'Title' } });

    const secretTextarea = screen.getByRole('textbox', { name: /editRecordModal.secretLabel/i });
    fireEvent.change(secretTextarea, { target: { value: 'Secret' } });

    fireEvent.click(screen.getByText('editRecordModal.create'));

    await waitFor(() => {
      expect(screen.getByText('editRecordModal.saving')).toBeInTheDocument();
    });

    // The cancel button should also be disabled while saving
    expect(screen.getByText('editRecordModal.cancel')).toBeDisabled();
  });
});
