#!/bin/bash

# ============================================================
# 預約系統本地測試啟動腳本
# ============================================================

echo "========================================"
echo "  預約系統本地測試環境啟動"
echo "========================================"
echo ""

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤：未安裝 Node.js"
    echo "請前往 https://nodejs.org 下載安裝"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 進入後端資料夾
cd backend

# 檢查是否已安裝套件
if [ ! -d "node_modules" ]; then
    echo "📦 首次啟動，安裝相依套件..."
    npm install
    echo ""
fi

# 檢查 .env 檔案
if [ ! -f ".env" ]; then
    echo "⚠️  警告：未找到 .env 檔案"
    echo ""
    echo "請複製 .env.example 為 .env 並填入以下資訊："
    echo "1. Supabase URL 和 Key"
    echo "2. LINE Channel Access Token 和 Secret"
    echo ""
    echo "完成後重新執行此腳本"
    exit 1
fi

echo "✅ 環境變數檔案存在"
echo ""

# 啟動伺服器
echo "🚀 啟動後端 API 伺服器..."
echo "   本地網址: http://localhost:3000"
echo "   API 文檔: http://localhost:3000"
echo "   健康檢查: http://localhost:3000/health"
echo ""
echo "按 Ctrl+C 停止伺服器"
echo "========================================"
echo ""

npm start