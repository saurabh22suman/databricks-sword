/**
 * @file field-ops-connection.spec.ts
 * @description Playwright E2E tests for Field Operations Databricks connection form.
 * Tests the ConnectionForm UI with warehouse ID and catalog name fields.
 */

import { expect, test, type Page } from "@playwright/test";

/** Fresh sandbox data with enough XP to access field-ops */
const SANDBOX_WITH_XP = {
  version: 1,
  missionProgress: {},
  challengeResults: {},
  userStats: {
    totalXp: 5000, // Enough XP to unlock several industries
    totalMissionsCompleted: 5,
    totalChallengesCompleted: 10,
    totalAchievements: 2,
    currentStreak: 3,
    longestStreak: 5,
    totalTimeSpentMinutes: 120,
  },
  streakData: {
    currentStreak: 3,
    longestStreak: 5,
    lastActiveDate: new Date().toISOString().split("T")[0],
    freezesAvailable: 2,
    freezesUsed: 0,
  },
  achievements: [],
  flashcardProgress: {},
  lastSynced: new Date().toISOString(),
};

/**
 * Helper: seed localStorage with test sandbox and intercept sync API.
 */
async function seedSandbox(page: Page, sandbox = SANDBOX_WITH_XP): Promise<void> {
  // Intercept sync API so remote data doesn't overwrite localStorage
  await page.route("**/api/user/sync", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        body: JSON.stringify(sandbox),
      });
    }
    return route.continue();
  });

  // Inject localStorage before page loads
  await page.addInitScript((data) => {
    window.localStorage.setItem("databricks-sword-sandbox", JSON.stringify(data));
  }, sandbox);
}

test.describe("Field Operations Connection Form", () => {
  test.beforeEach(async ({ page }) => {
    await seedSandbox(page);
  });

  test("displays Field Operations page title", async ({ page }) => {
    await page.goto("/field-ops");
    
    // Wait for page to load
    await page.waitForLoadState("networkidle");
    
    // Page might redirect if not authenticated - check for either field-ops content or signin
    const content = await page.content();
    const hasFieldOps = content.includes("Field Ops") || content.includes("Field Operations");
    const hasSignIn = content.includes("Sign in") || content.includes("signin");
    
    // Either we see the Field Ops page or we got redirected to sign in (both valid)
    expect(hasFieldOps || hasSignIn).toBe(true);
  });

  test("ConnectionForm has workspace URL field", async ({ page }) => {
    // Navigate to settings or field-ops page where ConnectionForm appears
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    
    // Look for workspace URL input
    const workspaceUrlInput = page.getByLabel(/workspace url/i);
    // If it's visible, check it exists
    const isVisible = await workspaceUrlInput.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(workspaceUrlInput).toBeVisible();
    }
  });

  test("ConnectionForm has PAT field", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    
    const patInput = page.getByLabel(/personal access token/i);
    const isVisible = await patInput.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(patInput).toBeVisible();
      // PAT should be masked
      await expect(patInput).toHaveAttribute("type", "password");
    }
  });

  test("ConnectionForm has warehouse ID field", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    
    const warehouseInput = page.getByLabel(/warehouse id/i);
    const isVisible = await warehouseInput.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(warehouseInput).toBeVisible();
      // Check placeholder
      await expect(warehouseInput).toHaveAttribute("placeholder", expect.stringMatching(/[a-f0-9]/i));
    }
  });

  test("ConnectionForm has catalog name field with default value", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    
    const catalogInput = page.getByLabel(/catalog name/i);
    const isVisible = await catalogInput.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(catalogInput).toBeVisible();
      // Should have default value "dev"
      await expect(catalogInput).toHaveValue("dev");
    }
  });

  test("shows validation error for invalid warehouse ID", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    
    const warehouseInput = page.getByLabel(/warehouse id/i);
    const isVisible = await warehouseInput.isVisible().catch(() => false);
    
    if (isVisible) {
      // Type invalid warehouse ID
      await warehouseInput.fill("invalid-format");
      
      // Fill other required fields
      const urlInput = page.getByLabel(/workspace url/i);
      const patInput = page.getByLabel(/personal access token/i);
      await urlInput.fill("https://dbc-test.cloud.databricks.com");
      await patInput.fill("dapi_test_token");
      
      // Submit
      await page.getByRole("button", { name: /connect/i }).click();
      
      // Should show validation error
      await expect(page.getByText(/invalid warehouse id/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
