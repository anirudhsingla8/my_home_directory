/**
 * Standard password policy.
 *
 * Each rule has an id (stable, for UI), a human label, and a test function.
 * `validate` returns the failed rule labels — the controller uses them as
 * the API error message; the UI renders the live checklist using `rules`.
 *
 * Rules:
 *   - At least 8 characters (max 128 to keep bcrypt happy)
 *   - At least one lowercase letter
 *   - At least one uppercase letter
 *   - At least one digit
 *   - At least one special character
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export interface PasswordPolicyResult {
  valid: boolean;
  failedRules: string[];
  message: string | null;
}

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export const passwordRules: PasswordRule[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (p) => p.length >= 8 && p.length <= 128
  },
  {
    id: "lowercase",
    label: "Contains a lowercase letter",
    test: (p) => /[a-z]/.test(p)
  },
  {
    id: "uppercase",
    label: "Contains an uppercase letter",
    test: (p) => /[A-Z]/.test(p)
  },
  {
    id: "digit",
    label: "Contains a digit",
    test: (p) => /\d/.test(p)
  },
  {
    id: "special",
    label: "Contains a special character (!@#$%^&* etc.)",
    test: (p) => SPECIAL_CHARS.test(p)
  }
];

export const validatePassword = (password: string): PasswordPolicyResult => {
  if (typeof password !== "string") {
    return {
      valid: false,
      failedRules: ["length"],
      message: "Password is required."
    };
  }

  const failedRules = passwordRules.filter((rule) => !rule.test(password)).map((r) => r.id);

  if (failedRules.length === 0) {
    return { valid: true, failedRules: [], message: null };
  }

  const failedLabels = passwordRules
    .filter((rule) => failedRules.includes(rule.id))
    .map((r) => r.label);

  return {
    valid: false,
    failedRules,
    message: `Password must satisfy: ${failedLabels.join(", ")}.`
  };
};
