import { expect, test } from "@playwright/test";

test("home redirects to the portal", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/portal$/);
});

test.describe("portal page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/portal");
  });

  test("shows the portal heading", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Developer Portal" })).toBeVisible();
  });

  test("shows data from each working API", async ({ page }) => {
    const npm = page.getByTestId("source-npm");
    await expect(npm).toContainText(/next 1\.0\.\d+/);
    await expect(npm).toContainText("The React Framework");

    const maven = page.getByTestId("source-maven");
    await expect(maven).toContainText("org.apache.commons:commons-lang3 3.14.0");
    await expect(maven.getByRole("link", { name: "org.apache.commons:commons-lang3 3.14.0" })).toHaveAttribute(
      "href",
      "https://central.sonatype.com/artifact/org.apache.commons/commons-lang3",
    );
  });

  test("shows an unavailable message for a failing API and keeps the others", async ({ page }) => {
    await expect(page.getByTestId("source-github")).toContainText("GitHub repository is unavailable right now.");
    await expect(page.getByTestId("source-npm")).toBeVisible();
    await expect(page.getByTestId("source-maven")).toBeVisible();
  });

  test("Refresh loads new data", async ({ page }) => {
    const npm = page.getByTestId("source-npm");
    await expect(npm).toContainText(/next 1\.0\.\d+/);
    const before = await npm.innerText();

    await page.getByRole("button", { name: "Refresh" }).click();

    await expect(npm).not.toHaveText(before);
    await expect(npm).toContainText(/next 1\.0\.\d+/);
  });

  test("works at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const id of ["source-npm", "source-maven", "source-github"]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
});
