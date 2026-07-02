import { expect, test } from "@playwright/test";

test("home header layout stays coherent", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.locator(".ln-brand")).toBeVisible();
  await expect(page.locator("#themeToggle")).toBeVisible();

  const brandBox = await page.locator(".ln-brand").boundingBox();
  const toggleBox = await page.locator("#themeToggle").boundingBox();
  expect(brandBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();
  expect(toggleBox.x).toBeGreaterThan(brandBox.x + brandBox.width);

  const mid = page.locator(".ln-mid");
  if (isMobile) {
    await expect(mid).toBeHidden();
  } else {
    await expect(mid).toBeVisible();
    const midBox = await mid.boundingBox();
    expect(midBox).not.toBeNull();
    expect(midBox.x).toBeGreaterThan(brandBox.x + brandBox.width);
    expect(toggleBox.x).toBeGreaterThan(midBox.x + midBox.width);
  }
});

test("home feed search does not hide all articles", async ({ page }) => {
  await page.goto("/");
  const items = page.locator("#listRoot .ln-feed-item");
  const count = await items.count();
  test.skip(count === 0, "No posts available from Notion or snapshot.");

  await expect(items.first()).toBeVisible();
  const firstTitle = (await items.first().locator(".ln-feed-title").innerText()).trim();
  await page.locator("#searchInput").fill(firstTitle.slice(0, Math.min(4, firstTitle.length)));
  await expect(page.locator("#listRoot .ln-feed-item:visible").first()).toBeVisible();
  await expect(page.locator("#emptyState")).toBeHidden();
});

test("first article page renders main content", async ({ page }) => {
  await page.goto("/");
  const firstPost = page.locator('a[href^="/posts/"]').first();
  const href = await firstPost.getAttribute("href");
  test.skip(!href, "No article links available from Notion or snapshot.");

  await page.goto(href, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".ln-post-title")).toBeVisible();
  await expect(page.locator(".ln-prose")).toBeVisible();
});

test("oraagent landing page renders", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.goto("/oraagent");
  } else {
    await page.locator('.ln-mid a[href="/oraagent"]').click();
  }
  await expect(page).toHaveURL(/\/oraagent\/?$/);
  await expect(page.locator(".oa-title")).toContainText("AI 团队");
  await expect(page.locator(".oa-expert")).toHaveCount(8);
  await expect(page.locator('a[href="/go/oraagent-download"]').first()).toBeVisible();
});

test("go redirects include tracking params", async ({ request }) => {
  const response = await request.get("/go/oraagent-download", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  const location = response.headers().location || "";
  expect(location).toContain("OraAgent-Setup");
  expect(location).toContain("utm_source=waimao-intel");
  expect(location).toContain("utm_content=oraagent-download");
});

test("full llms index exposes oraagent and articles", async ({ request }) => {
  const response = await request.get("/llms-full.txt");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("text/plain");
  const body = await response.text();
  expect(body).toContain("# 外贸情报局");
  expect(body).toContain("## OraAgent");
  expect(body).toContain("## Latest Articles");
});

test("edge pages use site chrome", async ({ page }) => {
  await page.goto("/404");
  await expect(page.locator(".ln-brand")).toBeVisible();
  await expect(page.getByRole("heading", { name: "页面走丢了" })).toBeVisible();

  await page.goto("/offline");
  await expect(page.locator(".ln-brand")).toBeVisible();
  await expect(page.getByRole("heading", { name: "网络连接中断" })).toBeVisible();
});
