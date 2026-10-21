import { describe, expect, it } from "vitest";

describe("Registration validation logic", () => {
  it("distinguishes email identifiers from mobile numbers correctly", () => {
    const isEmail = (id: string) => id.includes("@");

    expect(isEmail("newuser@example.com")).toBe(true);
    expect(isEmail("9876543210")).toBe(false);
  });

  it("validates 6-digit verification code format", () => {
    const isValidCode = (code: string) => /^\d{6}$/.test(code.trim());

    expect(isValidCode("123456")).toBe(true);
    expect(isValidCode("12345")).toBe(false);
    expect(isValidCode("1234567")).toBe(false);
    expect(isValidCode("abcdef")).toBe(false);
  });
});
