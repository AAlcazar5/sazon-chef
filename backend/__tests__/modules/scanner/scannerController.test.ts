// backend/__tests__/modules/scanner/scannerController.test.ts
// Coverage push 2026-05-04 — modules/scanner had 0% unit-test coverage
// (only the integration test exercised it). Targets the controller's
// status-code branching for both endpoints.

import { Request, Response } from 'express';

const mockRecognizeFoodFromPhoto = jest.fn();
const mockScanBarcode = jest.fn();

jest.mock('../../../src/services/foodRecognitionService', () => {
  class FoodRecognitionError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'FoodRecognitionError';
      this.code = code;
    }
  }
  return {
    foodRecognitionService: {
      recognizeFoodFromPhoto: (...args: unknown[]) => mockRecognizeFoodFromPhoto(...args),
      scanBarcode: (...args: unknown[]) => mockScanBarcode(...args),
    },
    FoodRecognitionError,
  };
});

jest.mock('../../../src/utils/authHelper', () => ({
  getUserId: jest.fn(() => 'test-user-id'),
}));

import { scannerController } from '../../../src/modules/scanner/scannerController';
import { FoodRecognitionError } from '../../../src/services/foodRecognitionService';

function buildReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    file: undefined,
    ...overrides,
  } as unknown as Request;
}

function buildRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response & { status: jest.Mock; json: jest.Mock };
}

describe('scannerController.recognizeFood', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when req.file is missing', async () => {
    const req = buildReq();
    const res = buildRes();
    await scannerController.recognizeFood(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No image file provided' });
    expect(mockRecognizeFoodFromPhoto).not.toHaveBeenCalled();
  });

  it('returns the recognition result on success', async () => {
    const req = buildReq({
      file: {
        buffer: Buffer.from('img'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File,
    });
    const res = buildRes();
    mockRecognizeFoodFromPhoto.mockResolvedValueOnce({
      foods: [{ name: 'apple' }],
      mealDescription: 'apple',
      totalEstimatedCalories: 95,
    });

    await scannerController.recognizeFood(req, res);

    expect(mockRecognizeFoodFromPhoto).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        result: expect.objectContaining({ totalEstimatedCalories: 95 }),
      }),
    );
  });

  it.each([
    ['not_food', 422],
    ['rate_limit', 429],
    ['auth_error', 503],
    ['no_provider', 503],
    ['unknown', 500],
  ])('maps FoodRecognitionError code=%s to status %i', async (code, expectedStatus) => {
    const req = buildReq({
      file: {
        buffer: Buffer.from('img'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File,
    });
    const res = buildRes();
    mockRecognizeFoodFromPhoto.mockRejectedValueOnce(
      new FoodRecognitionError(`error: ${code}`, code as any),
    );

    await scannerController.recognizeFood(req, res);

    expect(res.status).toHaveBeenCalledWith(expectedStatus);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code, error: 'Failed to recognize food' }),
    );
  });

  it('returns 500 with code=unknown for non-FoodRecognitionError throws', async () => {
    const req = buildReq({
      file: {
        buffer: Buffer.from('img'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File,
    });
    const res = buildRes();
    mockRecognizeFoodFromPhoto.mockRejectedValueOnce(new Error('connection refused'));

    await scannerController.recognizeFood(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'unknown' }),
    );
  });
});

describe('scannerController.scanBarcode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when barcode is missing', async () => {
    const req = buildReq({ body: {} });
    const res = buildRes();
    await scannerController.scanBarcode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockScanBarcode).not.toHaveBeenCalled();
  });

  it('returns 400 when barcode is not a string', async () => {
    const req = buildReq({ body: { barcode: 12345 } });
    const res = buildRes();
    await scannerController.scanBarcode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when product is not found', async () => {
    const req = buildReq({ body: { barcode: '0000000' } });
    const res = buildRes();
    mockScanBarcode.mockResolvedValueOnce(null);

    await scannerController.scanBarcode(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Product not found' }),
    );
  });

  it('returns the product on a found barcode', async () => {
    const req = buildReq({ body: { barcode: '012345678905' } });
    const res = buildRes();
    mockScanBarcode.mockResolvedValueOnce({ productName: 'Brand X Bar', calories: 200 });

    await scannerController.scanBarcode(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        result: expect.objectContaining({ productName: 'Brand X Bar' }),
      }),
    );
  });

  it('returns 500 when the service throws', async () => {
    const req = buildReq({ body: { barcode: '012345678905' } });
    const res = buildRes();
    mockScanBarcode.mockRejectedValueOnce(new Error('upstream timeout'));

    await scannerController.scanBarcode(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to scan barcode' }),
    );
  });
});
