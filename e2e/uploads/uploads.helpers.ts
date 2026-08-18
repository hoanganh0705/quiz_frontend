/**
 * `uploads.helpers.ts` — Phase 8 Playwright stubbing for the §14 e2e
 * matrix.
 *
 * Stubs:
 *   - `/api/v1/auth/me`
 *   - `/api/v1/uploads` (multipart/form-data) — captures the upload
 *     payload and returns a Cloudinary-shaped response
 *   - `/api/v1/users/me` (PATCH) — captures the publicId sent back
 *
 * The helpers aim for two contexts:
 *
 *   1. `stubUploadSuccess` — the happy path: the upload returns a
 *      publicId, the PATCH succeeds.
 *   2. `stubUploadOwnershipDeny` — the server returns 403
 *      ASSET_NOT_OWNED when the user PATCHes another user's publicId.
 */

import type { Page, Request } from '@playwright/test';

export const USER_A_ID = '0192f4d8-4444-7000-8000-000000000001';
export const USER_B_ID = '0192f4d8-4444-7000-8000-000000000002';

export const USER_A_PUBLIC_ID = `quiz-app/avatars/${USER_A_ID}/0192f4d8-4444-7000-8000-000000aaaaaa`;
export const USER_B_PUBLIC_ID = `quiz-app/avatars/${USER_B_ID}/0192f4d8-4444-7000-8000-000000bbbbbb`;

function authMeBody(userId: string, username: string, email: string): { data: { userId: string; username: string; email: string } } {
  return { data: { userId, username, email } };
}

export interface StubUploadOptions {
  /** When true, the upload endpoint returns 500 / 502 instead of 201. */
  uploadFails?: boolean;
  /** When true, the upload endpoint returns a non-Cloudinary-shaped response (triggers client-side shape check). */
  uploadReturnsForgedPublicId?: boolean;
}

export interface StubHandle {
  readonly patchRequests: Request[];
  readonly uploadRequests: Request[];
}

/**
 * Stub the network for the avatar-upload happy-path.
 * Returns a handle that records the PATCH `/users/me` requests so
 * assertions can verify what was sent on the wire.
 */
export async function stubUploadSuccess(
  page: Page,
  options: StubUploadOptions = {},
): Promise<StubHandle> {
  const handle: StubHandle = {
    patchRequests: [],
    uploadRequests: [],
  };

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(authMeBody(USER_A_ID, 'e2e-uploader', 'e2e@quizhub.test')),
    });
  });

  await page.route('**/api/v1/uploads', async (route) => {
    handle.uploadRequests.push(route.request());
    if (options.uploadFails) {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'about:blank',
          title: 'Bad Gateway',
          status: 502,
          extensions: { code: 'UPLOAD_PROVIDER_UNAVAILABLE' },
        }),
      });
      return;
    }
    if (options.uploadReturnsForgedPublicId) {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            publicId: 'forged/evil/no-uuid-here',
            url: 'https://evil.example/forged.png',
            bytes: 1024,
            format: 'png',
            width: 256,
            height: 256,
            purpose: 'avatar',
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          publicId: USER_A_PUBLIC_ID,
          url: `https://res.cloudinary.com/demo/image/upload/w_512,h_512,c_fill,g_auto,q_auto,f_auto/${USER_A_PUBLIC_ID}`,
          bytes: 1024,
          format: 'webp',
          width: 512,
          height: 512,
          purpose: 'avatar',
        },
      }),
    });
  });

  await page.route('**/api/v1/users/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      handle.patchRequests.push(route.request());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { userId: USER_A_ID, avatarPublicId: USER_A_PUBLIC_ID },
        }),
      });
      return;
    }
    await route.continue();
  });

  return handle;
}