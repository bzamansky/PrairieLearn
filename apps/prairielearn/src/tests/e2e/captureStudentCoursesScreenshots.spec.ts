import fs from 'node:fs/promises';
import path from 'node:path';

import { dangerousFullSystemAuthz } from '../../lib/authz-data-lib.js';
import { REPOSITORY_ROOT_PATH } from '../../lib/paths.js';
import { ensureUncheckedEnrollment } from '../../models/enrollment.js';
import { getOrCreateUser } from '../utils/auth.js';

import { createTest, expect } from './fixtures.js';

const STUDENT = {
  uid: 'student-courses-screenshot@example.com',
  name: 'Student Courses Screenshot',
  uin: 'SCS001',
};
const VIEWPORT = { width: 1440, height: 900 };
const OUT_DIR = path.resolve(
  REPOSITORY_ROOT_PATH,
  process.env.OUT_DIR ?? '.artifacts/student-courses-card',
);

const test = createTest({
  authUid: STUDENT.uid,
  authName: STUDENT.name,
  authUin: STUDENT.uin,
  authEmail: STUDENT.uid,
});

test.skip(
  process.env.CAPTURE_SCREENSHOTS !== '1',
  'Set CAPTURE_SCREENSHOTS=1 to capture the Student Courses Card.',
);

test('capture joined student course card', async ({ page, courseInstance }) => {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const student = await getOrCreateUser(STUDENT);
  await ensureUncheckedEnrollment({
    userId: student.id,
    courseInstance,
    authzData: dangerousFullSystemAuthz(),
    requiredRole: ['System'],
    actionDetail: 'implicit_joined',
  });

  await page.setViewportSize(VIEWPORT);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'PrairieLearn Homepage' })).toBeVisible();

  const card = page
    .locator('.card')
    .filter({ has: page.getByRole('heading', { name: 'Courses', exact: true }) });
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: /QA 101:/ })).toBeVisible();

  await page.mouse.move(VIEWPORT.width - 1, VIEWPORT.height - 1);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await card.screenshot({ path: path.join(OUT_DIR, 'student-courses-card.png') });
});
