// 填报界面
const FormView = {
    isEdit: false,
    sceneId: null,
    sceneCode: null,
    milestones: [],
    draftTimeout: null,
    isSubmitting: false,  // 防止重复提交

    async onEnter(params = {}) {
        // 重置状态，防止残留的提交状态影响本次操作
        this.isSubmitting = false;
        this._isDirty = false;  // 重置修改标记
        // 重置按钮状态
        const submitBtn = document.getElementById('btn-submit');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        this.isEdit = !!params.id;
        this.sceneId = params.id || null;

        // 检查是否有需要恢复的草稿（从总览页点击恢复）
        const draftToRestore = window.__draftToRestore;
        delete window.__draftToRestore;

        if (this.isEdit) {
            await this.loadScenario();
            document.getElementById('form-title').innerHTML = '<i class="fas fa-edit mr-2 text-indigo-600"></i>编辑场景';
        } else {
            this.resetForm();
            document.getElementById('form-title').innerHTML = '<i class="fas fa-plus-circle mr-2 text-indigo-600"></i>新建场景';

            // 如果有草稿需要恢复
            if (draftToRestore) {
                const draft = API.loadDraft(draftToRestore);
                if (draft && draft.data) {
                    this.sceneCode = draftToRestore;
                    this.restoreDraft(draft.data);
                    Toast.info('已恢复本地草稿');
                }
            } else {
                // 检查是否有自动保存的草稿
                this.checkDraft();
            }
        }

        this.bindEvents();
        this.initScoreListeners();
        this.bindTabEvents();
        this.bindMilestoneEvents();
    },

    async loadScenario() {
        try {
            const scenario = await API.getScenario(this.sceneId);
            this.sceneCode = scenario.scene_code;

            // 重置所有可能残留状态的表单控件
            this.resetFormState();

            // 填充表单
            document.getElementById('form-scene-id').value = scenario.id;

            const fields = [
                'name', 'group_name', 'source_dept', 'reporter', 'contact', 'contact_ext',
                'business_background', 'ai_goals', 'current_status', 'progress',
                'current_problems', 'maturity_level', 'lifecycle_status',
                'director_status', 'director_name', 'director_note',
                'expected_benefit', 'required_investment', 'roi_judgment',
                'category', 'category_reason', 'cooperation_willingness',
                'internal_priority', 'goal_1month', 'goal_3month',
                'next_followup_date',
                // 新增字段
                'business_participants', 'participating_posts', 'business_flow',
                'other_problem_reason', 'current_project_desc', 'revival_conclusion'
            ];

            fields.forEach(field => {
                const el = document.getElementById(`f-${field}`);
                if (el) el.value = scenario[field] || '';
            });

            // 多选字段
            if (scenario.existing_problems) {
                scenario.existing_problems.forEach(problem => {
                    const checkbox = document.querySelector(`input[name="existing_problems"][value="${problem}"]`);
                    if (checkbox) checkbox.checked = true;
                    // 检查"其他"选项
                    if (problem === '其他' && scenario.other_problem_reason) {
                        const chkOther = document.getElementById('chk-other-problem');
                        if (chkOther) chkOther.checked = true;
                        toggleOtherProblem();
                        document.getElementById('f-other_problem_reason').value = scenario.other_problem_reason || '';
                    }
                });
            }

            if (scenario.required_support) {
                scenario.required_support.forEach(support => {
                    const checkbox = document.querySelector(`input[name="required_support"][value="${support}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            // 盘活路径多选
            if (scenario.revival_path_options) {
                scenario.revival_path_options.forEach(path => {
                    const checkbox = document.querySelector(`input[name="revival_path_options"][value="${path}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            // 推进路径多选
            if (scenario.promotion_path_options) {
                scenario.promotion_path_options.forEach(path => {
                    const checkbox = document.querySelector(`input[name="promotion_path_options"][value="${path}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            // 单选字段
            if (scenario.is_repeat) {
                document.querySelector('input[name="is_repeat"][value="true"]').checked = true;
                // 显示已选择的重复场景
                const selectorDiv = document.getElementById('div-repeat-selector');
                const selectedCodeSpan = document.getElementById('selected-repeat-code');
                const repeatCodes = document.getElementById('f-repeat_codes');
                if (scenario.repeat_codes) {
                    if (repeatCodes) repeatCodes.value = scenario.repeat_codes;
                    if (selectorDiv) selectorDiv.classList.remove('hidden');
                    if (selectedCodeSpan) selectedCodeSpan.textContent = scenario.repeat_codes;
                }
            }
            if (scenario.roi_judgment) {
                const radio = document.querySelector(`input[name="roi_judgment"][value="${scenario.roi_judgment}"]`);
                if (radio) radio.checked = true;
            }
            // 评估结论 category - 直接设置，不依赖旧值
            const categoryRadio = document.querySelector(`input[name="category"][value="${scenario.category || ''}"]`);
            if (categoryRadio) categoryRadio.checked = true;

            // 当前应用现状
            if (scenario.current_project_status) {
                document.getElementById('status-has-project').checked = true;
                toggleProjectStatus();
                if (scenario.current_project_desc) {
                    document.getElementById('f-current_project_desc').value = scenario.current_project_desc;
                }
            } else {
                document.getElementById('status-no-project').checked = true;
            }

            // 预期收益明细
            if (scenario.expected_benefit_details) {
                const details = scenario.expected_benefit_details;
                if (details.saved_hours) document.getElementById('f-expected_saved_hours').value = details.saved_hours;
                if (details.efficiency) document.getElementById('f-expected_efficiency').value = details.efficiency;
                if (details.quality) document.getElementById('f-expected_quality').value = details.quality;
                if (details.risk_reduction) document.getElementById('f-expected_risk_reduction').value = details.risk_reduction;
                if (details.org_capability) document.getElementById('f-expected_org_capability').value = details.org_capability;
            }

            // 所需投入明细
            if (scenario.required_investment_details) {
                const details = scenario.required_investment_details;
                if (details.personnel) document.getElementById('f-investment_personnel').value = details.personnel;
                if (details.timeline) document.getElementById('f-investment_timeline').value = details.timeline;
                if (details.tools) document.getElementById('f-investment_tools').value = details.tools;
                if (details.data) document.getElementById('f-investment_data').value = details.data;
                if (details.coordination) document.getElementById('f-investment_coordination').value = details.coordination;
            }

            // 评分
            const scores = ['biz_value', 'pain_point', 'frequency', 'feasibility', 'replicability', 'ai_fit', 'risk_control'];
            scores.forEach(score => {
                const el = document.getElementById(`f-${score}_score`);
                const display = document.getElementById(`${score}_display`);
                if (el && scenario[`${score}_score`]) {
                    el.value = scenario[`${score}_score`];
                    if (display) display.textContent = scenario[`${score}_score`];
                }
            });
            this.updateTotalScore();

            // 里程碑 - 过滤掉空白的里程碑
            this.milestones = (scenario.milestone || []).filter(m => m.name && m.name.trim() !== '');
            this.renderMilestones();

            // 检查本地草稿
            this.checkDraft();

        } catch (error) {
            Toast.error('加载场景失败');
            Router.toOverview();
        }
    },

    resetForm() {
        this._isDirty = false;
        document.getElementById('scenario-form').reset();
        document.getElementById('form-scene-id').value = '';
        this.sceneCode = null;
        this.milestones = [];

        // 重置评分显示
        const scores = ['biz_value', 'pain_point', 'frequency', 'feasibility', 'replicability', 'ai_fit', 'risk_control'];
        scores.forEach(score => {
            const el = document.getElementById(`f-${score}_score`);
            const display = document.getElementById(`${score}_display`);
            if (el) el.value = 3;
            if (display) display.textContent = '3';
        });
        this.updateTotalScore();

        this.renderMilestones();

        // 设置默认下次跟进时间（1个月后）
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        document.getElementById('f-next_followup_date').value = nextMonth.toISOString().split('T')[0];
    },

    // 重置表单控件状态（不清除数据），用于切换场景时清除残留状态
    resetFormState() {
        // 重置所有 checkbox 多选按钮
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });

        // 重置所有 radio 单选按钮
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.checked = false;
        });

        // 隐藏重复场景选择器
        const selectorDiv = document.getElementById('div-repeat-selector');
        if (selectorDiv) selectorDiv.classList.add('hidden');

        // 隐藏"其他问题"输入框
        const otherProblemDiv = document.getElementById('div-other-problem');
        if (otherProblemDiv) otherProblemDiv.classList.add('hidden');

        // 重置 is_repeat 为 false
        document.querySelector('input[name="is_repeat"][value="false"]')?.click();
    },

    checkDraft() {
        if (!this.sceneCode) return;

        const draft = API.loadDraft(this.sceneCode);
        if (draft) {
            Modal.confirm('发现本地草稿，是否恢复？', () => {
                this.restoreDraft(draft.data);
                Toast.info('已恢复草稿');
            });
        }
    },

    restoreDraft(data) {
        Object.keys(data).forEach(key => {
            const el = document.getElementById(`f-${key}`);
            if (el) el.value = data[key];
        });
    },

    getFormData() {
        // 收集所有字段
        const fields = [
            'name', 'group_name', 'source_dept', 'reporter', 'contact', 'contact_ext',
            'business_background', 'ai_goals', 'current_status', 'progress',
            'current_problems', 'maturity_level', 'lifecycle_status',
            'director_status', 'director_name', 'director_note',
            'expected_benefit', 'required_investment',
            'category', 'category_reason', 'cooperation_willingness',
            'internal_priority', 'goal_1month', 'goal_3month', 'next_followup_date',
            // 新增字段
            'business_participants', 'participating_posts', 'business_flow',
            'other_problem_reason', 'current_project_desc', 'revival_conclusion'
        ];

        const data = {};

        fields.forEach(field => {
            const el = document.getElementById(`f-${field}`);
            if (el) {
                const value = el.value;
                // 整数字段需要转换类型，空值时跳过让后端使用默认值
                if (['maturity_level', 'director_status', 'cooperation_willingness', 'internal_priority'].includes(field)) {
                    if (value === '') return; // 跳过空值，让 Pydantic 使用默认值
                    data[field] = parseInt(value, 10);
                } else if (field === 'next_followup_date' && value === '') {
                    // 日期字段为空时设为 null
                    data[field] = null;
                } else {
                    data[field] = value;
                }
            }
        });

        // 多选 - 现存问题
        data.existing_problems = Array.from(
            document.querySelectorAll('input[name="existing_problems"]:checked')
        ).map(cb => cb.value);

        // 多选 - 所需支持
        data.required_support = Array.from(
            document.querySelectorAll('input[name="required_support"]:checked')
        ).map(cb => cb.value);

        // 多选 - 盘活路径
        data.revival_path_options = Array.from(
            document.querySelectorAll('input[name="revival_path_options"]:checked')
        ).map(cb => cb.value);

        // 多选 - 推进路径
        data.promotion_path_options = Array.from(
            document.querySelectorAll('input[name="promotion_path_options"]:checked')
        ).map(cb => cb.value);

        // ROI 综合判断（radio button）
        const roiSelected = document.querySelector('input[name="roi_judgment"]:checked');
        if (roiSelected) {
            data.roi_judgment = roiSelected.value;
        }

        // 评估结论 category（radio button）
        const categorySelected = document.querySelector('input[name="category"]:checked');
        if (categorySelected) {
            data.category = categorySelected.value;
        }

        // 单选
        data.is_repeat = document.querySelector('input[name="is_repeat"]:checked')?.value === 'true';
        data.current_project_status = document.getElementById('status-has-project')?.checked || false;

        // 评分
        const scores = ['biz_value', 'pain_point', 'frequency', 'feasibility', 'replicability', 'ai_fit', 'risk_control'];
        scores.forEach(score => {
            const el = document.getElementById(`f-${score}_score`);
            if (el) data[`${score}_score`] = parseInt(el.value) || 0;
        });

        // 里程碑 - 只保存有内容的里程碑
        data.milestone = this.milestones.filter(m => m.name && m.name.trim() !== '');

        // 预期收益明细（5项）
        data.expected_benefit_details = {
            saved_hours: document.getElementById('f-expected_saved_hours')?.value || '',
            efficiency: document.getElementById('f-expected_efficiency')?.value || '',
            quality: document.getElementById('f-expected_quality')?.value || '',
            risk_reduction: document.getElementById('f-expected_risk_reduction')?.value || '',
            org_capability: document.getElementById('f-expected_org_capability')?.value || ''
        };

        // 所需投入明细（5项）
        data.required_investment_details = {
            personnel: document.getElementById('f-investment_personnel')?.value || '',
            timeline: document.getElementById('f-investment_timeline')?.value || '',
            tools: document.getElementById('f-investment_tools')?.value || '',
            data: document.getElementById('f-investment_data')?.value || '',
            coordination: document.getElementById('f-investment_coordination')?.value || ''
        };

        return data;
    },

    bindEvents() {
        // 保存到服务器 - 使用命名函数以便移除旧监听器
        // 只在第一次绑定，避免重复
        if (!this._eventsBound) {
            this._eventsBound = true;
            this._submitHandler = (e) => {
                e.preventDefault();
                this.submitHandler();
            };
            this._draftHandler = () => this.saveDraft();
            this._autoSaveHandler = () => {
                clearTimeout(this.draftTimeout);
                this.draftTimeout = setTimeout(() => this.autoSaveDraft(), 2000);
            };
            this._backHandler = () => this.handleBack();

            const btnSubmit = document.getElementById('btn-submit');
            const btnDraft = document.getElementById('btn-draft');
            const btnBack = document.getElementById('btn-form-back');
            const form = document.getElementById('scenario-form');

            btnSubmit?.addEventListener('click', this._submitHandler);
            btnDraft?.addEventListener('click', this._draftHandler);
            btnBack?.addEventListener('click', this._backHandler);
            form?.addEventListener('input', () => {
                this._isDirty = true;
                this._autoSaveHandler();
            });

            // 绑定重复场景选择器事件
            this.bindRepeatSelectorEvents();
        }
    },

    handleBack() {
        if (this._isDirty) {
            Modal.confirm('有未保存的修改，确定要放弃并返回吗？', () => {
                Router.toOverview();
            });
        } else {
            Router.toOverview();
        }
    },

    bindRepeatSelectorEvents() {
        const repeatYes = document.querySelector('input[name="is_repeat"][value="true"]');
        repeatYes?.addEventListener('change', () => {
            if (repeatYes.checked) {
                this.showScenarioSelector();
            }
        });

        // 关闭按钮
        document.getElementById('btn-close-scenario-selector')?.addEventListener('click', () => {
            this.closeScenarioSelector();
        });

        // 搜索输入
        let searchTimeout = null;
        document.getElementById('scenario-search-input')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchScenarios(e.target.value);
            }, 300);
        });
    },

    async showScenarioSelector() {
        const modal = document.getElementById('scenario-selector-modal');
        const listContainer = document.getElementById('scenario-selector-list');
        modal?.classList.remove('hidden');
        listContainer.innerHTML = '<p class="text-center text-gray-500 py-4">加载中...</p>';

        // 初始加载所有场景
        try {
            const scenarios = await API.getScenarios();
            this.renderScenarioSelectorList(scenarios);
        } catch (error) {
            listContainer.innerHTML = '<p class="text-center text-red-500 py-4">加载失败</p>';
        }
    },

    async searchScenarios(query) {
        const listContainer = document.getElementById('scenario-selector-list');
        if (!query.trim()) {
            // 空搜索时加载所有
            try {
                const scenarios = await API.getScenarios();
                this.renderScenarioSelectorList(scenarios);
            } catch (error) {
                listContainer.innerHTML = '<p class="text-center text-red-500 py-4">搜索失败</p>';
            }
            return;
        }

        listContainer.innerHTML = '<p class="text-center text-gray-500 py-4">搜索中...</p>';
        try {
            const scenarios = await API.searchScenarios(query);
            this.renderScenarioSelectorList(scenarios);
        } catch (error) {
            listContainer.innerHTML = '<p class="text-center text-red-500 py-4">搜索失败</p>';
        }
    },

    renderScenarioSelectorList(scenarios) {
        const listContainer = document.getElementById('scenario-selector-list');
        if (!scenarios || scenarios.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-gray-500 py-4">没有找到匹配的场景</p>';
            return;
        }

        listContainer.innerHTML = scenarios.map(s => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                 onclick="FormView.selectRepeatScenario('${s.scene_code}', ${s.id})">
                <div>
                    <p class="font-medium text-gray-800">${s.name}</p>
                    <p class="text-xs text-gray-500">${s.scene_code} | ${s.source_dept || '-'}</p>
                </div>
                <div class="text-right">
                    <span class="badge badge-l${s.maturity_level}">L${s.maturity_level}</span>
                    <span class="badge badge-category-${(s.category || 'a').toLowerCase()}">${s.category || '-'}类</span>
                </div>
            </div>
        `).join('');
    },

    selectRepeatScenario(sceneCode, sceneId) {
        // 设置 repeat_codes
        const currentCodes = document.getElementById('f-repeat_codes');
        if (currentCodes) {
            currentCodes.value = sceneCode;
        }
        // 显示已选择的场景
        const selectorDiv = document.getElementById('div-repeat-selector');
        const selectedCodeSpan = document.getElementById('selected-repeat-code');
        if (selectorDiv) selectorDiv.classList.remove('hidden');
        if (selectedCodeSpan) selectedCodeSpan.textContent = sceneCode;
        // 关闭模态框
        this.closeScenarioSelector();
        Toast.info(`已选择与场景 ${sceneCode} 重复`);
    },

    closeScenarioSelector() {
        document.getElementById('scenario-selector-modal')?.classList.add('hidden');
        document.getElementById('scenario-search-input').value = '';
    },

    async submitHandler() {
        // 防止重复提交
        if (this.isSubmitting) {
            return;
        }
        this.isSubmitting = true;

        // 清除自动保存定时器，防止提交后再次保存草稿
        clearTimeout(this.draftTimeout);

        // 禁用提交按钮
        const submitBtn = document.getElementById('btn-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        await this.submit();
    },

    _resetSubmitButton() {
        const submitBtn = document.getElementById('btn-submit');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    },

    bindTabEvents() {
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const section = tab.dataset.tab;

                // 更新 Tab 状态
                document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // 更新 Section 显示
                document.querySelectorAll('.form-section').forEach(s => s.classList.add('hidden'));
                document.querySelector(`.form-section[data-section="${section}"]`)?.classList.remove('hidden');
            });
        });

        // 默认显示第一个 Tab
        document.querySelector('.form-tab')?.click();
    },

    bindMilestoneEvents() {
        document.getElementById('btn-add-milestone')?.addEventListener('click', () => {
            this.milestones.push({ name: '', plan_date: '', status: '未开始' });
            this.renderMilestones();
        });
    },

    renderMilestones() {
        const container = document.getElementById('milestone-container');
        container.innerHTML = this.milestones.map((m, i) => `
            <div class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <input type="text" placeholder="里程碑名称" value="${m.name || ''}"
                    class="flex-1 border rounded px-2 py-1 text-sm"
                    onchange="FormView.updateMilestone(${i}, 'name', this.value)">
                <input type="date" value="${m.plan_date || ''}"
                    class="border rounded px-2 py-1 text-sm"
                    onchange="FormView.updateMilestone(${i}, 'plan_date', this.value)">
                <select class="border rounded px-2 py-1 text-sm"
                    onchange="FormView.updateMilestone(${i}, 'status', this.value)">
                    <option value="未开始" ${m.status === '未开始' ? 'selected' : ''}>未开始</option>
                    <option value="进行中" ${m.status === '进行中' ? 'selected' : ''}>进行中</option>
                    <option value="已完成" ${m.status === '已完成' ? 'selected' : ''}>已完成</option>
                </select>
                <button type="button" onclick="FormView.removeMilestone(${i})" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    },

    updateMilestone(index, field, value) {
        if (this.milestones[index]) {
            this.milestones[index][field] = value;
        }
    },

    removeMilestone(index) {
        this.milestones.splice(index, 1);
        this.renderMilestones();
    },

    initScoreListeners() {
        const scores = ['biz_value', 'pain_point', 'frequency', 'feasibility', 'replicability', 'ai_fit', 'risk_control'];
        scores.forEach(score => {
            const el = document.getElementById(`f-${score}_score`);
            const display = document.getElementById(`${score}_display`);
            if (el) {
                el.addEventListener('input', () => {
                    if (display) display.textContent = el.value;
                    this.updateTotalScore();
                });
            }
        });
    },

    updateTotalScore() {
        const scores = ['biz_value', 'pain_point', 'frequency', 'feasibility', 'replicability', 'ai_fit', 'risk_control'];
        let total = 0;
        scores.forEach(score => {
            const el = document.getElementById(`f-${score}_score`);
            if (el) total += parseInt(el.value) || 0;
        });
        document.getElementById('total-score-display').textContent = total;
    },

    async submit() {
        try {
            const data = this.getFormData();

            // 验证必填字段
            if (!data.name) {
                Toast.error('请填写场景名称');
                return;
            }
            if (!data.source_dept) {
                Toast.error('请填写来源部门');
                return;
            }

            if (this.isEdit) {
                await API.updateScenario(this.sceneId, data);
                Toast.success('保存成功');
            } else {
                const result = await API.createScenario(data);
                this.sceneId = result.id;
                this.sceneCode = result.scene_code;
                this.isEdit = true;
                document.getElementById('form-scene-id').value = result.id;
                Toast.success('创建成功');
            }

            // 清除修改标记
            this._isDirty = false;

            // 清除草稿
            if (this.sceneCode) {
                API.clearDraft(this.sceneCode);
            }

            // 返回总览
            Router.toOverview();

        } catch (error) {
            Toast.error(error.message || '保存失败');
        } finally {
            this.isSubmitting = false;
            // 恢复提交按钮
            const submitBtn = document.getElementById('btn-submit');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    },

    saveDraft() {
        if (!this.sceneCode) {
            // 新建场景时，先生成临时编号
            this.sceneCode = `draft_${Date.now()}`;
        }

        const data = this.getFormData();
        API.saveDraft(this.sceneCode, data);
        Toast.success('已保存到本地');
    },

    autoSaveDraft() {
        if (!this.sceneCode) return;
        const data = this.getFormData();
        API.saveDraft(this.sceneCode, data);
    }
};

// 暴露到全局
window.FormView = FormView;
