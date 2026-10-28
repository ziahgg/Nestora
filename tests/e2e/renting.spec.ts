import { expect, test, type Page } from '@playwright/test';

/**
 * Critical renter and agent journeys against a local Supabase stack with the dev seed:
 *   npm run db:reset && E2E_BASE_URL=http://localhost:3004 npm run test:e2e
 * Accounts are development seed values (supabase/seed.sql), not real users.
 */
const RENTER = { email: 'demo@nestora.test', password: 'nestora-demo' };
const MAYA = { email: 'maya@nestora.test', password: 'nestora-agent' };
const LENA = { email: 'lena@nestora.test', password: 'nestora-agent' };

const toast = (page: Page) => page.locator('[aria-live="polite"] > [role="status"]');

async function signIn(page: Page, who: { email: string; password: string }, next = '/') {
  await page.context().clearCookies();
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByRole('textbox', { name: 'Email' }).fill(who.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(who.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(new RegExp(`${next === '/' ? '/$' : next.replace(/[/?]/g, '\\$&')}`));
}

test.describe.configure({ mode: 'serial' });

let inquiryUrl = '';
let viewingUrl = '';

test('discover, search, filter and open a home without signing in', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Find your next home' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Featured this week' })).toBeVisible();

  await page.getByRole('link', { name: 'Search neighborhood, address or ZIP' }).click();
  await page.getByLabel('Search neighborhood, address or ZIP').fill('Echo');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/homes\?q=Echo/);
  await expect(page.getByText('1 home for rent')).toBeVisible();

  // Filters sheet: live count, then apply.
  await page.goto('/homes');
  await expect(page.getByText('6 homes for rent')).toBeVisible();
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByRole('switch', { name: 'Furnished only' }).click();
  await expect(page.getByRole('button', { name: 'Show 3 homes' })).toBeVisible();
  await page.getByRole('button', { name: 'Show 3 homes' }).click();
  await expect(page).toHaveURL(/furnished=1/);
  await expect(page.getByText('3 homes for rent')).toBeVisible();

  await page.goto('/homes?q=nowhere-at-all');
  await expect(page.getByRole('heading', { name: 'No homes match' })).toBeVisible();

  await page.goto('/homes/echo-park-studio-loft');
  await expect(page.getByRole('heading', { name: 'Echo Park Studio Loft' })).toBeVisible();
  await expect(page.getByText('$2,450').first()).toBeVisible();
  await expect(page.getByText('Not specified').first()).toBeVisible(); // utilities aren't listed
  await page.getByRole('link', { name: 'Contact agent' }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fhomes%2Fecho-park-studio-loft%2Fcontact/);

  // Drafts aren't public.
  const res = await page.goto('/homes/mar-vista-garden-duplex');
  expect(res?.status()).toBe(404);
});

test('renter saves, compares and contacts the agent (validation, sent, history)', async ({ page }) => {
  await signIn(page, RENTER, '/homes/echo-park-studio-loft');

  await page.getByRole('button', { name: 'Save Echo Park Studio Loft' }).click();
  await expect(toast(page)).toContainText('Saved to your list');
  await page.getByRole('checkbox', { name: /Compare/ }).click();
  await expect(toast(page)).toContainText('Added to compare (3/3)');

  // Compare is now full: a fourth home shows the dialog.
  await page.goto('/homes/venice-courtyard-apartment');
  await page.getByRole('checkbox', { name: /Compare full/ }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Compare is full');
  await page.getByRole('button', { name: 'Not now' }).click();

  await page.goto('/homes/echo-park-studio-loft/contact');
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(page.getByText('Choose at least one topic')).toBeVisible();
  await expect(page.getByText('Message is required')).toBeVisible();

  await page.getByRole('button', { name: 'Is it still available?' }).click();
  await page.getByRole('button', { name: 'Pets & deposit' }).click();
  await page.getByLabel('Message').fill('Hi Maya, is the loft still available, and is a cat okay?');
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(page).toHaveURL(/\/inquiries\/.+\/sent$/);
  await expect(page.getByRole('heading', { name: 'Inquiry sent' })).toBeVisible();
  await expect(page.getByText(/NST-INQ-\d+/)).toBeVisible();
  inquiryUrl = page.url().replace(/\/sent$/, '');

  await page.getByRole('link', { name: 'View my inquiries' }).click();
  await expect(page.getByText('Active · 4')).toBeVisible();
  await page.goto(inquiryUrl);
  await page.reload();
  await expect(page.getByText('Awaiting response').first()).toBeVisible();
  await expect(page.getByText('Hi Maya, is the loft still available, and is a cat okay?')).toBeVisible();

  // The details page now links to the open inquiry instead of a new one.
  await page.goto('/homes/echo-park-studio-loft');
  await expect(page.getByRole('link', { name: 'My inquiry' })).toBeVisible();
});

test('renter books, reschedules and cancels a viewing', async ({ page }) => {
  await signIn(page, RENTER, '/homes/echo-park-studio-loft/schedule');
  await expect(page.getByRole('button', { name: 'Select a time' })).toBeVisible();
  await page.getByRole('button', { name: 'Select a time' }).click();
  await expect(page.getByText('Choose a time for the viewing.')).toBeVisible();

  await page.getByRole('radiogroup', { name: 'Time' }).getByRole('radio').and(page.locator(':not([disabled])')).first().click();
  await page.getByRole('button', { name: /^Confirm · / }).click();
  await expect(page).toHaveURL(/\/viewings\/.+\/confirmed$/);
  await expect(page.getByRole('heading', { name: 'Viewing booked' })).toBeVisible();
  await expect(page.getByText(/NST-VW-\d+/)).toBeVisible();
  viewingUrl = page.url().replace(/\/confirmed$/, '');

  // The calendar file is real.
  const ics = await page.request.get(`${viewingUrl}/ics`);
  expect(ics.headers()['content-type']).toContain('text/calendar');
  expect(await ics.text()).toContain('SUMMARY:Viewing · Echo Park Studio Loft');

  // Booking through an open inquiry moves it to "Viewing scheduled".
  await page.goto(inquiryUrl);
  await expect(page.getByText('Viewing scheduled').first()).toBeVisible();

  await page.goto(`${viewingUrl}/reschedule`);
  await page.getByRole('link', { name: 'Next week' }).click();
  await expect(page).toHaveURL(/reschedule\?from=/);
  await expect(page.getByRole('link', { name: 'Previous week' })).toBeVisible();
  await page.getByRole('radiogroup', { name: 'Time' }).getByRole('radio').and(page.locator(':not([disabled])')).first().click();
  await page.getByRole('button', { name: /^Move to · / }).click();
  await expect(page).toHaveURL(/rescheduled=1/);
  await expect(page.getByText(/^Rescheduled to /)).toBeVisible();

  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel viewing' }).click();
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
  await page.goto('/viewings?tab=past');
  await expect(page.getByText('Echo Park Studio Loft')).toBeVisible();
});

test('agent answers in the queue; the renter sees the reply and a notification', async ({ page }) => {
  await signIn(page, MAYA, '/agent');
  const card = page.locator('li').filter({ hasText: 'Hi Maya, is the loft still available' });
  await card.getByLabel('Reply').fill('Yes — cats are welcome in the loft.');
  await card.getByRole('button', { name: 'Send reply' }).click();
  await expect(toast(page)).toContainText('Reply sent');

  await signIn(page, RENTER, '/notifications');
  await expect(page.getByText('Maya Chen replied').first()).toBeVisible();
  await page.goto(inquiryUrl);
  await expect(page.getByText('Responded').first()).toBeVisible();
  await expect(page.getByText('Yes — cats are welcome in the loft.').first()).toBeVisible();
});

test('another agent and signed-out visitors can’t reach the renter’s records', async ({ page }) => {
  await signIn(page, LENA, '/agent');
  await expect(page.getByText('Hi Maya, is the loft still available')).toHaveCount(0);
  const res = await page.goto(inquiryUrl);
  expect(res?.status()).toBe(404);

  await page.context().clearCookies();
  await page.goto('/inquiries');
  await expect(page).toHaveURL(/\/login\?next=%2Finquiries/);
  await page.goto('/saved');
  await expect(page).toHaveURL(/\/login\?next=%2Fsaved/);
});

test('renter withdraws an inquiry and removes a saved home', async ({ page }) => {
  await signIn(page, RENTER, '/inquiries');
  await page.goto(inquiryUrl);
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('button', { name: 'Withdraw inquiry' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Withdraw' }).click();
  await expect(page.getByText('Withdrawn').first()).toBeVisible();

  await page.goto('/saved');
  await page.getByRole('button', { name: 'Remove Echo Park Studio Loft from Saved' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Remove from Saved?');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('heading', { name: 'Echo Park Studio Loft' })).toHaveCount(0);
});
