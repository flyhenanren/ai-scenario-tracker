// Modal 弹窗组件
const Modal = {
    container: null,
    content: null,

    init() {
        this.container = document.getElementById('modal-container');
        this.content = document.getElementById('modal-content');
    },

    show(options = {}) {
        const { title = '', content = '', confirmText = '确认', cancelText = '取消', onConfirm = null, onCancel = null, showCancel = true } = options;

        this.content.innerHTML = `
            <div class="border-b px-6 py-4">
                <h3 class="text-lg font-semibold text-gray-800">${title}</h3>
            </div>
            <div class="px-6 py-4">
                ${content}
            </div>
            <div class="border-t px-6 py-4 flex justify-end space-x-3">
                ${showCancel ? `<button id="modal-cancel" class="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">${cancelText}</button>` : ''}
                <button id="modal-confirm" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">${confirmText}</button>
            </div>
        `;

        this.container.classList.remove('hidden');

        // 绑定事件
        document.getElementById('modal-confirm')?.addEventListener('click', () => {
            this.hide();
            if (onConfirm) onConfirm();
        });

        document.getElementById('modal-cancel')?.addEventListener('click', () => {
            this.hide();
            if (onCancel) onCancel();
        });

        // 点击背景关闭
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                this.hide();
                if (onCancel) onCancel();
            }
        });
    },

    hide() {
        this.container.classList.add('hidden');
    },

    confirm(message, onConfirm) {
        this.show({
            title: '确认操作',
            content: `<p class="text-gray-600">${message}</p>`,
            confirmText: '确认',
            cancelText: '取消',
            onConfirm,
            onCancel: () => {}
        });
    },

    alert(message, onOk) {
        this.show({
            title: '提示',
            content: `<p class="text-gray-600">${message}</p>`,
            confirmText: '确定',
            showCancel: false,
            onConfirm: onOk || (() => {})
        });
    }
};

// 暴露到全局
window.Modal = Modal;
