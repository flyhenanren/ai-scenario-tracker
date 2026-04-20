// 单场景完整视图
const DetailView = {
    sceneId: null,
    scenario: null,

    async onEnter(params = {}) {
        this.sceneId = params.id;
        if (!this.sceneId) {
            Router.toOverview();
            return;
        }

        await this.loadScenario();
        await this.loadFollowups();
        this.bindEvents();
    },

    async loadScenario() {
        try {
            this.scenario = await API.getScenario(this.sceneId);
            this.renderDetail();
        } catch (error) {
            Toast.error('加载场景详情失败');
            Router.toOverview();
        }
    },

    renderDetail() {
        const s = this.scenario;

        document.getElementById('detail-title').textContent = s.name;
        document.getElementById('detail-code').textContent = s.scene_code;
        document.getElementById('detail-maturity').textContent = `L${s.maturity_level} ${this.getMaturityLabel(s.maturity_level)}`;
        document.getElementById('detail-category').textContent = s.category ? `${s.category}类` : '-';
        document.getElementById('detail-score').textContent = s.total_score || 0;
        document.getElementById('detail-name').textContent = s.name;
        document.getElementById('detail-dept').textContent = s.source_dept || '-';
        document.getElementById('detail-reporter').textContent = s.reporter || '-';
        document.getElementById('detail-lifecycle').textContent = s.lifecycle_status;
        document.getElementById('detail-willingness').textContent = this.getWillingnessLabel(s.cooperation_willingness);
        document.getElementById('detail-background').textContent = s.business_background || '暂无';
        document.getElementById('detail-goals').textContent = s.ai_goals || '暂无';

        // 里程碑
        this.renderMilestones();

        // 更新按钮链接
        document.getElementById('btn-edit-detail').onclick = () => Router.toForm(this.sceneId);
        document.getElementById('btn-followup-detail').onclick = () => ProgressView.openFollowup(this.sceneId, () => this.loadFollowups());
    },

    getMaturityLabel(level) {
        const labels = {
            1: '概念阶段',
            2: '试用阶段',
            3: '试点阶段',
            4: '推广阶段',
            5: '机制化阶段'
        };
        return labels[level] || '';
    },

    getWillingnessLabel(level) {
        const labels = {
            0: '未知',
            1: '低',
            2: '中',
            3: '高'
        };
        return labels[level] || '未知';
    },

    renderMilestones() {
        const container = document.getElementById('detail-milestones');
        const milestones = this.scenario.milestone || [];

        if (milestones.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm">暂无里程碑</p>';
            return;
        }

        container.innerHTML = milestones.map((m, i) => {
            const statusClass = {
                '未开始': 'bg-gray-100 text-gray-600',
                '进行中': 'bg-blue-100 text-blue-600',
                '已完成': 'bg-green-100 text-green-600'
            }[m.status] || 'bg-gray-100 text-gray-600';

            return `
                <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div class="flex items-center space-x-3">
                        <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs
                            ${m.status === '已完成' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}">
                            ${m.status === '已完成' ? '✓' : i + 1}
                        </span>
                        <span class="text-sm text-gray-700">${m.name || `里程碑 ${i + 1}`}</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-xs text-gray-500">${m.plan_date || '-'}</span>
                        <span class="px-2 py-0.5 rounded text-xs font-medium ${statusClass}">${m.status}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    async loadFollowups() {
        try {
            const result = await API.getFollowups(this.sceneId);
            this.renderFollowups(result.followups);
        } catch (error) {
            Toast.error('加载跟进记录失败');
        }
    },

    renderFollowups(followups) {
        const container = document.getElementById('detail-followups');
        const noFollowups = document.getElementById('no-followups');

        if (!followups || followups.length === 0) {
            container.innerHTML = '';
            noFollowups.classList.remove('hidden');
            return;
        }

        noFollowups.classList.add('hidden');

        container.innerHTML = followups.map(f => {
            const date = new Date(f.followup_date).toLocaleDateString();
            const maturityChanged = f.maturity_changed ? `(已变更${f.maturity_change_desc || ''})` : '';
            const categoryChanged = f.category_changed ? `(已调整：${f.category_change_reason || ''})` : '';
            const willingnessChanged = f.cooperation_changed ? `(变化原因：${f.cooperation_change_reason || ''})` : '';

            return `
                <div class="border-l-2 border-indigo-200 pl-3 py-2 cursor-pointer hover:bg-gray-50 rounded"
                     onclick="DetailView.toggleFollowupDetail(${f.id})">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-medium text-indigo-600">第${f.followup_round}轮跟进</span>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs text-gray-400">${date}</span>
                            <i class="fas fa-chevron-down text-xs text-gray-400" id="chevron-${f.id}"></i>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 mb-1">
                        <span class="text-gray-400">状态：</span>${f.lifecycle_status}
                        ${f.maturity_level ? ` | 成熟度：L${f.maturity_level}${maturityChanged}` : ''}
                        ${f.category ? ` | 分类：${f.category}类${categoryChanged}` : ''}
                    </p>
                    <p class="text-xs text-gray-500">${f.followup_by || '未知跟进人'}</p>
                </div>
                <div id="followup-detail-${f.id}" class="hidden pl-4 mt-1 mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                    <div class="space-y-2 text-sm">
                        ${f.progress_summary ? `
                            <div>
                                <span class="text-gray-500 font-medium">主要进展：</span>
                                <p class="text-gray-700">${f.progress_summary}</p>
                            </div>
                        ` : ''}
                        ${f.problems ? `
                            <div>
                                <span class="text-gray-500 font-medium">主要问题/障碍：</span>
                                <p class="text-gray-700">${f.problems}</p>
                            </div>
                        ` : ''}
                        ${f.next_plan ? `
                            <div>
                                <span class="text-gray-500 font-medium">下一步计划：</span>
                                <p class="text-gray-700">${f.next_plan}</p>
                            </div>
                        ` : ''}
                        ${f.need_adjust_goal ? `
                            <div>
                                <span class="text-gray-500 font-medium">需要调整目标：</span>
                                <p class="text-gray-700">是${f.adjustment_desc ? ` - ${f.adjustment_desc}` : ''}</p>
                            </div>
                        ` : ''}
                        ${f.interval_type ? `
                            <div>
                                <span class="text-gray-500 font-medium">跟进间隔：</span>
                                <span class="text-gray-700">${f.interval_type}</span>
                            </div>
                        ` : ''}
                        ${f.cooperation_willingness ? `
                            <div>
                                <span class="text-gray-500 font-medium">配合意愿：</span>
                                <span class="text-gray-700">${this.getWillingnessLabel(f.cooperation_willingness)}${willingnessChanged}</span>
                            </div>
                        ` : ''}
                        ${f.next_followup_date ? `
                            <div>
                                <span class="text-gray-500 font-medium">下次跟进时间：</span>
                                <span class="text-gray-700">${f.next_followup_date}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    toggleFollowupDetail(id) {
        const detail = document.getElementById(`followup-detail-${id}`);
        const chevron = document.getElementById(`chevron-${id}`);
        if (detail) {
            detail.classList.toggle('hidden');
            if (chevron) {
                chevron.classList.toggle('fa-chevron-down');
                chevron.classList.toggle('fa-chevron-up');
            }
        }
    },

    bindEvents() {
        document.getElementById('btn-back-list')?.addEventListener('click', () => {
            Router.toOverview();
        });

        // 防止重复绑定 - 先移除旧监听器再添加新的
        const exportBtn = document.getElementById('btn-export-detail');
        if (exportBtn) {
            exportBtn.replaceWith(exportBtn.cloneNode(true));
            document.getElementById('btn-export-detail')?.addEventListener('click', () => {
                this.exportReport();
            });
        }
    },

    async exportReport() {
        try {
            Toast.info('正在生成报告...');
            const result = await API.exportScenario(this.sceneId);

            // 创建下载
            const blob = new Blob([result.content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Toast.success('报告已生成并下载');
        } catch (error) {
            Toast.error('导出报告失败');
        }
    }
};

// 暴露到全局
window.DetailView = DetailView;
