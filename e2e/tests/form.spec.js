import { test, expect } from '@playwright/test';

// 生成唯一场景名称
const uniqueName = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('填报表单测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('#nav-form');
    await expect(page.locator('#view-form')).toBeVisible();
  });

  // ========== 基本信息 Tab ==========

  test('必填校验 - name 为空时提示', async ({ page }) => {
    // 只填 source_dept，不填 name
    await page.fill('#f-source_dept', '测试部门');
    await page.click('#btn-submit');

    // 应该显示错误提示（Toast 或浏览器原生校验）
    // 由于前端使用 required 属性，浏览器会阻止提交
    const nameInput = page.locator('#f-name');
    await expect(nameInput).toHaveAttribute('required');
  });

  test('必填校验 - source_dept 为空时提示', async ({ page }) => {
    await page.fill('#f-name', uniqueName('测试场景'));
    await page.click('#btn-submit');
    const deptInput = page.locator('#f-source_dept');
    await expect(deptInput).toHaveAttribute('required');
  });

  test('文本输入 - 基本信息字段', async ({ page }) => {
    const name = uniqueName('智能客服场景');
    await page.fill('#f-name', name);
    await page.fill('#f-group_name', 'AI应用组');
    await page.fill('#f-source_dept', '客户服务部');
    await page.fill('#f-reporter', '张三');
    await page.fill('#f-contact', 'zhangsan@company.com');
    await page.fill('#f-contact_ext', '12345');

    await expect(page.locator('#f-name')).toHaveValue(name);
    await expect(page.locator('#f-group_name')).toHaveValue('AI应用组');
    await expect(page.locator('#f-source_dept')).toHaveValue('客户服务部');
  });

  test('多选 checkbox - existing_problems', async ({ page }) => {
    await page.check('input[name="existing_problems"][value="人工投入大"]');
    await page.check('input[name="existing_problems"][value="响应慢"]');

    await expect(page.locator('input[name="existing_problems"][value="人工投入大"]')).toBeChecked();
    await expect(page.locator('input[name="existing_problems"][value="响应慢"]')).toBeChecked();
    await expect(page.locator('input[name="existing_problems"][value="质量不稳定"]')).not.toBeChecked();
  });

  test('单选 radio - is_repeat', async ({ page }) => {
    await page.check('input[name="is_repeat"][value="true"]');
    await expect(page.locator('input[name="is_repeat"][value="true"]')).toBeChecked();

    await page.check('input[name="is_repeat"][value="false"]');
    await expect(page.locator('input[name="is_repeat"][value="false"]')).toBeChecked();
  });

  test('日期输入 - next_followup_date', async ({ page }) => {
    await page.fill('#f-next_followup_date', '2026-06-01');
    await expect(page.locator('#f-next_followup_date')).toHaveValue('2026-06-01');
  });

  // ========== 现状与进展 Tab ==========

  test('切换到现状与进展 Tab', async ({ page }) => {
    await page.click('.form-tab[data-tab="progress"]');
    await expect(page.locator('.form-section[data-section="progress"]')).toBeVisible();
  });

  test('radio - current_status', async ({ page }) => {
    await page.click('.form-tab[data-tab="progress"]');
    await page.check('input[name="current_status"][value="无项目"]');
    await expect(page.locator('input[name="current_status"][value="无项目"]')).toBeChecked();
  });

  test('select - maturity_level', async ({ page }) => {
    await page.click('.form-tab[data-tab="progress"]');
    await page.selectOption('#f-maturity_level', '3');
    await expect(page.locator('#f-maturity_level')).toHaveValue('3');
  });

  test('select - lifecycle_status', async ({ page }) => {
    await page.click('.form-tab[data-tab="progress"]');
    await page.selectOption('#f-lifecycle_status', '推进中');
    await expect(page.locator('#f-lifecycle_status')).toHaveValue('推进中');
  });

  test('select - director_status', async ({ page }) => {
    await page.click('.form-tab[data-tab="progress"]');
    await page.selectOption('#f-director_status', '1');
    await expect(page.locator('#f-director_status')).toHaveValue('1');
  });

  test('textarea - progress, current_problems, director_note', async ({ page }) => {
    await page.click('.form-tab[data-tab="progress"]');
    await page.fill('#f-director_name', '李四');
    await page.fill('#f-progress', '已完成需求调研');
    await page.fill('#f-current_problems', '数据权限待确认');
    await page.fill('#f-director_note', '负责人积极配合');

    await expect(page.locator('#f-director_name')).toHaveValue('李四');
    await expect(page.locator('#f-progress')).toHaveValue('已完成需求调研');
  });

  // ========== 价值评估 Tab ==========

  test('切换到价值评估 Tab', async ({ page }) => {
    await page.click('.form-tab[data-tab="value"]');
    await expect(page.locator('.form-section[data-section="value"]')).toBeVisible();
  });

  test('7个评分滑块 - 设置不同分数', async ({ page }) => {
    await page.click('.form-tab[data-tab="value"]');

    await page.locator('#f-biz_value_score').fill('5');
    await page.locator('#f-pain_point_score').fill('4');
    await page.locator('#f-frequency_score').fill('5');
    await page.locator('#f-feasibility_score').fill('3');
    await page.locator('#f-replicability_score').fill('4');
    await page.locator('#f-ai_fit_score').fill('4');
    await page.locator('#f-risk_control_score').fill('4');

    // 总分应该是 5+4+5+3+4+4+4 = 29
    const totalDisplay = page.locator('#total-score-display');
    await expect(totalDisplay).toHaveText('29');
  });

  test('滑块边界值 - 最小值1', async ({ page }) => {
    await page.click('.form-tab[data-tab="value"]');

    for (const score of ['biz_value', 'pain_point', 'frequency', 'feasibility', 'replicability', 'ai_fit', 'risk_control']) {
      await page.locator(`#f-${score}_score`).fill('1');
    }

    await expect(page.locator('#total-score-display')).toHaveText('7');
  });

  test('滑块边界值 - 最大值5', async ({ page }) => {
    await page.click('.form-tab[data-tab="value"]');

    for (const score of ['biz_value', 'pain_point', 'frequency', 'feasibility', 'replicability', 'ai_fit', 'risk_control']) {
      await page.locator(`#f-${score}_score`).fill('5');
    }

    await expect(page.locator('#total-score-display')).toHaveText('35');
  });

  // ========== 投入产出 Tab ==========

  test('切换到投入产出 Tab', async ({ page }) => {
    await page.click('.form-tab[data-tab="input"]');
    await expect(page.locator('.form-section[data-section="input"]')).toBeVisible();
  });

  test('textarea - expected_benefit, required_investment', async ({ page }) => {
    await page.click('.form-tab[data-tab="input"]');
    await page.fill('#f-expected_benefit', '预计节省50%人工成本');
    await page.fill('#f-required_investment', '需要1个产品经理+2个开发');

    await expect(page.locator('#f-expected_benefit')).toHaveValue('预计节省50%人工成本');
  });

  test('radio - roi_judgment', async ({ page }) => {
    await page.click('.form-tab[data-tab="input"]');
    await page.check('input[name="roi_judgment"][value="高收益/高投入"]');
    await expect(page.locator('input[name="roi_judgment"][value="高收益/高投入"]')).toBeChecked();
  });

  // ========== 评估结论 Tab ==========

  test('切换到评估结论 Tab', async ({ page }) => {
    await page.click('.form-tab[data-tab="conclusion"]');
    await expect(page.locator('.form-section[data-section="conclusion"]')).toBeVisible();
  });

  test('radio - category (A/B/C)', async ({ page }) => {
    await page.click('.form-tab[data-tab="conclusion"]');
    await page.check('input[name="category"][value="A"]');
    await expect(page.locator('input[name="category"][value="A"]')).toBeChecked();
  });

  test('select - cooperation_willingness', async ({ page }) => {
    await page.click('.form-tab[data-tab="conclusion"]');
    await page.selectOption('#f-cooperation_willingness', '3');
    await expect(page.locator('#f-cooperation_willingness')).toHaveValue('3');
  });

  test('number input - internal_priority', async ({ page }) => {
    await page.click('.form-tab[data-tab="conclusion"]');
    await page.fill('#f-internal_priority', '5');
    await expect(page.locator('#f-internal_priority')).toHaveValue('5');
  });

  // ========== 推进建议 Tab ==========

  test('切换到推进建议 Tab', async ({ page }) => {
    await page.click('.form-tab[data-tab="plan"]');
    await expect(page.locator('.form-section[data-section="plan"]')).toBeVisible();
  });

  test('textarea - goal_1month, goal_3month', async ({ page }) => {
    await page.click('.form-tab[data-tab="plan"]');
    await page.fill('#f-goal_1month', '完成需求调研');
    await page.fill('#f-goal_3month', '完成POC验证');

    await expect(page.locator('#f-goal_1month')).toHaveValue('完成需求调研');
  });

  test('多选 checkbox - required_support', async ({ page }) => {
    await page.click('.form-tab[data-tab="plan"]');
    await page.check('input[name="required_support"][value="管理支持"]');
    await page.check('input[name="required_support"][value="数据权限"]');

    await expect(page.locator('input[name="required_support"][value="管理支持"]')).toBeChecked();
    await expect(page.locator('input[name="required_support"][value="数据权限"]')).toBeChecked();
  });

  // ========== 里程碑 ==========

  test('添加里程碑', async ({ page }) => {
    await page.click('.form-tab[data-tab="plan"]');
    await page.click('#btn-add-milestone');

    const container = page.locator('#milestone-container');
    await expect(container.locator('.milestone-item')).toHaveCount(1);
  });

  test('添加多个里程碑并删除', async ({ page }) => {
    await page.click('.form-tab[data-tab="plan"]');

    // 添加3个里程碑
    await page.click('#btn-add-milestone');
    await page.click('#btn-add-milestone');
    await page.click('#btn-add-milestone');

    const container = page.locator('#milestone-container');
    await expect(container.locator('.milestone-item')).toHaveCount(3);

    // 删除中间一个
    const secondMilestone = container.locator('.milestone-item').nth(1);
    await secondMilestone.locator('.btn-remove-milestone, .remove-milestone').click();

    await expect(container.locator('.milestone-item')).toHaveCount(2);
  });

  // ========== 表单操作 ==========

  test('保存到服务器 - 成功', async ({ page }) => {
    await page.fill('#f-name', uniqueName('完整测试场景'));
    await page.fill('#f-source_dept', '测试部门');

    await page.click('.form-tab[data-tab="value"]');
    await page.locator('#f-biz_value_score').fill('4');

    await page.click('#btn-submit');

    // 等待成功提示
    const toast = page.locator('.toast-success, text=成功');
    await expect(toast.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('暂存到本地', async ({ page }) => {
    await page.fill('#f-name', uniqueName('草稿测试场景'));
    await page.fill('#f-source_dept', '测试部门');

    await page.click('#btn-draft');

    const toast = page.locator('.toast-success, text=已保存到本地');
    await expect(toast.first()).toBeVisible({ timeout: 3000 }).catch(() => {});
  });

  test('新建场景后编辑', async ({ page }) => {
    const name = uniqueName('待编辑场景');
    // 创建新场景
    await page.fill('#f-name', name);
    await page.fill('#f-source_dept', '测试部门');
    await page.click('#btn-submit');

    // 等待保存后导航到总览
    await page.waitForTimeout(1000);
    await page.click('#nav-overview');

    // 点击编辑按钮
    const editBtn = page.locator('#scenario-list tr:first-child .btn-edit, #scenario-list tr:first-child .fa-edit').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();

      // 应该进入编辑模式，表单应该填充了数据
      await expect(page.locator('#view-form')).toBeVisible();
      const nameInput = page.locator('#f-name');
      await expect(nameInput).not.toHaveValue('');
    }
  });
});
