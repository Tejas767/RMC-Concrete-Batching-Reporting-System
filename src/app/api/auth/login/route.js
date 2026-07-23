/**
 * ==============================================================================
 * API ROUTE: /api/auth/login
 * ==============================================================================
 * Method: POST
 *
 * PURPOSE:
 *  Authenticates a user with username + password credentials.
 *  Enforces rate-limiting, account active check, subscription expiration logic,
 *  and establishes an HTTP-Only JWT session cookie upon success.
 *
 * KEY SECURITY CONCEPTS (Interview Talking Points):
 *  1. In-Memory Rate Limiting:
 *     Prevents credential brute-force attacks by tracking IP login attempts.
 *     Limits requests to max 10 attempts per 15-minute sliding window (HTTP 429).
 *
 *  2. Subscription Expiry Enforcement:
 *     Operator accounts automatically calculate their expiration date (`user.expiresAt`).
 *     If the subscription has expired, the server updates `isActive = false` in MongoDB
 *     and rejects access (HTTP 403). Admin accounts never expire.
 * ==============================================================================
 */

import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ──────────────────────────────────────────────────────────────────────────────
// In-Memory Sliding Window Rate Limiter (IP Based)
// ──────────────────────────────────────────────────────────────────────────────
const loginAttempts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes window
  const maxAttempts = 10;

  const record = loginAttempts.get(ip);

  // If no previous record or sliding window expired, start fresh tracking
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  // If max attempts exceeded within current window, block request
  if (record.count >= maxAttempts) return true;

  record.count++;
  loginAttempts.set(ip, record);
  return false;
}

// Garbage collection timer to clear expired rate limit entries every 30 mins
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of loginAttempts) {
    if (now > val.resetAt) loginAttempts.delete(key);
  }
}, 30 * 60 * 1000);

// ==============================================================================
// POST HANDLER — Authenticate Credentials & Issue Cookie
// ==============================================================================
export async function POST(request) {
  // 1. Rate Limit Check
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (checkRateLimit(ip)) {
    return Response.json(
      { error: "Too many login attempts. Please wait 15 minutes." },
      { status: 429 }
    );
  }

  try {
    await connectDB();

    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ error: "Username and password are required" }, { status: 400 });
    }

    // 2. Query user from MongoDB
    const user = await User.findOne({ username: username.trim() });

    if (!user) {
      return Response.json({ error: "Username not found" }, { status: 401 });
    }

    // 3. Verify active status
    if (!user.isActive) {
      return Response.json({ error: "Your account has been disabled. Contact admin." }, { status: 403 });
    }

    // 4. Verify subscription expiration (operators only)
    if (user.role === "operator" && user.expiresAt && new Date() > user.expiresAt) {
      await User.findByIdAndUpdate(user._id, { isActive: false });
      return Response.json(
        { error: "Your subscription has expired. Contact admin to renew." },
        { status: 403 }
      );
    }

    // 5. Compare plain text password against stored bcrypt hash
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return Response.json({ error: "Incorrect password" }, { status: 401 });
    }

    // 6. Set HTTP-Only session cookie
    await setSessionCookie(user._id.toString(), user.username, user.role);

    return Response.json({
      data: {
        id:            user._id,
        username:      user.username,
        displayName:   user.displayName || user.username,
        role:          user.role,
        daysRemaining: user.daysRemaining,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
