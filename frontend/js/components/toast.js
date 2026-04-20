// Toast 提示组件
const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
    },

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} flex items-center px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;

        const icons = {
            success: 'fa-check-circle text-green-500',
            error: 'fa-exclamation-circle text-red-500',
            warning: 'fa-exclamation-triangle text-yellow-500',
            info: 'fa-info-circle text-blue-500'
        };

        const bgColors = {
            success: 'bg-green-50 border border-green-200',
            error: 'bg-red-50 border border-red-200',
            warning: 'bg-yellow-50 border border-yellow-200',
            info: 'bg-blue-50 border border-blue-200'
        };

        toast.className += ` ${bgColors[type]}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} mr-3 text-lg"></i>
            <span class="text-sm text-gray-700">${message}</span>
        `;

        this.container.appendChild(toast);

        // 动画显示
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        });

        // 自动关闭
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(message, duration) {
        this.show(message, 'success', duration);
    },

    error(message, duration) {
        this.show(message, 'error', duration);
    },

    warning(message, duration) {
        this.show(message, 'warning', duration);
    },

    info(message, duration) {
        this.show(message, 'info', duration);
    }
};

// 暴露到全局
window.Toast = Toast;
