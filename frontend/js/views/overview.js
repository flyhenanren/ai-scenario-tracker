// 总览界面
const OverviewView = {
    scenarios: [],

    async onEnter(params = {}) {
        await this.loadScenarios();
        await this.loadStats();
        await this.loadDrafts();
        this.bindEvents();
    },

    async loadDrafts() {
        try {
            const drafts = API.getAllDrafts();
            this.renderDrafts(drafts);
        } catch (error) {
            console.error('加载草稿失败', error);
        }
    },

    renderDrafts(drafts) {
        const container = document.getElementById('drafts-section');
        const listContainer = document.getElementById('drafts-list');

        const draftKeys = Object.keys(drafts);
        if (draftKeys.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');

        listContainer.innerHTML = draftKeys.map(key => {
            const draft = JSON.parse(drafts[key]);
            const sceneName = draft.data?.name || '未命名场景';
            const savedAt = new Date(draft.savedAt).toLocaleString();
            // 从 key 中提取 sceneCode（如 draft_xxx）
            const sceneCode = key.replace('draft_', '');

            return `
                <div class="flex items-center justify-between bg-white rounded p-3">
                    <div>
                        <p class="font-medium text-gray-800">${sceneName}</p>
                        <p class="text-xs text-gray-500">${savedAt}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="OverviewView.restoreDraft('${sceneCode}')" class="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">
                            <i class="fas fa-undo mr-1"></i>恢复
                        </button>
                        <button onclick="OverviewView.deleteDraft('${sceneCode}')" class="px-3 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 text-sm">
                            <i class="fas fa-trash mr-1"></i>删除
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    restoreDraft(sceneCode) {
        Modal.confirm('确定要恢复本地草稿吗？当前未保存的内容将被覆盖。', () => {
            // 先设置标记，再导航，让 FormView.onEnter() 能读取到
            window.__draftToRestore = sceneCode;
            Router.toForm();
        });
    },

    deleteDraft(sceneCode) {
        Modal.confirm('确定要删除这个本地草稿吗？', () => {
            API.clearDraft(sceneCode);
            Toast.success('草稿已删除');
            this.loadDrafts();
        });
    },

    async loadStats() {
        try {
            const stats = await API.getStats();
            document.getElementById('stat-total').textContent = stats.total || 0;
            document.getElementById('stat-active').textContent = stats.by_lifecycle['推进中'] || 0;
            document.getElementById('stat-followup').textContent = stats.need_followup_count || 0;
            document.getElementById('stat-overdue').textContent = stats.overdue_count || 0;
            document.getElementById('stat-completed').textContent = stats.by_lifecycle['已完成'] || 0;
        } catch (error) {
            Toast.error('加载统计数据失败');
        }
    },

    async loadScenarios(filters = {}) {
        try {
            this.scenarios = await API.getScenarios(filters);
            this.renderList();
            this.renderDeptFilter();
        } catch (error) {
            Toast.error('加载场景列表失败');
        }
    },

    renderDeptFilter() {
        const depts = [...new Set(this.scenarios.map(s => s.source_dept).filter(Boolean))];
        const deptSelect = document.getElementById('filter-dept');
        if (!deptSelect) return;
        const currentVal = deptSelect.value;
        deptSelect.innerHTML = '<option value="">全部</option>';
        depts.forEach(dept => {
            deptSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
        });
        deptSelect.value = currentVal;
    },

    renderList() {
        const tbody = document.getElementById('scenario-list');
        const emptyState = document.getElementById('empty-state');

        if (this.scenarios.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        const today = new Date().toISOString().split('T')[0];

        tbody.innerHTML = this.scenarios.map(scenario => {
            const isOverdue = scenario.next_followup_date && scenario.next_followup_date < today;
            const daysSince = scenario.last_followup_date
                ? Math.floor((new Date() - new Date(scenario.last_followup_date)) / (1000 * 60 * 60 * 24))
                : null;

            return `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-indigo-600">${scenario.scene_code}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">
                        <span class="cursor-pointer hover:text-indigo-600" onclick="Router.toDetail(${scenario.id})">${scenario.name}</span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500">${scenario.source_dept || '-'}</td>
                    <td class="px-4 py-3">
                        <span class="badge badge-l${scenario.maturity_level}">L${scenario.maturity_level}</span>
                    </td>
                    <td class="px-4 py-3">
                        ${scenario.category ? `<span class="badge badge-category-${scenario.category.toLowerCase()}">${scenario.category}类</span>` : '<span class="text-gray-400">-</span>'}
                    </td>
                    <td class="px-4 py-3">
                        <span class="badge-lifecycle badge-lifecycle-${scenario.lifecycle_status}">${scenario.lifecycle_status}</span>
                    </td>
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">${scenario.total_score || 0}</td>
                    <td class="px-4 py-3 text-sm">
                        <div>
                            ${scenario.next_followup_date || '-'}
                            ${isOverdue ? `<span class="badge badge-overdue ml-1">超期</span>` : ''}
                        </div>
                        ${daysSince !== null ? `<span class="text-xs text-gray-400">${daysSince}天前跟进</span>` : ''}
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex items-center space-x-2">
                            <button onclick="Router.toDetail(${scenario.id})" class="text-indigo-600 hover:text-indigo-800 text-sm" title="查看详情">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="Router.toForm(${scenario.id})" class="text-blue-600 hover:text-blue-800 text-sm" title="编辑">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="OverviewView.deleteScenario(${scenario.id}, '${scenario.name}')" class="text-red-600 hover:text-red-800 text-sm" title="删除">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    bindEvents() {
        // 筛选事件
        ['filter-dept', 'filter-maturity', 'filter-lifecycle', 'filter-category'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.applyFilters());
        });

        // 重置筛选
        document.getElementById('btn-reset-filter')?.addEventListener('click', () => {
            document.getElementById('filter-dept').value = '';
            document.getElementById('filter-maturity').value = '';
            document.getElementById('filter-lifecycle').value = '';
            document.getElementById('filter-category').value = '';
            this.loadScenarios();
        });

        // 新建按钮 - 使用标记防止重复绑定
        if (!this._navFormBound) {
            this._navFormBound = true;
            document.getElementById('nav-form')?.addEventListener('click', () => Router.toForm());
            document.getElementById('btn-create-first')?.addEventListener('click', () => Router.toForm());
        }

        // 关闭草稿区域
        document.getElementById('btn-hide-drafts')?.addEventListener('click', () => {
            document.getElementById('drafts-section')?.classList.add('hidden');
        });
    },

    applyFilters() {
        const filters = {};
        const dept = document.getElementById('filter-dept').value;
        const maturity = document.getElementById('filter-maturity').value;
        const lifecycle = document.getElementById('filter-lifecycle').value;
        const category = document.getElementById('filter-category').value;

        if (dept) filters.source_dept = dept;
        if (maturity) filters.maturity_level = parseInt(maturity);
        if (lifecycle) filters.lifecycle_status = lifecycle;
        if (category) filters.category = category;

        this.loadScenarios(filters);
    },

    async deleteScenario(id, name) {
        Modal.confirm(`确定要删除场景「${name}」吗？此操作不可恢复。`, async () => {
            try {
                await API.deleteScenario(id);
                Toast.success('删除成功');
                await this.loadScenarios();
                await this.loadStats();
            } catch (error) {
                Toast.error('删除失败');
            }
        });
    }
};

// 暴露到全局
window.OverviewView = OverviewView;
