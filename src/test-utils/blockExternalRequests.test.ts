import { describe, expect, it } from "vitest";

describe("unit test network guard", () => {
  it("refuses a request to a real service", async () => {
    await expect(fetch("https://management.azure.com/subscriptions")).rejects.toThrow(
      "Unit tests may not contact management.azure.com",
    );
  });
});
