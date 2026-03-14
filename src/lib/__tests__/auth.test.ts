import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(async () => {
  vi.resetModules();
  mockSet.mockReset();
  mockGet.mockReset();
  mockDelete.mockReset();

  const { cookies } = await import("next/headers");
  vi.mocked(cookies).mockResolvedValue({ set: mockSet, get: mockGet, delete: mockDelete } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// createSession

test("sets the auth-token cookie", async () => {
  const { createSession } = await import("@/lib/auth");
  await createSession("user-1", "user@example.com");

  expect(mockSet).toHaveBeenCalledOnce();
  const [cookieName] = mockSet.mock.calls[0];
  expect(cookieName).toBe("auth-token");
});

test("JWT contains correct userId and email", async () => {
  const { createSession } = await import("@/lib/auth");
  await createSession("user-123", "test@example.com");

  const token = mockSet.mock.calls[0][1] as string;
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-123");
  expect(payload.email).toBe("test@example.com");
});

test("JWT expires in approximately 7 days", async () => {
  const before = Date.now();
  const { createSession } = await import("@/lib/auth");
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const token = mockSet.mock.calls[0][1] as string;
  const { payload } = await jwtVerify(token, JWT_SECRET);

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const expMs = (payload.exp as number) * 1000;
  expect(expMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("cookie has correct options in non-production", async () => {
  vi.stubEnv("NODE_ENV", "test");
  const { createSession } = await import("@/lib/auth");
  await createSession("user-1", "user@example.com");

  const options = mockSet.mock.calls[0][2] as Record<string, unknown>;
  expect(options.httpOnly).toBe(true);
  expect(options.secure).toBe(false);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("cookie secure flag is true in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const { createSession } = await import("@/lib/auth");
  await createSession("user-1", "user@example.com");

  const options = mockSet.mock.calls[0][2] as Record<string, unknown>;
  expect(options.secure).toBe(true);
});

test("cookie expires in approximately 7 days", async () => {
  const before = Date.now();
  const { createSession } = await import("@/lib/auth");
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const options = mockSet.mock.calls[0][2] as Record<string, unknown>;
  const expires = options.expires as Date;
  expect(expires).toBeInstanceOf(Date);

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

// getSession

test("getSession returns null when no cookie is present", async () => {
  mockGet.mockReturnValue(undefined);
  const { getSession } = await import("@/lib/auth");

  const result = await getSession();
  expect(result).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  const token = await makeToken({ userId: "user-42", email: "hello@example.com" });
  mockGet.mockReturnValue({ value: token });
  const { getSession } = await import("@/lib/auth");

  const session = await getSession();
  expect(session?.userId).toBe("user-42");
  expect(session?.email).toBe("hello@example.com");
});

test("getSession returns null for a malformed token", async () => {
  mockGet.mockReturnValue({ value: "not.a.valid.jwt" });
  const { getSession } = await import("@/lib/auth");

  const result = await getSession();
  expect(result).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const token = await makeToken(
    { userId: "user-1", email: "user@example.com" },
    "-1s"
  );
  mockGet.mockReturnValue({ value: token });
  const { getSession } = await import("@/lib/auth");

  const result = await getSession();
  expect(result).toBeNull();
});

// deleteSession

test("deleteSession deletes the auth-token cookie", async () => {
  const { deleteSession } = await import("@/lib/auth");
  await deleteSession();

  expect(mockDelete).toHaveBeenCalledOnce();
  expect(mockDelete).toHaveBeenCalledWith("auth-token");
});

// verifySession

function makeRequest(cookieValue: string | undefined) {
  return {
    cookies: {
      get: (_name: string) =>
        cookieValue !== undefined ? { value: cookieValue } : undefined,
    },
  };
}

test("verifySession returns null when no cookie is present", async () => {
  const { verifySession } = await import("@/lib/auth");
  const result = await verifySession(makeRequest(undefined) as never);
  expect(result).toBeNull();
});

test("verifySession returns session payload for a valid token", async () => {
  const token = await makeToken({ userId: "user-99", email: "verify@example.com" });
  const { verifySession } = await import("@/lib/auth");

  const session = await verifySession(makeRequest(token) as never);
  expect(session?.userId).toBe("user-99");
  expect(session?.email).toBe("verify@example.com");
});

test("verifySession returns null for a malformed token", async () => {
  const { verifySession } = await import("@/lib/auth");
  const result = await verifySession(makeRequest("not.a.valid.jwt") as never);
  expect(result).toBeNull();
});

test("verifySession returns null for an expired token", async () => {
  const token = await makeToken(
    { userId: "user-1", email: "user@example.com" },
    "-1s"
  );
  const { verifySession } = await import("@/lib/auth");

  const result = await verifySession(makeRequest(token) as never);
  expect(result).toBeNull();
});
