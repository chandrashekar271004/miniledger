import { describe, expect, it } from "vitest";
import { normalizePhone, validateLoanInput } from "./validation";

describe("normalizePhone", () => {
  it("normalizes spacing and accepts international format", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("+919876543210");
  });
  it("rejects a local number without country code", () => {
    expect(normalizePhone("9876543210")).toBeNull();
  });
});

describe("validateLoanInput", () => {
  it("accepts a valid loan", () => {
    expect(validateLoanInput({ friendName: " Asha ", amount: 125.5, dueDate: "2026-11-01" })).toEqual({
      ok: true, friendName: "Asha", amount: 125.5, dueDate: "2026-11-01"
    });
  });
  it("rejects a zero amount", () => {
    expect(validateLoanInput({ friendName: "Asha", amount: 0, dueDate: "2026-11-01" }).ok).toBe(false);
  });
  it("rejects impossible dates", () => {
    expect(validateLoanInput({ friendName: "Asha", amount: 10, dueDate: "2026-02-31" }).ok).toBe(false);
  });
});
