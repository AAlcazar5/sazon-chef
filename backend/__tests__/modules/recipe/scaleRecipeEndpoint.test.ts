// W-A1b — POST /api/recipes/:id/scale. Controller-level unit test (recipe
// routes are globally mocked in tests/setup.ts; prisma is mocked there too).
// Asserts: deterministic scale result + the scale CookEvent is captured as a
// byproduct, and that a capture failure NEVER denies the user the result.

import { scaleRecipeController } from '../../../src/modules/recipe/scaleRecipeController';
import { prisma } from '../../../src/lib/prisma';

const cookEvent = (prisma as unknown as {
  cookEvent: { create: jest.Mock };
}).cookEvent;

interface FakeRes {
  statusCode: number;
  body: unknown;
  status: jest.Mock;
  json: jest.Mock;
}
const makeRes = (): FakeRes => {
  const res: Partial<FakeRes> = { statusCode: 200 };
  res.status = jest.fn((c: number) => {
    (res as FakeRes).statusCode = c;
    return res;
  });
  res.json = jest.fn((b: unknown) => {
    (res as FakeRes).body = b;
    return res;
  });
  return res as FakeRes;
};
const makeReq = (body: unknown, id = 'r1') =>
  ({ params: { id }, body, user: { id: 'u1' } } as any);

beforeEach(() => {
  cookEvent.create.mockReset();
  cookEvent.create.mockResolvedValue({ id: 'ce1' });
});

describe('scaleRecipeEndpoint', () => {
  const ingredients = [
    { name: 'salmon', amount: 20, unit: 'oz' },
    { name: 'soy sauce', amount: 2, unit: 'tbsp' },
  ];

  it('factor mode: returns scaled ingredients and logs ONE scale CookEvent', async () => {
    const res = makeRes();
    await scaleRecipeController.scaleRecipeEndpoint(
      makeReq({ ingredients, factor: 2 }),
      res as any,
    );
    expect(res.statusCode).toBe(200);
    expect((res.body as any).scaled[0]).toEqual({ name: 'salmon', amount: 40, unit: 'oz' });
    expect(cookEvent.create).toHaveBeenCalledTimes(1);
    const data = cookEvent.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ userId: 'u1', recipeId: 'r1', type: 'scale' });
    expect(JSON.parse(data.payload)).toEqual({ mode: 'factor', factor: 2 });
  });

  it('target mode: scales off a reference ingredient (20oz salmon → 2 lb)', async () => {
    const res = makeRes();
    await scaleRecipeController.scaleRecipeEndpoint(
      makeReq({ ingredients, referenceName: 'salmon', target: { amount: 2, unit: 'lb' } }),
      res as any,
    );
    expect((res.body as any).scaled[0]).toEqual({ name: 'salmon', amount: 32, unit: 'oz' });
    expect(cookEvent.create).toHaveBeenCalledTimes(1);
  });

  it('400 when neither factor nor referenceName/target provided', async () => {
    const res = makeRes();
    await scaleRecipeController.scaleRecipeEndpoint(makeReq({ ingredients }), res as any);
    expect(res.statusCode).toBe(400);
    expect(cookEvent.create).not.toHaveBeenCalled();
  });

  it('400 on empty ingredients', async () => {
    const res = makeRes();
    await scaleRecipeController.scaleRecipeEndpoint(makeReq({ ingredients: [], factor: 2 }), res as any);
    expect(res.statusCode).toBe(400);
  });

  it('400 on a bad factor (scale util throws — surfaced, not swallowed)', async () => {
    const res = makeRes();
    await scaleRecipeController.scaleRecipeEndpoint(
      makeReq({ ingredients, factor: -1 }),
      res as any,
    );
    expect(res.statusCode).toBe(400);
  });

  it('capture failure is non-blocking: user still gets the scaled result (byproduct law)', async () => {
    cookEvent.create.mockRejectedValueOnce(new Error('db down'));
    const res = makeRes();
    await scaleRecipeController.scaleRecipeEndpoint(
      makeReq({ ingredients, factor: 3 }),
      res as any,
    );
    expect(res.statusCode).toBe(200);
    expect((res.body as any).scaled[1]).toEqual({ name: 'soy sauce', amount: 6, unit: 'tbsp' });
  });
});
