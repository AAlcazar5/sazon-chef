// backend/tests/middleware/requireEmailVerified.test.ts
// Tier L H3 — middleware-level email-verification gate.

import { requireEmailVerified } from '../../src/middleware/requireEmailVerified';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

function mockReqRes(userId: string | undefined = 'user1') {
  const req: any = { user: userId ? { id: userId } : undefined };
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('requireEmailVerified middleware', () => {
  const originalFlag = process.env.REQUIRE_EMAIL_VERIFICATION;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalFlag === undefined) delete process.env.REQUIRE_EMAIL_VERIFICATION;
    else process.env.REQUIRE_EMAIL_VERIFICATION = originalFlag;
  });

  it('is a no-op when REQUIRE_EMAIL_VERIFICATION is unset', async () => {
    delete process.env.REQUIRE_EMAIL_VERIFICATION;
    const { req, res, next } = mockReqRes();
    await requireEmailVerified(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('blocks unverified user with 403 EMAIL_NOT_VERIFIED when flag=true', async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
    mockPrisma.user.findUnique.mockResolvedValue({ emailVerified: false });
    const { req, res, next } = mockReqRes();
    await requireEmailVerified(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'EMAIL_NOT_VERIFIED' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('lets verified user through when flag=true', async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
    mockPrisma.user.findUnique.mockResolvedValue({ emailVerified: true });
    const { req, res, next } = mockReqRes();
    await requireEmailVerified(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when no user is on the request', async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
    const req: any = { user: undefined };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const next = jest.fn();
    await requireEmailVerified(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts the "1" alias for the env flag', async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = '1';
    mockPrisma.user.findUnique.mockResolvedValue({ emailVerified: false });
    const { req, res, next } = mockReqRes();
    await requireEmailVerified(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
