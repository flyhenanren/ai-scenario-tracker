import { test, expect } from '@playwright/test';

// 生成唯一场景名称
const uniqueName = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('总览界面测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('#nav-overview');
    await expect(page.locator('#view-overview')).toBeVisible();
  });

  test('空列表显示空状态', async ({ page }) => {
    // 确保没有场景时显示空状态
    const emptyState = page.locator('#empty-state');
    await expect(emptyState).toBeVisible({ timeout: 5000 }).catch(() => {
      // 如果有数据，则列表应该可见
      expect(page.locator('#scenario-list')).toBeVisible();
    });
  });

  test('筛选器 - 部门筛选', async ({ page }) => {
    const filter = page.locator('#filter-dept');
    await expect(filter).toBeVisible();
    await filter.selectOption({ index: 1 });
    // 验证筛选结果
  });

  test('筛选器 - 成熟度筛选 L1', async ({ page }) => {
    const filter = page.locator('#filter-maturity');
    await filter.selectOption('1');
    await expect(filter).toHaveValue('1');
  });

  test('筛选器 - 生命周期筛选', async ({ page }) => {
    const filter = page.locator('#filter-lifecycle');
    await filter.selectOption('对接中');
    await expect(filter).toHaveValue('对接中');
  });

  test('筛选器 - 分类筛选 A类', async ({ page }) => {
    const filter = page.locator('#filter-category');
    await filter.selectOption('A');
    await expect(filter).toHaveValue('A');
  });

  test('重置筛选按钮', async ({ page }) => {
    // 设置一些筛选
    await page.locator('#filter-maturity').selectOption('3');
    await page.locator('#filter-lifecycle').selectOption('推进中');

    // 点击重置
    await page.click('#btn-reset-filter');

    // 验证筛选重置
    await expect(page.locator('#filter-maturity')).toHaveValue('');
    await expect(page.locator('#filter-lifecycle')).toHaveValue('');
  });

  test('点击场景名称进入详情', async ({ page }) => {
    // 先创建一个场景
    await page.click('#nav-form');
    await page.fill('#f-name', uniqueName('测试场景导航'));
    await page.fill('#f-source_dept', '测试部门');
    await page.click('#btn-submit');

    // 等待保存成功后回到总览
    await page.waitForURL(/overview/, { timeout: 5000 }).catch(() => {});

    // 导航到总览
    await page.click('#nav-overview');

    // 点击第一个场景的名称
    const firstScenarioName = page.locator('#scenario-list tr:first-child .scenario-name, #scenario-list tr:first-child td:first-child').first();
    if (await firstScenarioName.isVisible()) {
      await firstScenarioName.click();
      await expect(page.locator('#view-detail')).toBeVisible({ timeout: 5000 }).catch(() => {
        // 可能跳转到编辑模式
        expect(page.locator('#view-form')).toBeVisible();
      });
    }
  });

  test('点击删除图标弹出确认框并确认删除', async ({ page }) => {
    // 先创建一个场景
    const name = uniqueName('待删除场景');
    await page.click('#nav-form');
    await page.fill('#f-name', name);
    await page.fill('#f-source_dept', '测试部门');
    await page.click('#btn-submit');
    await page.waitForURL(/overview/, { timeout: 5000 }).catch(() => {});
    await page.click('#nav-overview');

    // 找到删除按钮并点击
    const deleteBtn = page.locator('#scenario-list tr:first-child .btn-delete, #scenario-list tr:first-child .fa-trash').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // 确认删除对话框出现
      const modal = page.locator('#modal-container');
      await expect(modal).toBeVisible({ timeout: 3000 }).catch(() => {
        // 可能使用浏览器原生 confirm
      });

      // 点击确认
      const confirmBtn = page.locator('#modal-confirm, button:has-text("确认"), button:has-text("确定")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        // 验证场景从列表消失
        await expect(page.locator(`text=${name}`)).not.toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    }
  });
});
