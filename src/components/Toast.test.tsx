import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/utils';
import Toast from './Toast';

describe('Toast', () => {
  const mockMessages = [
    { id: '1', text: 'Success message', type: 'success' as const },
    { id: '2', text: 'Error message', type: 'error' as const },
    { id: '3', text: 'Info message', type: 'info' as const },
  ];

  it('should render all toast messages', () => {
    render(<Toast messages={mockMessages} onDismiss={vi.fn()} />);

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<Toast messages={mockMessages} onDismiss={onDismiss} />);

    const dismissButtons = screen.getAllByText('✕');
    fireEvent.click(dismissButtons[0]);

    expect(onDismiss).toHaveBeenCalledWith('1');
  });

  it('should render nothing when messages array is empty', () => {
    const { container } = render(<Toast messages={[]} onDismiss={vi.fn()} />);

    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
    expect(container.querySelector('[role="status"]')!.children).toHaveLength(0);
  });

  it('should have role="status" and aria-live="polite"', () => {
    render(<Toast messages={mockMessages} onDismiss={vi.fn()} />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
  });

  it('should have role="alert" on each message span', () => {
    render(<Toast messages={mockMessages} onDismiss={vi.fn()} />);

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(3);
  });
});
