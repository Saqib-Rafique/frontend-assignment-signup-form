export type Debounced<Args extends readonly unknown[]> = ((
  ...args: Args
) => void) & {
  cancel: () => void;
};

export function debounce<Args extends readonly unknown[], R>(
  fn: (...args: Args) => R,
  delayMs: number
): Debounced<Args> {
  let timer: number | undefined;

  const debounced = ((...args: Args) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      // Supports sync + async; ignore return value intentionally
      void fn(...args);
    }, delayMs);
  }) as Debounced<Args>;

  debounced.cancel = () => {
    if (timer) window.clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
