// 前端路由
const Router = {
    currentView: null,
    params: {},
    _isNavigating: false,  // 防止hashchange触发循环

    init() {
        this.handleNavigation();
    },

    navigate(view, params = {}) {
        // 检查是否真的需要导航
        const isViewSame = this.currentView === view;
        const isParamsSame = JSON.stringify(this.params) === JSON.stringify(params);

        // 如果视图相同且参数相同，不需要切换
        if (isViewSame && isParamsSame) {
            return;
        }

        this._isNavigating = true;
        this.currentView = view;
        this.params = params;

        // 隐藏所有视图
        document.querySelectorAll('.view').forEach(v => {
            v.classList.add('hidden');
        });

        // 显示目标视图
        const targetView = document.getElementById(`view-${view}`);
        if (targetView) {
            targetView.classList.remove('hidden');
        }

        // 更新导航状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.id === `nav-${view}`) {
                btn.classList.add('active');
            }
        });

        // 触发视图加载
        if (typeof Views !== 'undefined' && Views[view]) {
            Views[view].onEnter(params);
        }

        // 更新 URL hash（包含id参数）
        const newHash = params.id ? `${view}/${params.id}` : view;
        window.location.hash = newHash;

        // 延迟重置flag，让hashchange事件有机会处理
        setTimeout(() => {
            this._isNavigating = false;
        }, 100);
    },

    handleNavigation() {
        window.addEventListener('hashchange', () => {
            // 如果是由navigate触发的更新，跳过
            if (this._isNavigating) {
                return;
            }

            const hash = window.location.hash.slice(1) || 'overview';
            const [view, ...rest] = hash.split('/');
            const params = {};
            if (rest.length > 0) params.id = rest[0];
            this.navigate(view, params);
        });

        // 初始导航
        const hash = window.location.hash.slice(1) || 'overview';
        const [view, ...rest] = hash.split('/');
        const params = {};
        if (rest.length > 0) params.id = rest[0];
        this.navigate(view, params);
    },

    // 导航到指定视图
    toOverview() {
        this.navigate('overview');
    },

    toForm(sceneId = null) {
        this.navigate('form', sceneId ? { id: sceneId } : {});
    },

    toProgress() {
        this.navigate('progress');
    },

    toDetail(sceneId) {
        this.navigate('detail', { id: sceneId });
    }
};

// 暴露到全局
window.Router = Router;
