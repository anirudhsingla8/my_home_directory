import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not configured.");
  }
  return secret;
};

const getStringValue = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return undefined;
};

export const signup = async (req: Request, res: Response): Promise<Response> => {
  try {
    const email = getStringValue(req.body.email);
    const password = getStringValue(req.body.password);
    const name = getStringValue(req.body.name);

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
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

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Failed to log in." });
  }
};
