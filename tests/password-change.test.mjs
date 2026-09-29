import assert from "node:assert/strict";
import test from "node:test";
import { passwordChangeSchema } from "../lib/validation.ts";

const validInput = {
  email: "employee@example.com",
  currentPassword: "OldPassword123",
  newPassword: "NewPassword456",
  confirmPassword: "NewPassword456"
};

test("accepts a valid password change request", () => {
  assert.equal(passwordChangeSchema.safeParse(validInput).success, true);
});

test("rejects a mismatched confirmation", () => {
  const result = passwordChangeSchema.safeParse({ ...validInput, confirmPassword: "Different789" });

  assert.equal(result.success, false);
});

test("rejects reusing the current password", () => {
  const result = passwordChangeSchema.safeParse({
    ...validInput,
    newPassword: validInput.currentPassword,
    confirmPassword: validInput.currentPassword
  });

  assert.equal(result.success, false);
});
