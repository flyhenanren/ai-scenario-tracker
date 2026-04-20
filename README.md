# AI场景评估追踪系统

用于管理公司内部AI场景填报、跟进和评估的系统。

## 功能特性

- **总览界面**：查看所有场景，支持按部门/成熟度/分类/生命周期筛选
- **填报界面**：新建和编辑场景表单，支持暂存到本地（localStorage）和保存到服务器
- **进度跟踪**：查看超期待跟进场景，填写跟进记录
- **单场景完整视图**：一页总览场景全部信息，包括跟进记录时间线

## 技术栈

| 层次 | 技术 |
|---|---|
| 后端 | Python + FastAPI |
| 前端 | Vanilla JS + Tailwind CSS |
| 数据库 | SQLite |
| ORM | SQLAlchemy |

## 快速启动

### 环境要求

- Python 3.8+
- pip

### 安装依赖

```bash
cd ai-scenario-tracker
pip install -r requirements.txt
```

### 启动服务

```bash
# 开发模式（支持热重载）
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# 生产模式
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 2
```

### 访问系统

打开浏览器访问：http://localhost:8000

## 目录结构

```
ai-scenario-tracker/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── database.py          # SQLite 数据库初始化
│   ├── models.py            # ORM 模型定义
│   ├── schemas.py           # Pydantic 数据模型
│   └── routers/
│       ├── scenarios.py     # 场景 CRUD 接口
│       └── followups.py     # 跟进记录接口
├── frontend/
│   ├── index.html           # 主页面（SPA）
│   ├── css/styles.css       # 自定义样式
│   └── js/
│       ├── app.js           # 主应用入口
│       ├── api.js           # API 调用封装
│       ├── router.js        # 前端路由
│       ├── views/           # 四个界面
│       └── components/      # 通用组件
├── static/                  # 静态文件目录
├── data/                    # SQLite 数据库文件
└── requirements.txt        # Python 依赖
```

## 部署说明

### Linux 服务器

1. 上传项目到服务器
2. 安装依赖：`pip install -r requirements.txt`
3. 配置防火墙开放 8000 端口
4. 使用 systemd 或 supervisor 管理进程

示例 systemd 服务文件：
```ini
[Unit]
Description=AI Scenario Tracker
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/ai-scenario-tracker
ExecStart=/path/to/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

### Windows 服务器

1. 安装 Python 3.8+
2. 安装依赖：`pip install -r requirements.txt`
3. 运行：`python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000`

或使用 IIS + wfastcgi 配置。

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /static {
        alias /path/to/ai-scenario-tracker/frontend;
        expires 30d;
    }
}
```

## API 接口

### 场景接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/scenarios | 获取所有场景 |
| GET | /api/scenarios/{id} | 获取单个场景 |
| POST | /api/scenarios | 新建场景 |
| PUT | /api/scenarios/{id} | 更新场景 |
| DELETE | /api/scenarios/{id} | 删除场景 |
| GET | /api/scenarios/stats | 获取统计信息 |

### 跟进记录接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/scenarios/{id}/followups | 获取某场景的跟进记录 |
| POST | /api/scenarios/{id}/followups | 新增跟进记录 |
| GET | /api/followups/overdue | 获取超期需跟进的场景 |

## 数据说明

### 场景编号格式

`AI-YYYYMMDD-XXX`，例如：`AI-20260416-001`

### 成熟度等级

| 等级 | 名称 | 说明 |
|---|---|---|
| L1 | 概念阶段 | 只有想法，尚未验证 |
| L2 | 试用阶段 | 已有项目/局部尝试 |
| L3 | 试点阶段 | 有明确场景和初步结果 |
| L4 | 推广阶段 | 可复制到更多项目/部门 |
| L5 | 机制化阶段 | 已纳入标准流程并持续优化 |

### 生命周期状态

- 对接中
- 评估中
- 推进中
- 暂停
- 已完成
- 已废弃

### 分类

- **A类**：核心投入，优先推进
- **B类**：试点观察，择机推进
- **C类**：暂缓投入，暂不立项

## 常见问题

**Q: 数据库文件在哪里？**
A: 默认在 `data/scenarios.db`

**Q: 如何备份数据？**
A: 备份 `data/scenarios.db` 文件即可

**Q: 如何重置数据？**
A: 删除 `data/scenarios.db`，重启服务会自动创建

**Q: 暂存功能是什么？**
A: 暂存会将表单数据保存到浏览器 localStorage，刷新页面不会丢失。保存到服务器后会清除暂存。
