let clearTimeoutId: ReturnType<typeof setTimeout> | null = null;

export async function copyToClipboard(text: string, clearAfterMs: number = 60000): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  // Clear clipboard after timeout
  if (clearTimeoutId) {
    clearTimeout(clearTimeoutId);
  }
  clearTimeoutId = setTimeout(async () => {
    try {
      await navigator.clipboard.writeText('');
    } catch {
      // Ignore errors on clear
    }
    clearTimeoutId = null;
  }, clearAfterMs);
}
