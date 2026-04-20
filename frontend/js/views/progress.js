// 进度跟踪界面
const ProgressView = {
    overdueItems: [],

    async onEnter(params = {}) {
        await this.loadOverdue();
        await this.loadTimeline();
        this.bindEvents();
    },

    async loadOverdue() {
        try {
            this.overdueItems = await API.getOverdueFollowups();
            this.renderOverdueList();
        } catch (error) {
            Toast.error('加载超期数据失败');
        }
    },

    renderOverdueList() {
        const container = document.getElementById('overdue-items');
        const noOverdue = document.getElementById('no-overdue');

        if (this.overdueItems.length === 0) {
            container.innerHTML = '';
            noOverdue.classList.remove('hidden');
            return;
        }

        noOverdue.classList.add('hidden');

        container.innerHTML = this.overdueItems.map(item => {
            const badgeClass = item.days_overdue > 7 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
            const badgeText = item.days_overdue > 7 ? '紧急' : '提醒';

            return `
                <div class="bg-white border rounded-lg p-4 flex items-center justify-between card-hover">
                    <div class="flex items-center space-x-4">
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}">${badgeText}</span>
                        <div>
                            <p class="font-medium text-gray-900">${item.name}</p>
                            <p class="text-sm text-gray-500">${item.scene_code} · ${item.source_dept || '-'}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="text-right">
                            <p class="text-sm text-gray-500">下次跟进</p>
                            <p class="text-sm font-medium ${item.days_overdue > 7 ? 'text-red-600' : 'text-yellow-600'}">
                                ${item.next_followup_date} <span class="text-xs">(${item.days_overdue}天前)</span>
                            </p>
                        </div>
                        <button onclick="ProgressView.openFollowup(${item.id})" class="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                            <i class="fas fa-plus mr-1"></i>跟进
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    async loadTimeline() {
        try {
            const scenarios = await API.getScenarios();
            const container = document.getElementById('timeline-container');

            // 过滤出有更新的场景
            const recentScenarios = scenarios
                .filter(s => s.lifecycle_status !== '已废弃')
                .sort((a, b) => {
                    const dateA = a.last_followup_date ? new Date(a.last_followup_date) : new Date(0);
                    const dateB = b.last_followup_date ? new Date(b.last_followup_date) : new Date(0);
                    return dateB - dateA;
                })
                .slice(0, 20);

            if (recentScenarios.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8">暂无进度记录</p>';
                return;
            }

            container.innerHTML = recentScenarios.map(scenario => {
                const lastDate = scenario.last_followup_date
                    ? new Date(scenario.last_followup_date).toLocaleDateString()
                    : '暂无跟进';

                const statusColors = {
                    '对接中': 'bg-blue-100 text-blue-800',
                    '评估中': 'bg-indigo-100 text-indigo-800',
                    '推进中': 'bg-green-100 text-green-800',
                    '暂停': 'bg-gray-100 text-gray-800',
                    '已完成': 'bg-emerald-100 text-emerald-800'
                };

                const statusColor = statusColors[scenario.lifecycle_status] || 'bg-gray-100 text-gray-800';

                return `
                    <div class="bg-white border rounded-lg p-4 flex items-center justify-between card-hover">
                        <div class="flex items-center space-x-4">
                            <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <i class="fas fa-folder-open text-indigo-600"></i>
                            </div>
                            <div>
                                <p class="font-medium text-gray-900 cursor-pointer hover:text-indigo-600" onclick="Router.toDetail(${scenario.id})">${scenario.name}</p>
                                <p class="text-sm text-gray-500">${scenario.scene_code} · ${scenario.source_dept || '-'}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-6">
                            <div class="text-center">
                                <span class="px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">${scenario.lifecycle_status}</span>
                                <p class="text-xs text-gray-400 mt-1">状态</p>
                            </div>
                            <div class="text-center">
                                <span class="badge badge-l${scenario.maturity_level}">L${scenario.maturity_level}</span>
                                <p class="text-xs text-gray-400 mt-1">成熟度</p>
                            </div>
                            <div class="text-center">
                                <p class="text-sm font-medium text-gray-900">${lastDate}</p>
                                <p class="text-xs text-gray-400">最近跟进</p>
                            </div>
                            <button onclick="ProgressView.openFollowup(${scenario.id})" class="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                                <i class="fas fa-plus mr-1"></i>跟进
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            Toast.error('加载时间线数据失败');
        }
    },

    bindEvents() {
        // 只绑定一次事件，防止重复绑定
        if (this._eventsBound) return;
        this._eventsBound = true;

        // 跟进 Modal 事件
        document.getElementById('btn-close-followup')?.addEventListener('click', () => this.closeFollowupModal());
        document.getElementById('btn-cancel-followup')?.addEventListener('click', () => this.closeFollowupModal());
        document.getElementById('followup-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitFollowup();
        });
    },

    openFollowup(sceneId, onSuccess) {
        // 确保事件已绑定（在详情页打开跟进modal时，ProgressView可能还未初始化）
        if (!this._eventsBound) {
            this.bindEvents();
        }

        document.getElementById('fu-scene-id').value = sceneId;
        // 保存回调引用，用于保存成功后刷新
        this._followupSuccessCallback = onSuccess;

        // 设置默认值
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        document.getElementById('fu-next_followup_date').value = nextMonth.toISOString().split('T')[0];

        document.getElementById('followup-modal').classList.remove('hidden');
    },

    closeFollowupModal() {
        document.getElementById('followup-modal').classList.add('hidden');
        document.getElementById('followup-form').reset();
        this._followupSuccessCallback = null;
    },

    async submitFollowup() {
        const sceneId = document.getElementById('fu-scene-id').value;
        if (!sceneId) {
            Toast.error('场景ID无效');
            return;
        }

        const data = {
            followup_by: document.getElementById('fu-followup_by').value,
            interval_type: document.getElementById('fu-interval_type').value,
            lifecycle_status: document.getElementById('fu-lifecycle_status').value,
            maturity_level: parseInt(document.getElementById('fu-maturity_level').value),
            category: document.getElementById('fu-category').value || undefined,
            cooperation_willingness: parseInt(document.getElementById('fu-cooperation_willingness').value),
            progress_summary: document.getElementById('fu-progress_summary').value,
            problems: document.getElementById('fu-problems').value,
            next_plan: document.getElementById('fu-next_plan').value,
            next_followup_date: document.getElementById('fu-next_followup_date').value || undefined
        };

        try {
            await API.createFollowup(parseInt(sceneId), data);
            Toast.success('跟进记录已保存');
            // 先保存回调引用，再关闭modal（closeFollowupModal会清除回调）
            const callback = this._followupSuccessCallback;
            this.closeFollowupModal();
            // 调用保存成功回调（如果有）
            if (callback) {
                await callback();
            }
            await this.loadOverdue();
            await this.loadTimeline();
        } catch (error) {
            Toast.error(error.message || '保存跟进记录失败');
        }
    }
};

// 暴露到全局
window.ProgressView = ProgressView;
