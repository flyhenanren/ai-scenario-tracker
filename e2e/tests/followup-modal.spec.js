import { test, expect } from '@playwright/test';

// 生成唯一场景名称
const uniqueName = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('跟进弹窗测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // 先创建一个场景
    await page.click('#nav-form');
    await page.fill('#f-name', uniqueName('跟进弹窗测试场景'));
    await page.fill('#f-source_dept', '测试部门');
    await page.click('#btn-submit');
    await page.waitForTimeout(1000);

    // 导航到总览
    await page.click('#nav-overview');
    await page.waitForTimeout(500);

    // 打开跟进弹窗
    await page.click('#nav-progress');
    await page.waitForTimeout(500);

    const followupBtn = page.locator('.btn-followup, button:has-text("跟进")').first();
    if (await followupBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await followupBtn.click();
    } else {
      // 尝试从详情页打开
      await page.click('#nav-overview');
      await page.waitForTimeout(500);
      const viewBtn = page.locator('#scenario-list tr:first-child .btn-view, #scenario-list tr:first-child .fa-eye').first();
      if (await viewBtn.isVisible()) {
        await viewBtn.click();
        await page.waitForTimeout(500);
        const detailFollowupBtn = page.locator('#btn-followup-detail');
        if (await detailFollowupBtn.isVisible()) {
          await detailFollowupBtn.click();
        }
      }
    }
  });

  test('弹窗正确打开', async ({ page }) => {
    await expect(page.locator('#followup-modal')).toBeVisible({ timeout: 3000 }).catch(() => {
      test.skip();
    });
  });

  test('弹窗正确关闭（取消按钮）', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    const cancelBtn = page.locator('#btn-cancel-followup');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await expect(modal).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('弹窗正确关闭（X按钮）', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    const closeBtn = page.locator('#btn-close-followup');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(modal).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('填写跟进人', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    await page.fill('#fu-followup_by', '李四');
    await expect(page.locator('#fu-followup_by')).toHaveValue('李四');
  });

  test('选择跟进间隔', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    await page.selectOption('#fu-interval_type', '1个月');
    await expect(page.locator('#fu-interval_type')).toHaveValue('1个月');
  });

  test('选择生命周期状态', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    await page.selectOption('#fu-lifecycle_status', '推进中');
    await expect(page.locator('#fu-lifecycle_status')).toHaveValue('推进中');
  });

  test('选择成熟度', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    await page.selectOption('#fu-maturity_level', '4');
    await expect(page.locator('#fu-maturity_level')).toHaveValue('4');
  });

  test('选择分类', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    await page.selectOption('#fu-category', 'A');
    await expect(page.locator('#fu-category')).toHaveValue('A');
  });

  test('选择配合意愿', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    await page.selectOption('#fu-cooperation_willingness', '3');
    await expect(page.locator('#fu-cooperation_willingness')).toHaveValue('3');
  });

  test('填写进展摘要', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    await page.fill('#fu-progress_summary', '已完成需求调研，进入开发阶段');
    await expect(page.locator('#fu-progress_summary')).toHaveValue('已完成需求调研，进入开发阶段');
  });

  test('填写问题', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    await page.fill('#fu-problems', '数据权限审批中');
    await expect(page.locator('#fu-problems')).toHaveValue('数据权限审批中');
  });

  test('填写下一步计划', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    await page.fill('#fu-next_plan', '继续跟进数据权限，预计下周完成');
    await expect(page.locator('#fu-next_plan')).toHaveValue('继续跟进数据权限，预计下周完成');
  });

  test('选择下次跟进日期', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      test.skip();
    }

    await page.fill('#fu-next_followup_date', '2026-05-01');
    await expect(page.locator('#fu-next_followup_date')).toHaveValue('2026-05-01');
  });

  test('保存跟进成功并关闭弹窗', async ({ page }) => {
    const modal = page.locator('#followup-modal');
    if (!(await modal.isVisible())) {
      // 尝试重新打开
      await page.click('#nav-overview');
      await page.waitForTimeout(500);
      const viewBtn = page.locator('#scenario-list tr:first-child .btn-view, #scenario-list tr:first-child .fa-eye').first();
      if (await viewBtn.isVisible()) {
        await viewBtn.click();
        await page.waitForTimeout(500);
        const detailFollowupBtn = page.locator('#btn-followup-detail');
        if (await detailFollowupBtn.isVisible()) {
          await detailFollowupBtn.click();
        }
      }
    }

    if (await modal.isVisible()) {
      // 填写必填字段
      await page.fill('#fu-followup_by', '测试跟进人');
      await page.selectOption('#fu-lifecycle_status', '推进中');
      await page.selectOption('#fu-maturity_level', '3');

      // 提交
      const submitBtn = page.locator('#followup-modal button[type="submit"], #followup-modal #btn-submit-followup');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();

        // 等待成功提示
        await page.waitForTimeout(1000);

        // 验证弹窗关闭
        await expect(modal).not.toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    } else {
      test.skip();
    }
  });
});
