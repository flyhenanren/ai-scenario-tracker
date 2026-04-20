// 主应用入口
const App = {
    async init() {
        console.log('AI场景评估追踪系统初始化...');

        // 注册视图（必须在Router.init之前，因为Router.init会触发导航）
        window.Views = {
            overview: OverviewView,
            form: FormView,
            progress: ProgressView,
            detail: DetailView
        };

        // 初始化组件
        Toast.init();
        Modal.init();
        Router.init();

        // 绑定全局导航事件
        this.bindNavEvents();

        console.log('系统初始化完成');
    },

    bindNavEvents() {
        document.getElementById('nav-overview')?.addEventListener('click', () => {
            Router.toOverview();
        });

        // nav-form 已在 OverviewView.bindEvents() 中绑定，避免重复
        // Router.toForm() 由 Router.handleNavigation() 通过 hashchange 统一处理

        document.getElementById('nav-progress')?.addEventListener('click', () => {
            Router.toProgress();
        });

        // 点击标题回到首页
        document.getElementById('nav-home')?.addEventListener('click', () => {
            Router.toOverview();
        });
    }
};

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// 暴露到全局
window.App = App;
