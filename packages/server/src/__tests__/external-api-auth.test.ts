import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

// Mock DB before importing module
vi.mock("../db/connection.js", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../config/jwt.js", () => ({
  JWT_SECRET: "test-secret-key",
}));

const { externalApiAuth } = await import("../middleware/external-api-auth.js");
const { db } = await import("../db/connection.js");

function createMockReq(opts: { cookie?: string; authorization?: string } = {}) {
  const headers: Record<string, string | undefined> = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.authorization) headers.authorization = opts.authorization;
  const req = { headers } as unknown as Record<string, unknown>;
  return req;
}

function createMockReply() {
  const reply: Record<string, unknown> = {};
  reply.code = vi.fn().mockReturnValue(reply);
  reply.send = vi.fn().mockReturnValue(reply);
  return reply;
}

describe("externalApiAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no cookie or auth header", async () => {
    const req = createMockReq();
    const reply = createMockReply();

    await externalApiAuth(req as never, reply as never);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("authenticates with valid ext_session cookie", async () => {
    const token = jwt.sign({ dashboardId: 1, slug: "test" }, "test-secret-key");
    const dashboard = { id: 1, slug: "test", accessKey: "abc" };

    vi.mocked(db.select().from(undefined as never).where).mockResolvedValueOnce([dashboard]);

    const req = createMockReq({ cookie: `ext_session=${token}` });
    const reply = createMockReply();

    await externalApiAuth(req as never, reply as never);

    expect(reply.code).not.toHaveBeenCalled();
    expect((req as Record<string, unknown>).dashboard).toEqual(dashboard);
  });

  it("rejects invalid JWT cookie", async () => {
    const req = createMockReq({ cookie: "ext_session=invalid-token" });
    const reply = createMockReply();

    await externalApiAuth(req as never, reply as never);

    expect(reply.code).toHaveBeenCalledWith(401);
  });

  it("authenticates with valid Bearer accessKey", async () => {
    const dashboard = { id: 2, slug: "demo", accessKey: "my-access-key" };

    // First call (cookie path) returns empty, second (accessKey path) returns dashboard
    vi.mocked(db.select().from(undefined as never).where)
      .mockResolvedValueOnce([dashboard]);

    const req = createMockReq({ authorization: "Bearer my-access-key" });
    const reply = createMockReply();

    await externalApiAuth(req as never, reply as never);

    expect(reply.code).not.toHaveBeenCalled();
    expect((req as Record<string, unknown>).dashboard).toEqual(dashboard);
  });

  it("returns 401 for unknown accessKey", async () => {
    vi.mocked(db.select().from(undefined as never).where)
      .mockResolvedValueOnce([]);

    const req = createMockReq({ authorization: "Bearer unknown-key" });
    const reply = createMockReply();

    await externalApiAuth(req as never, reply as never);

    expect(reply.code).toHaveBeenCalledWith(401);
  });
});
