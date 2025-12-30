export type ThrottleCheck =
  | { allowed: true; remainingMs: 0 }
  | { allowed: false; remainingMs: number };

export function createThrottle(waitMs: number) {
  let lastAt: number | null = null;

  return function check(): ThrottleCheck {
    const now = Date.now();

    // Always allow the first call
    if (lastAt === null) {
      lastAt = now;
      return { allowed: true, remainingMs: 0 };
    }

    const elapsed = now - lastAt;

    if (elapsed < waitMs) {
      return { allowed: false, remainingMs: waitMs - elapsed };
    }

    lastAt = now;
    return { allowed: true, remainingMs: 0 };
  };
}
