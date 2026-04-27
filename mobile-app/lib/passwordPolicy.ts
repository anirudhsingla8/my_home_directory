/**
 * Mirror of backend password policy. Keep in sync manually.
 * Backend remains authoritative — this powers the live UI checklist
 * without requiring a roundtrip on every keystroke.
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 && p.length <= 128 },
  { id: "lowercase", label: "Contains a lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "uppercase", label: "Contains an uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "digit", label: "Contains a digit", test: (p) => /\d/.test(p) },
  {
    id: "special",
    label: "Contains a special character",
    test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p)
  }
];

export const isPasswordValid = (password: string): boolean =>
  passwordRules.every((rule) => rule.test(password));
