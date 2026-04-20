import { test, expect } from '@playwright/test';

test.describe('导航测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('点击「总览」按钮切换到总览视图', async ({ page }) => {
    await page.click('#nav-overview');
    await expect(page.locator('#view-overview')).toBeVisible();
  });

  test('点击「新建填报」按钮切换到表单视图（新建模式）', async ({ page }) => {
    await page.click('#nav-form');
    await expect(page.locator('#view-form')).toBeVisible();
    await expect(page.locator('#form-scene-id')).toHaveValue('');
  });

  test('点击「进度跟踪」按钮切换到进度视图', async ({ page }) => {
    await page.click('#nav-progress');
    await expect(page.locator('#view-progress')).toBeVisible();
  });

  test('刷新页面后路由保持正确', async ({ page }) => {
    // 导航到进度视图
    await page.click('#nav-progress');
    await expect(page.locator('#view-progress')).toBeVisible();

    // 刷新页面
    await page.reload();
    await expect(page.locator('#view-progress')).toBeVisible();
  });
});
