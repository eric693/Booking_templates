# 快速開始 🚀

## 📦 你獲得的檔案

1. **booking-templates.html** - 主要網站檔案
2. **index.html** - 入口重定向檔案
3. **README.md** - 完整專案說明
4. **DEPLOY.md** - 詳細部署指南
5. **render.yaml** - Render 自動配置
6. **deploy.sh** - 一鍵部署腳本
7. **.gitignore** - Git 忽略檔案

## ⚡ 最快部署方式（3 步驟）

### 1️⃣ 在 GitHub 建立新 Repository
前往：https://github.com/new
- Repository name: `booking-templates`
- Public 或 Private 都可以
- **不要**勾選 "Add a README file"
- 點擊 "Create repository"

### 2️⃣ 推送程式碼到 GitHub

**Windows (PowerShell):**
```powershell
cd C:\path\to\your\project
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/booking-templates.git
git push -u origin main
```

**macOS/Linux (Terminal):**
```bash
cd /path/to/your/project
chmod +x deploy.sh
./deploy.sh
# 然後按照提示輸入你的 GitHub repository URL
```

### 3️⃣ 在 Render 部署

1. 前往 https://dashboard.render.com
2. 點擊 "New +" → "Static Site"
3. 選擇你的 `booking-templates` repository
4. 設定：
   - **Name**: booking-templates
   - **Build Command**: (留空)
   - **Publish Directory**: `.`
5. 點擊 "Create Static Site"
6. 等待 2-3 分鐘
7. 完成！你會得到一個 https://booking-templates.onrender.com 網址

## 🎯 本地測試

直接用瀏覽器開啟 `booking-templates.html` 或執行：

```bash
# Python
python -m http.server 8000

# 然後開啟 http://localhost:8000
```

## 📚 詳細說明

- 完整功能說明 → 閱讀 `README.md`
- 部署疑難排解 → 閱讀 `DEPLOY.md`

## 💡 提示

- 免費方案完全夠用（每月 100GB 流量）
- 自動 HTTPS（免費 SSL）
- 每次 git push 會自動重新部署
- 可以自訂網域（付費功能）

---

**有問題？** 查看 DEPLOY.md 或到 Render 社群論壇發問！