// backend/__tests__/modules/upload/uploadRoute.test.ts
// Coverage push 2026-05-04 — modules/upload was 0% before this file.
// Targets the handler logic only; multer + Cloudinary are mocked.

// tests/setup.ts globally mocks @modules/upload/uploadRoute with an empty
// router so that integration tests against app.ts don't hit Cloudinary.
// In this file we want the REAL route, so unmock both alias variants.
jest.unmock('@modules/upload/uploadRoute');
jest.unmock('../../../src/modules/upload/uploadRoute');

const mockUploadToCloudinary = jest.fn();

jest.mock('../../../src/lib/cloudinary', () => ({
  uploadToCloudinary: (...args: unknown[]) => mockUploadToCloudinary(...args),
}));

import express from 'express';
import request from 'supertest';
import uploadRoutes from '../../../src/modules/upload/uploadRoute';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/upload', uploadRoutes);
  return app;
}

describe('POST /api/upload/item-photo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects with 400 when no file is attached', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/upload/item-photo');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'No file provided' });
    expect(mockUploadToCloudinary).not.toHaveBeenCalled();
  });

  it('uploads buffer to Cloudinary and returns the resulting URL', async () => {
    const app = makeApp();
    mockUploadToCloudinary.mockResolvedValueOnce(
      'https://res.cloudinary.com/demo/image/upload/v1/sazon/shopping-items/abc.jpg',
    );

    const res = await request(app)
      .post('/api/upload/item-photo')
      .attach('photo', Buffer.from('pretend-image-bytes'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/cloudinary\.com.*shopping-items/);
    expect(mockUploadToCloudinary).toHaveBeenCalledTimes(1);
    const [bufferArg, folderArg] = mockUploadToCloudinary.mock.calls[0];
    expect(Buffer.isBuffer(bufferArg)).toBe(true);
    expect(folderArg).toBe('sazon/shopping-items');
  });

  it('returns 500 when Cloudinary upload throws', async () => {
    const app = makeApp();
    mockUploadToCloudinary.mockRejectedValueOnce(new Error('cloud is down'));

    const res = await request(app)
      .post('/api/upload/item-photo')
      .attach('photo', Buffer.from('bytes'), {
        filename: 'photo.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Upload failed' });
  });

  it('rejects non-image content types via the multer fileFilter', async () => {
    const app = makeApp();

    const res = await request(app)
      .post('/api/upload/item-photo')
      .attach('photo', Buffer.from('not an image'), {
        filename: 'evil.exe',
        contentType: 'application/octet-stream',
      });

    // Multer surfaces fileFilter errors as 500 by default unless the route
    // wraps it. Either status is acceptable as long as we did NOT call the
    // Cloudinary upload — that's the security invariant under test.
    expect(mockUploadToCloudinary).not.toHaveBeenCalled();
    expect([400, 500]).toContain(res.status);
  });
});
