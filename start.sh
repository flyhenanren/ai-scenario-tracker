#!/bin/bash

# AI场景评估追踪系统启动脚本 (Linux/macOS)

cd "$(dirname "$0")"

echo "正在启动AI场景评估追踪系统..."

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到Python3，请先安装Python 3.8+"
    exit 1
fi

# 安装依赖（如果需要）
if [ ! -f "requirements.txt" ]; then
    echo "错误: 未找到requirements.txt文件"
    exit 1
fi

# 检查是否已安装依赖
if ! python3 -c "import fastapi" &> /dev/null; then
    echo "正在安装依赖..."
    pip install -r requirements.txt
fi

# 启动服务
echo "启动后端服务 (http://localhost:8000) ..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

