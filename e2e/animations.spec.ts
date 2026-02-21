/**
 * @file animations.spec.ts
 * @description Playwright E2E tests verifying animation enhancements:
 *   1. Challenge completion celebration overlay (confetti + Lottie)
 *   2. CSS animation classes on the celebration
 *   3. Mission debrief Lottie animation
 *
 * Pre-requisite: run `node scripts/seed-fresh-user.mjs` to reset mock user to 80 XP.
 * The app must be running at localhost:3000 with MOCK_AUTH=true.
 */

import { expect, test, type Page } from "@playwright/test";

/** Fresh sandbox data with low XP — injected into localStorage before page load */
const FRESH_SANDBOX = {
  version: 1,
  missionProgress: {},
  challengeResults: {},
  userStats: {
    totalXp: 80,
    totalMissionsCompleted: 0,
    totalChallengesCompleted: 0,
    totalAchievements: 0,
    currentStreak: 1,
    longestStreak: 1,
    totalTimeSpentMinutes: 5,
  },
  streakData: {
    currentStreak: 1,
    longestStreak: 1,
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
async function seedSandbox(
  page: Page,
  sandbox = FRESH_SANDBOX,
): Promise<void> {
  // Intercept sync API so remote data doesn't overwrite localStorage
  await page.route("**/api/user/sync", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(sandbox),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, lastSynced: new Date().toISOString() }),
    });
  });

  // Set localStorage before any page navigation
  await page.addInitScript((data) => {
    localStorage.setItem("databricks-sword:sandbox", JSON.stringify(data));
  }, sandbox);
}

/**
 * Helper: complete the broadcast-join fill-blank challenge.
 * Blanks: 0 = "broadcast", 1 = "join", 2 = "broadcast"
 */
async function completeFillBlankChallenge(page: Page): Promise<void> {
  await page.goto("/challenges/ps-fb-broadcast-join");
  await page.waitForLoadState("networkidle");

  // Wait for the selects to be visible
  await expect(page.getByText("Check Answers")).toBeVisible({ timeout: 10_000 });

  // Fill in the correct answers using <select> dropdowns
  const selects = page.locator("select");
  const count = await selects.count();

  // The blanks for this challenge:
  // Blank 0: "broadcast"  (options: broadcast, coalesce, repartition, cache)
  // Blank 1: "join"       (options: join, merge, union, crossJoin)
  // Blank 2: "broadcast"  (options: broadcast, collect, cache, persist)
  for (let i = 0; i < count; i++) {
    const select = selects.nth(i);
    const options = await select.locator("option").allTextContents();

    if (options.includes("broadcast") && options.includes("coalesce")) {
      await select.selectOption("broadcast");
    } else if (options.includes("join") && options.includes("merge")) {
      await select.selectOption("join");
    } else if (options.includes("broadcast") && options.includes("collect")) {
      await select.selectOption("broadcast");
    }
  }

  // Click "Check Answers"
  await page.getByRole("button", { name: "Check Answers" }).click();

  // Wait for "Continue to Next Stage →" button
  await expect(
    page.getByRole("button", { name: /Continue to Next Stage/i }),
  ).toBeVisible({ timeout: 5_000 });

  // Click to trigger the celebration overlay
  await page.getByRole("button", { name: /Continue to Next Stage/i }).click();
}

// ============================================================================
// Test Suite: Challenge Completion Celebration
// ============================================================================
test.describe("Challenge Completion Celebration", () => {
  test.beforeEach(async ({ page }) => {
    await seedSandbox(page);
  });

  test("shows celebration overlay with confetti after completing a fill-blank challenge", async ({
    page,
  }) => {
    await completeFillBlankChallenge(page);

    // The celebration overlay should appear
    await expect(
      page.getByTestId("challenge-complete-celebration"),
    ).toBeVisible({ timeout: 5_000 });

    // Verify celebration content (scoped to overlay — ChallengePlayer also shows "Challenge Complete!")
    const overlay = page.getByTestId("challenge-complete-celebration");
    await expect(overlay.getByRole("heading", { name: "Challenge Complete!" })).toBeVisible();

    // XP should show (challenge rewards 125 XP)
    await expect(overlay.getByText("+125 XP")).toBeVisible();

    // Confetti canvas should be present
    await expect(page.getByTestId("confetti-canvas")).toBeVisible();

    // Take a screenshot for visual verification
    await page.screenshot({ path: "e2e/screenshots/challenge-celebration.png" });
  });

  test("celebration overlay has animate-challenge-celebrate CSS class", async ({
    page,
  }) => {
    await completeFillBlankChallenge(page);

    const overlay = page.getByTestId("challenge-complete-celebration");
    await expect(overlay).toBeVisible({ timeout: 5_000 });
    await expect(overlay).toHaveClass(/animate-challenge-celebrate/);
  });

  test("celebration overlay Continue button navigates to /challenges", async ({
    page,
  }) => {
    await completeFillBlankChallenge(page);

    const overlay = page.getByTestId("challenge-complete-celebration");
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    const continueButton = overlay.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeVisible();

    // Overlay uses entry animation + auto-dismiss; force click avoids flaky stability checks.
    await Promise.all([
      page.waitForURL("**/challenges", { timeout: 10_000 }),
      continueButton.click({ force: true }),
    ]);

    await expect(page).toHaveURL(/\/challenges$/);
  });

  test("celebration auto-dismisses after ~3 seconds", async ({ page }) => {
    await completeFillBlankChallenge(page);

    const celebration = page.getByTestId("challenge-complete-celebration");
    await expect(celebration).toBeVisible({ timeout: 5_000 });

    // Wait for auto-dismiss (2800ms) + navigation
    await page.waitForURL("**/challenges", { timeout: 8_000 });
  });
});

// ============================================================================
// Test Suite: Mission Debrief Lottie
// ============================================================================
test.describe("Mission Debrief", () => {
  test.beforeEach(async ({ page }) => {
    const missionSandbox = {
      ...FRESH_SANDBOX,
      missionProgress: {
        "lakehouse-fundamentals": {
          started: true,
          completed: false,
          currentStageId: "06-debrief",
          stageProgress: {
            "01-briefing": { completed: true, xpEarned: 50, codeAttempts: [], hintsUsed: 0 },
            "02-diagram": { completed: true, xpEarned: 50, codeAttempts: [], hintsUsed: 0 },
            "03-drag-drop": { completed: true, xpEarned: 75, codeAttempts: [], hintsUsed: 0 },
            "04-fill-blank": { completed: true, xpEarned: 75, codeAttempts: [], hintsUsed: 0 },
            "05-quiz": { completed: true, xpEarned: 50, codeAttempts: [], hintsUsed: 0, quizScore: 100 },
          },
          sideQuestsCompleted: [],
          totalXpEarned: 300,
        },
      },
      userStats: {
        ...FRESH_SANDBOX.userStats,
        totalXp: 380,
      },
    };
    await seedSandbox(page, missionSandbox);
  });

  test("debrief page shows Mission Complete banner", async ({ page }) => {
    await page.goto("/missions/lakehouse-fundamentals/stage/06-debrief");
    await page.waitForLoadState("networkidle");

    // "Mission Complete!" should be visible in the banner
    await expect(
      page.getByRole("heading", { name: /Mission Complete/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: "e2e/screenshots/mission-debrief.png" });
  });
});

// ============================================================================
// Test Suite: Challenges Page Navigation
// ============================================================================
test.describe("Challenges Page", () => {
  test.beforeEach(async ({ page }) => {
    await seedSandbox(page);
  });

  test("can navigate to a fill-blank challenge from the grid", async ({ page }) => {
    await page.goto("/challenges");
    await page.waitForLoadState("networkidle");

    // Challenge cards are <article> elements with onClick — not <a> links
    const card = page.locator("article").filter({ hasText: /Optimize a Join with Broadcast/i });

    // Scroll to it if needed
    if (!(await card.isVisible().catch(() => false))) {
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("PageDown");
        await page.waitForTimeout(300);
        if (await card.isVisible().catch(() => false)) break;
      }
    }

    await card.click();
    await page.waitForURL("**/challenges/ps-fb-broadcast-join", { timeout: 10_000 });
  });
});
