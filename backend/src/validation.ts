export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const phone = value.trim().replace(/[()\s-]/g, "");
  // E.164-ish validation: leading + followed by 8–15 digits, first digit non-zero.
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export function validateLoanInput(input: any): {
  ok: true; friendName: string; amount: number; dueDate: string
} | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Request body is required" };

  if (typeof input.friendName !== "string" || input.friendName.trim().length < 1 || input.friendName.trim().length > 100) {
    return { ok: false, error: "friendName must be 1–100 characters" };
  }

  const amount = typeof input.amount === "number" ? input.amount : Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99 || Math.round(amount * 100) !== amount * 100) {
    return { ok: false, error: "amount must be a positive number with at most 2 decimal places" };
  }

  if (typeof input.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    return { ok: false, error: "dueDate must use YYYY-MM-DD format" };
  }
  const date = new Date(`${input.dueDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.dueDate) {
    return { ok: false, error: "dueDate must be a real calendar date" };
  }

  return { ok: true, friendName: input.friendName.trim(), amount, dueDate: input.dueDate };
}
