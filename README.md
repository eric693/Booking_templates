# 預約系統模板展示平台

一個優雅、專業的預約系統模板展示網站，讓您能夠快速瀏覽、管理和分享不同產業的預約系統模板。

![預約系統模板](https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=400&fit=crop)

## ✨ 功能特色

### 📋 模板展示
- **多產業分類**：醫療診所、美容美髮、餐廳訂位、健身運動、教育培訓、專業服務
- **即時篩選**：點擊分類標籤即時過濾模板
- **響應式設計**：完美支援桌面、平板、手機各種裝置

### ➕ 動態新增模板
- **彈出式表單**：流暢的模態視窗體驗
- **雙重圖片上傳**：
  - 網址 URL 輸入
  - 本地圖片上傳（支援拖曳）
- **即時預覽**：上傳圖片後立即顯示預覽
- **Google Drive 整合**：可選填 Drive 連結

### 🎨 設計亮點
- **獨特配色**：溫暖大地色系，避開常見 AI 風格
- **優雅字體**：Crimson Pro + Work Sans 組合
- **流暢動畫**：淡入、懸停、滑動等微互動
- **專業排版**：編輯雜誌風格的視覺設計

## 🚀 快速開始

### 本地運行

1. **下載專案**
```bash
git clone <your-repo-url>
cd booking-templates
```

2. **直接開啟**
```bash
# 用瀏覽器開啟 booking-templates.html
open booking-templates.html  # macOS
start booking-templates.html # Windows
xdg-open booking-templates.html # Linux
```

或使用簡單的 HTTP 伺服器：
```bash
# Python 3
python -m http.server 8000

# Node.js (需先安裝 http-server)
npx http-server
```

然後在瀏覽器開啟 `http://localhost:8000`

## 📦 部署到 Render

### 方法一：從 GitHub 部署

1. **推送到 GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

2. **連接 Render**
   - 前往 [Render Dashboard](https://dashboard.render.com/)
   - 點擊「New +」→「Static Site」
   - 連接你的 GitHub repository
   - 設定如下：
     - **Name**: booking-templates（或自訂名稱）
     - **Build Command**: （留空）
     - **Publish Directory**: `.`
   - 點擊「Create Static Site」

3. **完成！**
   - Render 會自動部署
   - 你會獲得一個 `.onrender.com` 網址

### 方法二：手動部署

1. 在 Render Dashboard 創建 Static Site
2. 選擇「Manual Deploy」
3. 上傳 `booking-templates.html` 檔案

## 📂 專案結構

```
booking-templates/
├── booking-templates.html    # 主要 HTML 檔案（包含所有 CSS/JS）
├── README.md                  # 專案說明文件
└── render.yaml               # Render 部署配置（選用）
```

## 🎯 使用方式

### 瀏覽模板
1. 開啟網站
2. 點擊頂部分類標籤篩選不同產業
3. 點擊「查看模板」進入模板頁面
4. 點擊「Drive」查看 Google Drive 資源（如有）

### 新增模板
1. 點擊「新增模板」按鈕
2. 填寫表單資訊：
   - 選擇產業分類
   - 輸入模板名稱
   - 撰寫描述
   - 選擇圖片來源（URL 或上傳）
   - 填入模板連結
   - （選填）Google Drive 連結
3. 點擊「新增模板」完成

### 圖片上傳
- **方式 1**：選擇「網址 URL」，貼上圖片網址
- **方式 2**：選擇「上傳圖片」，點擊上傳區域或拖曳圖片

## 🛠 技術棧

- **純 HTML/CSS/JavaScript**：無需框架，輕量快速
- **Google Fonts**：Crimson Pro、Work Sans
- **Unsplash**：範例圖片來源
- **LocalStorage**：（可擴充）儲存模板資料

## 🎨 設計理念

### 配色方案
```css
--primary: #2C1810      /* 深棕色 - 主要文字 */
--accent: #D4704A       /* 陶土橘 - 強調色 */
--secondary: #8B6B47    /* 淺棕色 - 次要元素 */
--background: #FAF8F5   /* 米白色 - 背景 */
--card-bg: #FFFFFF      /* 純白 - 卡片背景 */
```

### 設計原則
- ❌ 避免紫色漸層等常見 AI 配色
- ✅ 採用溫暖、專業的大地色系
- ✅ 優雅的字體搭配
- ✅ 適當的留白與呼吸感
- ✅ 流暢的動畫過渡

## 🔧 自訂設定

### 修改配色
編輯 `:root` CSS 變數：
```css
:root {
    --primary: #2C1810;
    --accent: #D4704A;
    /* 修改其他顏色... */
}
```

### 新增預設模板
在 JavaScript `templates` 陣列中新增：
```javascript
{
    id: 7,
    category: 'medical',
    categoryName: '醫療診所',
    title: '您的模板名稱',
    description: '模板描述',
    image: '圖片網址',
    url: '模板連結',
    driveUrl: 'Drive 連結'
}
```

### 新增分類
1. 在篩選導航加入新的 `<li>`
2. 在表單下拉選單加入新的 `<option>`
3. 在 `categoryNames` 物件加入對應名稱

## 📱 響應式支援

- **桌面**：1400px 最大寬度，三欄網格
- **平板**：768px 以下，單欄佈局
- **手機**：完整的觸控優化體驗

## 🌟 未來規劃

- [ ] LocalStorage 持久化儲存
- [ ] 模板編輯功能
- [ ] 模板刪除功能
- [ ] 搜尋功能
- [ ] 匯出/匯入模板資料
- [ ] 深色模式
- [ ] 多語言支援

## 📄 授權

MIT License - 自由使用、修改、分發

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📧 聯絡

如有任何問題或建議，請開啟 Issue 討論。

---

**Made with ❤️ for booking system enthusiasts**