import crypto from "crypto";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Gender, Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { sendEmail } from "../lib/email";
import { getStringValue } from "../utils/helpers";
import { validatePassword } from "../validators/passwordPolicy";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_INITIAL_COOLDOWN_SECONDS = 30;
const OTP_MAX_COOLDOWN_SECONDS = 300;

/**
 * Cooldown seconds for the next allowed resend, given the previous resend count.
 * Doubles each time, capped at 5 min.
 *   resendCount=0 → 30s   (after first send)
 *   resendCount=1 → 60s
 *   resendCount=2 → 120s
 *   resendCount=3 → 240s
 *   resendCount=4+ → 300s (capped)
 */
const computeCooldownSeconds = (resendCount: number): number => {
  const seconds = OTP_INITIAL_COOLDOWN_SECONDS * Math.pow(2, Math.max(0, resendCount));
  return Math.min(seconds, OTP_MAX_COOLDOWN_SECONDS);
};

const log = logger.child("auth");

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not configured.");
  }
  return secret;
};

const userPublicFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  gender: true,
  dateOfBirth: true
} satisfies Prisma.UserSelect;

const parseGender = (raw: string | undefined): Gender | null | undefined => {
  if (raw === undefined) return undefined;
  if (raw === "" || raw === null) return null;
  const upper = raw.toUpperCase();
  const valid: Gender[] = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];
  if ((valid as string[]).includes(upper)) return upper as Gender;
  return undefined;
};

const parseDateOfBirth = (raw: string | undefined): Date | null | undefined => {
  if (raw === undefined) return undefined;
  if (raw === "" || raw === null) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  // Reject dates in the future or absurdly old
  const now = new Date();
  if (parsed.getTime() > now.getTime()) return undefined;
  if (parsed.getFullYear() < 1900) return undefined;
  return parsed;
};

const issueToken = (user: { id: string; email: string; role: string }): string =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, getJwtSecret(), {
    expiresIn: "7d"
  });

export const signup = async (req: Request, res: Response): Promise<Response> => {
  try {
    const email = getStringValue(req.body.email);
    const password = getStringValue(req.body.password);
    const name = getStringValue(req.body.name);

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        message: passwordCheck.message,
        failedRules: passwordCheck.failedRules
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
      select: userPublicFields
    });

    log.info("User signed up", { userId: user.id, email: user.email });

    const token = issueToken({ id: user.id, email: user.email, role: user.role });

    return res.status(201).json({ token, user });
  } catch (error) {
    log.error("Signup failed", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: "Failed to create user." });
  }
};

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const email = getStringValue(req.body.email);
    const password = getStringValue(req.body.password);

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      log.warn("Failed login attempt", { email });
      return res.status(401).json({ message: "Invalid email or password." });
    }

    log.info("User logged in", { userId: user.id, email: user.email });

    const token = issueToken({ id: user.id, email: user.email, role: user.role });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth
      }
    });
  } catch (error) {
    log.error("Login failed", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: "Failed to log in." });
  }
};

export const getMe = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userPublicFields
    });
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ user });
  } catch (error) {
    log.error("Failed to fetch current user", {
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(500).json({ message: "Failed to fetch profile." });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const data: Prisma.UserUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const name = getStringValue(req.body.name);
      data.name = name ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "gender")) {
      const raw = req.body.gender;
      const gender = parseGender(typeof raw === "string" ? raw : undefined);
      if (gender === undefined) {
        return res.status(400).json({ message: "Invalid gender value." });
      }
      data.gender = gender;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "dateOfBirth")) {
      const raw = req.body.dateOfBirth;
      const dob = parseDateOfBirth(typeof raw === "string" ? raw : undefined);
      if (dob === undefined) {
        return res.status(400).json({ message: "Invalid date of birth." });
      }
      data.dateOfBirth = dob;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "No fields to update." });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: userPublicFields
    });

    log.info("Profile updated", { userId, fields: Object.keys(data) });
    return res.status(200).json({ user });
  } catch (error) {
    log.error("Profile update failed", {
      userId: req.user?.id,
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(500).json({ message: "Failed to update profile." });
  }
};

const generateOtp = (): string => {
  // Cryptographically random 6-digit numeric code, zero-padded.
  const max = 10 ** OTP_LENGTH;
  const num = crypto.randomInt(0, max);
  return num.toString().padStart(OTP_LENGTH, "0");
};

const buildOtpEmail = (otp: string, userName: string | null) => {
  const greeting = userName ? `Hi ${userName},` : "Hi,";
  const ttlText = `${OTP_TTL_MINUTES} minutes`;
  const text = `${greeting}\n\nYour Home Inventory password reset code is: ${otp}\n\nThis code expires in ${ttlText}. If you didn't request this, you can safely ignore this email.\n`;
  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#0f172a;"><h2 style="margin:0 0 12px;">Reset your password</h2><p style="margin:0 0 16px;color:#475569;">${greeting}</p><p style="margin:0 0 16px;color:#475569;">Use the code below to reset your password. It expires in ${ttlText}.</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:16px;background:#f1f5f9;border-radius:12px;text-align:center;margin:16px 0;">${otp}</div><p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">If you didn't request this, you can safely ignore this email.</p></div>`;
  return { text, html };
};

/**
 * POST /auth/forgot-password
 *
 * Always returns 200 (or 429 when throttled) with the same response shape so
 * attackers cannot probe the email database. Response includes
 * `resendAvailableAt` so the client can drive its countdown UI.
 */
export const forgotPassword = async (req: Request, res: Response): Promise<Response> => {
  const message = "If an account exists for that email, a reset code has been sent.";

  try {
    const email = getStringValue(req.body.email)?.toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true }
    });

    // For unknown emails we simulate a cooldown so the response shape is
    // identical to a successful request — prevents enumeration via timing.
    if (!user) {
      const resendAvailableAt = new Date(
        Date.now() + OTP_INITIAL_COOLDOWN_SECONDS * 1000
      ).toISOString();
      log.info("Forgot-password requested for unknown email", { email });
      return res.status(200).json({ message, resendAvailableAt });
    }

    // Look at the most recent valid (un-consumed, un-expired) OTP.
    const existing = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (existing) {
      const cooldownEndMs =
        existing.createdAt.getTime() + computeCooldownSeconds(existing.resendCount) * 1000;
      if (Date.now() < cooldownEndMs) {
        // Still cooling down — don't send another email, return the existing
        // window so the client can finish its countdown.
        return res.status(429).json({
          message: "Please wait before requesting another code.",
          resendAvailableAt: new Date(cooldownEndMs).toISOString()
        });
      }
    }

    // OK to send. Compute next resend count.
    const nextResendCount = existing ? existing.resendCount + 1 : 0;

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // Replace any existing un-consumed OTPs (expired or not) with the fresh one.
    await prisma.passwordResetOtp.deleteMany({
      where: { userId: user.id, consumedAt: null }
    });

    const fresh = await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
        resendCount: nextResendCount
      }
    });

    const { text, html } = buildOtpEmail(otp, user.name);

    try {
      await sendEmail({
        to: user.email,
        subject: "Your Home Inventory password reset code",
        text,
        html
      });
      log.info("Password reset OTP issued", {
        userId: user.id,
        resendCount: fresh.resendCount
      });
    } catch (sendErr) {
      log.error("Failed to send password reset email", {
        userId: user.id,
        error: sendErr instanceof Error ? sendErr.message : String(sendErr)
      });
    }

    const resendAvailableAt = new Date(
      fresh.createdAt.getTime() + computeCooldownSeconds(fresh.resendCount) * 1000
    ).toISOString();

    return res.status(200).json({ message, resendAvailableAt });
  } catch (error) {
    log.error("Forgot-password failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    const resendAvailableAt = new Date(
      Date.now() + OTP_INITIAL_COOLDOWN_SECONDS * 1000
    ).toISOString();
    return res.status(200).json({ message, resendAvailableAt });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const email = getStringValue(req.body.email)?.toLowerCase();
    const otp = getStringValue(req.body.otp);
    const newPassword = getStringValue(req.body.newPassword);

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "email, otp and newPassword are required." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: "desc" }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }

    if (otpRecord.expiresAt.getTime() < Date.now()) {
      await prisma.passwordResetOtp.delete({ where: { id: otpRecord.id } });
      return res.status(400).json({ message: "Reset code has expired. Request a new one." });
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.passwordResetOtp.delete({ where: { id: otpRecord.id } });
      return res.status(429).json({
        message: "Too many incorrect attempts. Request a new reset code."
      });
    }

    const matches = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!matches) {
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } }
      });
      log.warn("Password reset failed — wrong OTP", { userId: user.id });
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }

    const policyCheck = validatePassword(newPassword);
    if (!policyCheck.valid) {
      return res.status(400).json({
        message: policyCheck.message,
        failedRules: policyCheck.failedRules
      });
    }

    // Optional: prevent reusing the previous password.
    const sameAsOld = await bcrypt.compare(newPassword, user.password);
    if (sameAsOld) {
      return res.status(400).json({
        message: "New password must be different from the current one."
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
      prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() }
      }),
      // Burn any other un-consumed OTPs for this user, just in case.
      prisma.passwordResetOtp.deleteMany({
        where: { userId: user.id, consumedAt: null, id: { not: otpRecord.id } }
      })
    ]);

    log.info("Password reset via OTP", { userId: user.id });
    return res.status(200).json({ message: "Password has been reset. You can sign in now." });
  } catch (error) {
    log.error("Reset password failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(500).json({ message: "Failed to reset password." });
  }
};

export const updatePassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const currentPassword = getStringValue(req.body.currentPassword);
    const newPassword = getStringValue(req.body.newPassword);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Both currentPassword and newPassword are required."
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found." });

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      log.warn("Password update rejected — wrong current password", { userId });
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from the current one."
      });
    }

    const policyCheck = validatePassword(newPassword);
    if (!policyCheck.valid) {
      return res.status(400).json({
        message: policyCheck.message,
        failedRules: policyCheck.failedRules
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed }
    });

    log.info("Password updated", { userId });
    return res.status(200).json({ message: "Password updated." });
  } catch (error) {
    log.error("Password update failed", {
      userId: req.user?.id,
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(500).json({ message: "Failed to update password." });
  }
};
