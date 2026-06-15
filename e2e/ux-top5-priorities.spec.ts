/**
 * @file ux-top5-priorities.spec.ts
 * @description Playwright E2E smoke tests for the Top-5 UX Priorities
 *   - Onboarding wizard (welcome → ranks → streaks → pick → complete)
 *   - Resume mission card (with seeded sandbox) / empty state (no sandbox)
 *   - Skip-to-content link (focusable, jumps to #main-content)
 *   - Reduced motion toggle (persists to localStorage and html attribute)
 *
 * Pre-requisite: app running at localhost:3000 with MOCK_AUTH=true.
 */

import { expect, test, type Page } from "@playwright/test";

const SANDBOX_KEY = "databricks-sword:sandbox";

/** A fresh, empty sandbox (no in-progress missions). */
const EMPTY_SANDBOX = {
  version: 1,
  missionProgress: {},
  challengeResults: {},
  userStats: {
    totalXp: 0,
    totalMissionsCompleted: 0,
    totalChallengesCompleted: 0,
    totalAchievements: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalTimeSpentMinutes: 0,
  },
  streakData: {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date().toISOString().split("T")[0],
    freezesAvailable: 2,
    freezesUsed: 0,
  },
  achievements: [],
  flashcardProgress: {},
  lastSynced: new Date().toISOString(),
};

/** A sandbox with one in-progress mission. */
const IN_PROGRESS_SANDBOX = {
  ...EMPTY_SANDBOX,
  missionProgress: {
    "lakehouse-fundamentals": {
      started: true,
      completed: false,
      currentStageId: "02-diagram",
      stageProgress: {
        "01-briefing": {
          completed: true,
          completedAt: "2026-06-14T10:00:00.000Z",
          xpEarned: 50,
          codeAttempts: [],
          hintsUsed: 0,
        },
        "02-diagram": {
          completed: false,
          xpEarned: 0,
          codeAttempts: [],
          hintsUsed: 0,
        },
      },
      sideQuestsCompleted: [],
      totalXpEarned: 50,
    },
  },
  userStats: { ...EMPTY_SANDBOX.userStats, totalXp: 50 },
};

/**
 * Seed localStorage with the given sandbox before any page navigation.
 */
async function seedSandbox(page: Page, sandbox: object): Promise<void> {
  await page.addInitScript(
    (data) => {
      localStorage.setItem(data.key, JSON.stringify(data.value));
    },
    { key: SANDBOX_KEY, value: sandbox },
  );
}

/**
 * Clear localStorage (run before any addInitScript).
 */
async function clearStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.clear();
  });
}

// ============================================================================
// Empty state when no in-progress mission
// ============================================================================
test.describe("MissionStatusCard empty state", () => {
  test("shows 'No mission in progress' when sandbox is empty", async ({ page }) => {
    await clearStorage(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("no-mission-empty-state")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("link", { name: /start first mission/i }),
    ).toBeVisible();
  });
});

// ============================================================================
// Resume mission card when one is in progress
// ============================================================================
test.describe("ResumeMissionCard", () => {
  test("shows 'CONTINUE MISSION' when sandbox has an in-progress mission", async ({
    page,
  }) => {
    await seedSandbox(page, IN_PROGRESS_SANDBOX);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const resumeCard = page.getByTestId("resume-mission-card");
    await expect(resumeCard).toBeVisible({ timeout: 10_000 });
    // The slug "lakehouse-fundamentals" is title-cased in the card heading
    await expect(
      resumeCard.getByRole("heading", { name: "Lakehouse Fundamentals" }),
    ).toBeVisible();
    // Stage 2 of 2 (01-briefing done, 02-diagram next)
    await expect(resumeCard.getByText(/Stage 2 of 2/)).toBeVisible();
  });

  test("Resume link points to the next uncompleted stage", async ({ page }) => {
    await seedSandbox(page, IN_PROGRESS_SANDBOX);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const resumeLink = page.getByTestId("resume-mission-card").getByRole("link", {
      name: /resume/i,
    });
    await expect(resumeLink).toHaveAttribute(
      "href",
      "/missions/lakehouse-fundamentals/stage/02-diagram",
    );
  });
});

// ============================================================================
// Onboarding flow
// ============================================================================
test.describe("Onboarding flow", () => {
  test("user can walk through all 4 steps and reach the dashboard", async ({
    page,
  }) => {
    await clearStorage(page);
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    // Step 1: Welcome
    await expect(page.getByText(/welcome, operator/i)).toBeVisible();
    await expect(page.getByText(/step 1 of 4/i)).toBeVisible();

    const nextButton = page.getByRole("button", { name: /next →/i });
    const finishButton = page.getByRole("button", { name: /^finish$/i });

    // Step 2: Ranks
    await nextButton.click();
    await expect(page.getByText(/ranks & xp/i)).toBeVisible();
    await expect(page.getByText(/step 2 of 4/i)).toBeVisible();

    // Step 3: Streaks
    await nextButton.click();
    await expect(page.getByText(/daily streaks/i)).toBeVisible();
    await expect(page.getByText(/step 3 of 4/i)).toBeVisible();

    // Step 4: Pick
    await nextButton.click();
    await expect(page.getByText(/pick your first mission/i)).toBeVisible();
    await expect(page.getByText(/step 4 of 4/i)).toBeVisible();

    // Finish
    await finishButton.click();
    await page.waitForURL("**/", { timeout: 5_000 });

    // Completion flag was set
    const completed = await page.evaluate(() =>
      localStorage.getItem("onboardingComplete"),
    );
    expect(completed).toBe("true");
  });

  test("Skip button completes the tour immediately", async ({ page }) => {
    await clearStorage(page);
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /skip/i }).click();
    await page.waitForURL("**/", { timeout: 5_000 });

    const completed = await page.evaluate(() =>
      localStorage.getItem("onboardingComplete"),
    );
    expect(completed).toBe("true");
  });

  test("Back button is disabled on the first step", async ({ page }) => {
    await clearStorage(page);
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    const backBtn = page.getByRole("button", { name: /back/i });
    await expect(backBtn).toBeDisabled();
  });
});

// ============================================================================
// Skip-to-content link
// ============================================================================
test.describe("Skip-to-content link", () => {
  test("is present in the DOM and links to #main-content", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  test("the main content area exists with the expected id", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const main = page.locator("#main-content");
    await expect(main).toBeAttached();
  });
});

// ============================================================================
// Reduced motion toggle
// ============================================================================
test.describe("Reduced motion toggle", () => {
  test("persists selection to localStorage and html data attribute", async ({
    page,
  }) => {
    await clearStorage(page);
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Settings page should expose the motion preferences fieldset
    const reduceOption = page.getByLabel(/reduce motion/i);
    await expect(reduceOption).toBeAttached();

    await reduceOption.check();

    const stored = await page.evaluate(() =>
      localStorage.getItem("reduceMotion"),
    );
    expect(stored).toBe("true");

    const dataAttr = await page.evaluate(() =>
      document.documentElement.getAttribute("data-reduce-motion"),
    );
    expect(dataAttr).toBe("true");
  });
});
