import { db } from "@/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production",
);
const SESSION_COOKIE_NAME = "session_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export interface SessionPayload {
  userId: number;
  username: string;
  role: string;
  email: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Create JWT token
export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Extract and validate the payload
    const sessionPayload: SessionPayload = {
      userId: Number(payload.userId),
      username: String(payload.username),
      role: String(payload.role),
      email: String(payload.email),
    };

    return sessionPayload;
  } catch (error) {
    return null;
  }
}

// Get current session from cookies
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
  const session = await getCurrentSession();
  return session?.role === "admin";
}

// Check if user is moderator or admin
export async function isModeratorOrAdmin(): Promise<boolean> {
  const session = await getCurrentSession();
  return session?.role === "admin" || session?.role === "moderator";
}

// Login user
export async function loginUser(
  credentials: LoginCredentials,
): Promise<{ success: boolean; user?: SessionPayload; error?: string }> {
  try {
    // Find user by username or email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, credentials.username))
      .limit(1);

    if (!user[0]) {
      return { success: false, error: "Invalid credentials" };
    }

    // Check if user is active
    if (!user[0].isActive) {
      return { success: false, error: "Account is deactivated" };
    }

    // Verify password
    const isValidPassword = await verifyPassword(
      credentials.password,
      user[0].passwordHash,
    );

    if (!isValidPassword) {
      return { success: false, error: "Invalid credentials" };
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user[0].id));

    // Create session payload
    const sessionPayload: SessionPayload = {
      userId: user[0].id,
      username: user[0].username,
      role: user[0].role,
      email: user[0].email,
    };

    return { success: true, user: sessionPayload };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Internal server error" };
  }
}

// Register new user
export async function registerUser(
  data: RegisterData,
): Promise<{ success: boolean; user?: SessionPayload; error?: string }> {
  try {
    // Check if username already exists
    const existingUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, data.username))
      .limit(1);

    if (existingUsername[0]) {
      return { success: false, error: "Username already exists" };
    }

    // Check if email already exists
    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingEmail[0]) {
      return { success: false, error: "Email already exists" };
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user (default role is 'user' unless specified)
    const newUser = await db
      .insert(users)
      .values({
        username: data.username,
        email: data.email,
        passwordHash,
        role: data.role || "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create session payload
    const sessionPayload: SessionPayload = {
      userId: newUser[0].id,
      username: newUser[0].username,
      role: newUser[0].role,
      email: newUser[0].email,
    };

    return { success: true, user: sessionPayload };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "Internal server error" };
  }
}

// Set session cookie
export async function setSessionCookie(
  sessionPayload: SessionPayload,
): Promise<void> {
  const token = await createSessionToken(sessionPayload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

// Clear session cookie (logout)
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Create admin user (for initial setup)
export async function createAdminUser(
  username: string,
  email: string,
  password: string,
): Promise<boolean> {
  try {
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (existingAdmin[0]) {
      console.log("Admin user already exists");
      return false;
    }

    // Create admin user
    await registerUser({
      username,
      email,
      password,
      role: "admin",
    });

    console.log("Admin user created successfully");
    return true;
  } catch (error) {
    console.error("Error creating admin user:", error);
    return false;
  }
}
