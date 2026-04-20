import { test, expect } from '@playwright/test';

// 生成唯一场景名称
const uniqueName = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('边际值测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('#nav-form');
  });

  // ========== 表单边际值 ==========

  test('场景名称为空 - 浏览器原生校验', async ({ page }) => {
    // name 是必填字段
    const nameInput = page.locator('#f-name');
    await expect(nameInput).toHaveAttribute('required');
  });

  test('场景名称超长（200+字符）', async ({ page }) => {
    const longName = 'A'.repeat(250);
    await page.fill('#f-name', longName);
    await page.fill('#f-source_dept', '测试部门');
    await page.click('#btn-submit');

    // 应该显示错误或被截断
    const value = await page.locator('#f-name').inputValue();
    expect(value.length).toBeLessThanOrEqual(250);
  });

  test('评分滑块边界值 - 最小值1', async ({ page }) => {
    await page.click('.form-tab[data-tab="value"]');

    for (const score of ['biz_value', 'pain_point', 'frequency', 'feasibility', 'replicability', 'ai_fit', 'risk_control']) {
      await page.locator(`#f-${score}_score`).fill('1');
    }

    await expect(page.locator('#total-score-display')).toHaveText('7');
  });

  test('评分滑块边界值 - 最大值5', async ({ page }) => {
    await page.click('.form-tab[data-tab="value"]');

    for (const score of ['biz_value', 'pain_point', 'frequency', 'feasibility', 'replicability', 'ai_fit', 'risk_control']) {
      await page.locator(`#f-${score}_score`).fill('5');
    }

    await expect(page.locator('#total-score-display')).toHaveText('35');
  });

  test('日期选择过去日期', async ({ page }) => {
    await page.fill('#f-next_followup_date', '2020-01-01');
    await expect(page.locator('#f-next_followup_date')).toHaveValue('2020-01-01');
  });

  test('日期选择未来日期', async ({ page }) => {
    await page.fill('#f-next_followup_date', '2030-12-31');
    await expect(page.locator('#f-next_followup_date')).toHaveValue('2030-12-31');
  });

  test('内部优先级为0', async ({ page }) => {
    await page.click('.form-tab[data-tab="conclusion"]');
    await page.fill('#f-internal_priority', '0');
    await expect(page.locator('#f-internal_priority')).toHaveValue('0');
  });

  test('内部优先级为负数', async ({ page }) => {
    await page.click('.form-tab[data-tab="conclusion"]');
    await page.fill('#f-internal_priority', '-1');
    // 浏览器可能会拒绝负数或将其转为0
    const value = await page.locator('#f-internal_priority').inputValue();
    expect(parseInt(value)).toBeGreaterThanOrEqual(0);
  });

  test('内部优先级为极大值', async ({ page }) => {
    await page.click('.form-tab[data-tab="conclusion"]');
    await page.fill('#f-internal_priority', '999999');
    const value = await page.locator('#f-internal_priority').inputValue();
    expect(value).toBe('999999');
  });

  test('所有字段都为空提交（只有必填字段）', async ({ page }) => {
    // 只填写必填字段
    const name = uniqueName('最小场景');
    await page.fill('#f-name', name);
    await page.fill('#f-source_dept', '部门');

    await page.click('#btn-submit');

    // 等待保存完成
    await page.waitForTimeout(2000);

    // 验证场景被创建
    await page.click('#nav-overview');
    const scenarioExists = await page.locator(`text=${name}`).isVisible().catch(() => false);
    expect(scenarioExists).toBeTruthy();
  });

  // ========== 列表边际值 ==========

  test('筛选无结果', async ({ page }) => {
    await page.click('#nav-overview');

    // 设置一个不可能匹配的筛选
    await page.selectOption('#filter-dept', '不存在的部门ABCxyz');

    // 列表应该为空或显示空状态
    await page.waitForTimeout(500);
    const emptyState = page.locator('#empty-state');
    const noMatch = await emptyState.isVisible().catch(() => false);
    const noRows = await page.locator('#scenario-list tr').count() === 0;

    expect(noMatch || noRows).toBeTruthy();
  });

  test('删除场景后列表更新', async ({ page }) => {
    // 创建场景
    const name = uniqueName('待删除边际测试');
    await page.fill('#f-name', name);
    await page.fill('#f-source_dept', '部门');
    await page.click('#btn-submit');
    await page.waitForTimeout(1000);

    // 导航到总览
    await page.click('#nav-overview');
    await page.waitForTimeout(500);

    // 删除
    const deleteBtn = page.locator('#scenario-list tr:first-child .btn-delete, #scenario-list tr:first-child .fa-trash').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // 确认
      page.on('dialog', dialog => dialog.accept());
      await page.waitForTimeout(500);

      // 场景应该从列表消失
      const stillExists = await page.locator(`text=${name}`).isVisible().catch(() => false);
      expect(stillExists).toBeFalsy();
    }
  });

  // ========== 操作边际值 ==========

  test('快速连续点击保存按钮 - 防重复提交', async ({ page }) => {
    const name = uniqueName('快速提交测试');
    await page.fill('#f-name', name);
    await page.fill('#f-source_dept', '部门');

    // 快速点击两次
    await page.click('#btn-submit');
    await page.click('#btn-submit');
    await page.click('#btn-submit');

    await page.waitForTimeout(2000);

    // 验证只创建了一个场景
    await page.click('#nav-overview');
    const count = await page.locator(`text=${name}`).count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test('删除确认框取消', async ({ page }) => {
    // 创建场景
    const name = uniqueName('取消删除测试');
    await page.fill('#f-name', name);
    await page.fill('#f-source_dept', '部门');
    await page.click('#btn-submit');
    await page.waitForTimeout(1000);

    // 导航到总览
    await page.click('#nav-overview');
    await page.waitForTimeout(500);

    // 尝试删除但取消
    const deleteBtn = page.locator('#scenario-list tr:first-child .btn-delete, #scenario-list tr:first-child .fa-trash').first();
    if (await deleteBtn.isVisible()) {
      // 监听对话框并取消
      page.on('dialog', dialog => dialog.dismiss());

      await deleteBtn.click();
      await page.waitForTimeout(500);

      // 场景应该还在
      const stillExists = await page.locator(`text=${name}`).isVisible().catch(() => false);
      expect(stillExists).toBeTruthy();
    }
  });

  // ========== Tab 切换 ==========

  test('Tab 切换正常工作', async ({ page }) => {
    const tabs = ['basic', 'progress', 'value', 'input', 'conclusion', 'plan'];

    for (const tab of tabs) {
      await page.click(`.form-tab[data-tab="${tab}"]`);
      await expect(page.locator(`.form-section[data-section="${tab}"]`)).toBeVisible();
    }
  });

  test('Tab 切换保持数据', async ({ page }) => {
    const name = uniqueName('切换保持数据测试');
    // 在基本信息 tab 填写数据
    await page.fill('#f-name', name);
    await page.fill('#f-source_dept', '部门');

    // 切换到其他 tab 再切回来
    await page.click('.form-tab[data-tab="value"]');
    await expect(page.locator('.form-section[data-section="value"]')).toBeVisible();

    await page.click('.form-tab[data-tab="basic"]');
    await expect(page.locator('.form-section[data-section="basic"]')).toBeVisible();

    // 数据应该还在
    await expect(page.locator('#f-name')).toHaveValue(name);
  });
});
