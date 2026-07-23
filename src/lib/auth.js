/**
 * ==============================================================================
 * SECURITY & AUTHENTICATION UTILITY: auth.js
 * ==============================================================================
 * PURPOSE:
 *  Handles password hashing (bcryptjs), JWT token signing/verification (jose),
 *  and HTTP-Only session cookie management.
 *
 * KEY SECURITY CONCEPTS (Interview Talking Points):
 *  1. HTTP-Only Cookies:
 *     Session tokens are stored in `httpOnly: true` cookies. This makes it impossible
 *     for client-side JavaScript (`document.cookie` or malicious XSS scripts) to read
 *     or steal the JWT session.
 *
 *  2. Edge-Compatible JWT Library (`jose`):
 *     Next.js middleware runs on V8 edge runtimes where Node.js native `crypto` modules
 *     aren't always available. `jose` is a modern, lightweight Web Crypto API standard.
 *
 *  3. Password Salt Rounds:
 *     Bcrypt salt factor of 10 balances cryptographic resistance against brute-force
 *     attacks while maintaining fast response times (~100ms hash time).
 * ==============================================================================
 */

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
  console.error("⚠️  CRITICAL: JWT_SECRET is not set in environment variables.");
}
const encodedKey = new TextEncoder().encode(secretKey ?? "");

/**
 * HASH PASSWORD: Uses bcrypt with salt factor 10.
 */
export async function hashPassword(plainTextPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainTextPassword, salt);
}

/**
 * VERIFY PASSWORD: Compares user plain text password with stored bcrypt hash.
 */
export async function verifyPassword(plainTextPassword, hash) {
  return bcrypt.compare(plainTextPassword, hash);
}

/**
 * SIGN TOKEN: Creates a signed JWT valid for 7 days.
 */
export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

/**
 * VERIFY TOKEN: Decodes and verifies JWT signature. Returns null if invalid or expired.
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, encodedKey);
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * SET SESSION COOKIE: Stores signed JWT in an HTTP-Only secure cookie.
 */
export async function setSessionCookie(userId, username, role) {
  const payload = { id: userId, username, role };
  const token = await signToken(payload);

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,                               // XSS protection
    secure: process.env.NODE_ENV === "production", // Only HTTPS in production
    sameSite: "lax",                              // CSRF protection
    path: "/",
    maxAge: 7 * 24 * 60 * 60,                     // 7 days expiration
  });
}

/**
 * CLEAR SESSION COOKIE: Removes session cookie on logout.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

/**
 * GET SESSION: Reads and verifies session payload from request cookies.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }
  
  return verifyToken(sessionCookie.value);
}
