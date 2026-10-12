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
    const npm = page.getByTestId("source-npm").filter({visible: true});
    await expect(npm).toContainText(/next 1\.0\.\d+/);
    const before = await npm.innerText();

    await page.getByRole("button", { name: "Refresh" }).click();

    await expect(npm).not.toHaveText(before);
    await expect(npm).toContainText(/next 1\.0\.\d+/);
  });

  test("works at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const id of ["source-npm", "source-maven", "source-github", "azure-traffic"]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
});

test.describe("Azure traffic", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/portal");
  });

  test("opens on Production with last hour's numbers", async ({ page }) => {
    const traffic = page.getByTestId("azure-traffic");
    await expect(traffic.getByRole("heading", { name: "Azure traffic" })).toBeVisible();
    await expect(traffic.getByRole("button", { name: "Production" })).toHaveAttribute("aria-pressed", "true");
    await expect(traffic.getByRole("button", { name: "Staging" })).toHaveAttribute("aria-pressed", "false");

    await expect(traffic).toContainText("portal-prod");
    await expect(page.getByTestId("azure-requests")).toContainText("120");
    await expect(page.getByTestId("azure-server-errors")).toContainText("2");
    await expect(page.getByTestId("azure-average-response")).toContainText("250 ms");
  });

  test("the toggle switches between Staging and Production", async ({ page }) => {
    const traffic = page.getByTestId("azure-traffic");

    await traffic.getByRole("button", { name: "Staging" }).click();

    await expect(traffic.getByRole("button", { name: "Staging" })).toHaveAttribute("aria-pressed", "true");
    await expect(traffic.getByRole("button", { name: "Production" })).toHaveAttribute("aria-pressed", "false");
    await expect(traffic).toContainText("portal-staging");
    await expect(traffic).not.toContainText("portal-prod");
    await expect(page.getByTestId("azure-requests")).toContainText("8");
    await expect(page.getByTestId("azure-average-response")).toContainText("100 ms");

    await traffic.getByRole("button", { name: "Production" }).click();

    await expect(traffic).toContainText("portal-prod");
    await expect(page.getByTestId("azure-requests")).toContainText("120");
  });

  test("the toggle works with the keyboard", async ({ page }) => {
    const staging = page.getByTestId("azure-traffic").getByRole("button", { name: "Staging" });

    await staging.focus();
    await page.keyboard.press("Enter");

    await expect(staging).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("azure-requests")).toContainText("8");
  });

  test("the selection survives Refresh", async ({ page }) => {
    const traffic = page.getByTestId("azure-traffic");
    const npm = page.getByTestId("source-npm").filter({ visible: true });
    await traffic.getByRole("button", { name: "Staging" }).click();
    const before = await npm.innerText();

    await page.getByRole("button", { name: "Refresh" }).click();

    await expect(npm).not.toHaveText(before);
    await expect(traffic.getByRole("button", { name: "Staging" })).toHaveAttribute("aria-pressed", "true");
    await expect(traffic).toContainText("portal-staging");
  });
});
