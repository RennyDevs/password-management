let clearTimeoutId: ReturnType<typeof setTimeout> | null = null;

/** Maximum number of attempts to clear the clipboard. */
const MAX_CLEAR_RETRIES = 3;

/** Base delay (ms) between clear retries — doubles each attempt. */
const CLEAR_RETRY_BASE_MS = 500;

/**
 * Copy text to the clipboard and schedule an automatic clear after
 * `clearAfterMs`.
 *
 * If the deferred clear fails, it retries up to {@link MAX_CLEAR_RETRIES}
 * times with exponential backoff.  When `onClearFail` is supplied and all
 * retries are exhausted, it is called with a human-readable error message.
 *
 * @param text           The secret to copy.
 * @param clearAfterMs   Milliseconds before the clipboard is wiped (default 60s).
 * @param onClearFail    Optional callback invoked when the auto-clear fails
 *                       after all retries.
 */
export async function copyToClipboard(
  text: string,
  clearAfterMs: number = 60000,
  onClearFail?: (error: string) => void,
): Promise<void> {
  // --- 1. Write the secret ---
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers / insecure contexts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  // --- 2. Schedule deferred clear with retries ---
  if (clearTimeoutId) {
    clearTimeout(clearTimeoutId);
  }

  clearTimeoutId = setTimeout(async () => {
    let lastError: string | undefined;

    for (let attempt = 0; attempt < MAX_CLEAR_RETRIES; attempt++) {
      try {
        await navigator.clipboard.writeText('');
        clearTimeoutId = null;
        return; // success
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < MAX_CLEAR_RETRIES - 1) {
          await new Promise((r) =>
            setTimeout(r, CLEAR_RETRY_BASE_MS * Math.pow(2, attempt)),
          );
        }
      }
    }

    clearTimeoutId = null;
    onClearFail?.(lastError ?? 'Unknown error clearing clipboard');
  }, clearAfterMs);
}
