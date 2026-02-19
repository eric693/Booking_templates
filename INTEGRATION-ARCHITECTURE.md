# 預約系統完整串接方案
## LINE 官方帳號 + 後台管理 + 現有 HTML 模板整合

---

## 🏗️ 整體架構圖

```
┌────────────────────────────────────────────────────────┐
│              前端（已有的 HTML 模板）                    │
│  • medical-appointment.html                            │
│  • beauty-appointment.html                             │
│  • restaurant-appointment.html                         │
│  • booking-templates.html                              │
│  • customize.html                                      │
└──────────────┬─────────────────────────────────────────┘
               │ AJAX 請求
               │
┌──────────────▼─────────────────────────────────────────┐
│           後端 API Server (Node.js)                     │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ LINE Bot SDK │  │ 預約 API     │  │ 後台 API    │ │
│  │              │  │              │  │             │ │
│  │ • Webhook    │  │ • 建立預約    │  │ • 查詢預約  │ │
│  │ • 推播通知   │  │ • 查詢時段    │  │ • 修改狀態  │ │
│  │ • Rich Menu  │  │ • 取消預約    │  │ • 統計報表  │ │
│  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                         │
└──────────────┬──────────────┬──────────────────────────┘
               │              │
       ┌───────▼──────┐  ┌───▼──────────┐
       │  PostgreSQL  │  │  LINE Server │
       │  (Supabase)  │  │  官方帳號     │
       └──────────────┘  └──────────────┘


┌────────────────────────────────────────────────────────┐
│           後台管理介面 (React/HTML)                      │
│                                                         │
│  • 預約管理（查看/修改/取消）                            │
│  • 客戶管理                                             │
│  • 排班設定                                             │
│  • 數據報表                                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 技術選型（基於現有程式碼）

### 為什麼選 Node.js 而非 Python？

| 考量點 | Node.js | Python |
|--------|---------|--------|
| **與現有程式碼** | ✅ 同樣 JavaScript | ❌ 另一種語言 |
| **學習曲線** | ✅ 延續 JS 知識 | ⚠️ 需學新語法 |
| **前端共用邏輯** | ✅ 可共享驗證函式 | ❌ 無法共用 |
| **部署簡易度** | ✅ Render/Vercel | ✅ 同樣支援 |
| **生態系** | ✅ npm 套件豐富 | ✅ pip 套件豐富 |
| **效能** | ✅ 非同步高效 | ⚠️ 同步較慢 |

**結論**：用 Node.js，無縫接軌現有程式碼

---

## 🎯 實作步驟總覽

### 步驟 1：建立後端 API（Node.js + Express）
- 提供預約 CRUD API
- 資料存入 Supabase PostgreSQL
- 提供給前端 HTML 呼叫

### 步驟 2：串接 LINE Messaging API
- 接收 LINE Webhook
- 推播預約確認通知
- 推播提醒訊息

### 步驟 3：修改現有 HTML 模板
- 表單提交改為呼叫後端 API
- 不再只是前端展示，實際寫入資料庫

### 步驟 4：建立後台管理介面
- 簡易 HTML + 表格顯示預約
- 或用 React 打造完整後台

---

## 📁 專案資料夾結構

```
booking-system/
│
├── frontend/                    # 前端（你現有的檔案）
│   ├── medical-appointment.html
│   ├── beauty-appointment.html
│   ├── restaurant-appointment.html
│   ├── booking-templates.html
│   └── customize.html
│
├── backend/                     # 後端 API
│   ├── server.js               # Express 主程式
│   ├── routes/
│   │   ├── bookings.js         # 預約 API
│   │   ├── line.js             # LINE Bot Webhook
│   │   └── admin.js            # 後台 API
│   ├── services/
│   │   ├── database.js         # Supabase 連線
│   │   ├── lineBot.js          # LINE SDK
│   │   └── notifications.js    # 通知邏輯
│   ├── package.json
│   └── .env                    # 環境變數
│
├── admin/                       # 後台管理
│   ├── index.html              # 簡易版後台
│   └── dashboard.html          # 預約列表
│
└── deploy/
    ├── Dockerfile              # Docker 部署（選用）
    └── render.yaml             # Render 部署設定
```

---

## 🔧 核心程式碼範例

### 1. 後端 API Server (server.js)

```javascript
// backend/server.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const line = require('@line/bot-sdk');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase 初始化
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// LINE Bot 設定
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const lineClient = new line.Client(lineConfig);

// ===== 預約 API =====

// 建立預約
app.post('/api/bookings', async (req, res) => {
  const { 
    provider, service, date, time, 
    customerName, customerPhone, notes 
  } = req.body;

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      provider_name: provider,
      service_name: service,
      booking_date: date,
      booking_time: time,
      customer_name: customerName,
      customer_phone: customerPhone,
      notes: notes,
      status: 'confirmed',
      created_at: new Date()
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // 發送 LINE 通知（如果有綁定）
  // await sendLineNotification(data);

  res.json({ success: true, booking: data });
});

// 查詢預約（供後台使用）
app.get('/api/bookings', async (req, res) => {
  const { date, status } = req.query;
  
  let query = supabase.from('bookings').select('*');
  
  if (date) query = query.eq('booking_date', date);
  if (status) query = query.eq('status', status);
  
  const { data, error } = await query.order('booking_date', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// 更新預約狀態
app.patch('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const { data, error } = await supabase
    .from('bookings')
    .update({ status, notes, updated_at: new Date() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, booking: data });
});

// 取消預約
app.delete('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date() })
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

// ===== LINE Bot Webhook =====

app.post('/webhook/line', line.middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    
    await Promise.all(events.map(async (event) => {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        
        // 簡單的指令處理
        if (userMessage === '我的預約') {
          // 查詢該用戶的預約
          const { data } = await supabase
            .from('bookings')
            .select('*')
            .eq('line_user_id', event.source.userId)
            .order('booking_date', { ascending: true })
            .limit(5);

          const replyText = data.length > 0
            ? data.map(b => `${b.booking_date} ${b.booking_time} - ${b.service_name}`).join('\n')
            : '您目前沒有預約紀錄';

          return lineClient.replyMessage(event.replyToken, {
            type: 'text',
            text: replyText
          });
        }
      }
    }));

    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// ===== LINE 推播通知函式 =====

async function sendLineNotification(booking) {
  // 假設用戶已綁定 LINE ID（需另外建立綁定機制）
  const userId = booking.line_user_id;
  
  if (!userId) return;

  const message = {
    type: 'flex',
    altText: '預約確認通知',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '預約確認',
            weight: 'bold',
            size: 'xl',
            color: '#2C1810'
          },
          {
            type: 'text',
            text: `日期：${booking.booking_date}`,
            margin: 'md'
          },
          {
            type: 'text',
            text: `時間：${booking.booking_time}`
          },
          {
            type: 'text',
            text: `服務：${booking.service_name}`
          },
          {
            type: 'text',
            text: `服務人員：${booking.provider_name}`
          }
        ]
      }
    }
  };

  await lineClient.pushMessage(userId, message);
}

// ===== 定時提醒任務 =====

// 每天晚上 8 點，推送明天的預約提醒
// 需搭配 node-cron 或外部排程器
const cron = require('node-cron');

cron.schedule('0 20 * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_date', dateStr)
    .eq('status', 'confirmed');

  for (const booking of bookings) {
    if (booking.line_user_id) {
      await lineClient.pushMessage(booking.line_user_id, {
        type: 'text',
        text: `明天預約提醒：\n日期：${booking.booking_date}\n時間：${booking.booking_time}\n服務：${booking.service_name}`
      });
    }
  }
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. 前端修改範例（medical-appointment.html）

在原本的確認預約函式中，加入 API 呼叫：

```javascript
// 原本的 submitBooking 函式
async function submitBooking() {
    const name = document.getElementById('customerName').value;
    if (!state.date || !state.time || !name) {
        alert('請完整填寫預約資訊（日期、時間、姓名）');
        return;
    }

    // ===== 新增：呼叫後端 API =====
    try {
        const response = await fetch('https://your-backend-url.com/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: state.doctor,
                service: state.service,
                date: state.date,
                time: state.time,
                customerName: name,
                customerPhone: document.getElementById('customerPhone').value,
                notes: document.querySelector('textarea')?.value || ''
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || '預約失敗');
        }

        // 顯示成功訊息
        const details = document.getElementById('confirmDetails');
        details.innerHTML = [
            ['醫師', state.doctor],
            ['科別', state.specialty],
            ['服務', state.service],
            ['日期', state.date],
            ['時間', state.time],
            ['掛號人', name],
            ['預約編號', result.booking.id.substring(0, 8).toUpperCase()]
        ].map(([k,v]) => `<div class="confirm-detail-item"><span class="key">${k}</span><span class="val">${v}</span></div>`).join('');
        
        document.getElementById('confirmModal').classList.add('active');
    } catch (error) {
        alert('預約失敗：' + error.message);
    }
}
```

### 3. 後台管理介面（admin/dashboard.html）

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>預約管理後台</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #f5f5f5; }
        .header { background: #2C1810; color: white; padding: 20px; }
        .container { max-width: 1400px; margin: 30px auto; padding: 0 20px; }
        .filters { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
        .filters input, .filters select { padding: 10px; margin-right: 10px; border: 1px solid #ddd; }
        table { width: 100%; background: white; border-collapse: collapse; border-radius: 8px; overflow: hidden; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #2C1810; color: white; font-weight: 600; }
        .status-confirmed { color: #4A8B6B; font-weight: 600; }
        .status-cancelled { color: #D4704A; font-weight: 600; }
        .action-btn { padding: 6px 12px; margin: 0 4px; cursor: pointer; border: none; border-radius: 4px; font-size: 12px; }
        .btn-cancel { background: #D4704A; color: white; }
        .btn-complete { background: #4A8B6B; color: white; }
    </style>
</head>
<body>
    <div class="header">
        <h1>預約管理後台</h1>
    </div>
    
    <div class="container">
        <div class="filters">
            <input type="date" id="filterDate" onchange="loadBookings()">
            <select id="filterStatus" onchange="loadBookings()">
                <option value="">所有狀態</option>
                <option value="confirmed">已確認</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
            </select>
            <button onclick="loadBookings()" style="padding:10px 20px;background:#2C1810;color:white;border:none;cursor:pointer;">搜尋</button>
        </div>

        <table id="bookingsTable">
            <thead>
                <tr>
                    <th>預約日期</th>
                    <th>時間</th>
                    <th>服務人員</th>
                    <th>服務項目</th>
                    <th>客戶姓名</th>
                    <th>電話</th>
                    <th>狀態</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody id="bookingsBody">
                <tr><td colspan="8" style="text-align:center;padding:50px;">載入中...</td></tr>
            </tbody>
        </table>
    </div>

    <script>
        const API_URL = 'https://your-backend-url.com/api';

        async function loadBookings() {
            const date = document.getElementById('filterDate').value;
            const status = document.getElementById('filterStatus').value;
            
            let url = `${API_URL}/bookings?`;
            if (date) url += `date=${date}&`;
            if (status) url += `status=${status}&`;

            const response = await fetch(url);
            const bookings = await response.json();

            const tbody = document.getElementById('bookingsBody');
            
            if (bookings.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:50px;">無預約紀錄</td></tr>';
                return;
            }

            tbody.innerHTML = bookings.map(b => `
                <tr>
                    <td>${b.booking_date}</td>
                    <td>${b.booking_time}</td>
                    <td>${b.provider_name}</td>
                    <td>${b.service_name}</td>
                    <td>${b.customer_name}</td>
                    <td>${b.customer_phone}</td>
                    <td class="status-${b.status}">${statusText(b.status)}</td>
                    <td>
                        ${b.status === 'confirmed' ? `
                            <button class="action-btn btn-complete" onclick="updateStatus('${b.id}', 'completed')">完成</button>
                            <button class="action-btn btn-cancel" onclick="updateStatus('${b.id}', 'cancelled')">取消</button>
                        ` : '-'}
                    </td>
                </tr>
            `).join('');
        }

        function statusText(status) {
            const map = { confirmed: '已確認', completed: '已完成', cancelled: '已取消' };
            return map[status] || status;
        }

        async function updateStatus(id, status) {
            if (!confirm(`確定要將此預約設為「${statusText(status)}」？`)) return;

            await fetch(`${API_URL}/bookings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            loadBookings();
        }

        // 初始載入
        loadBookings();
    </script>
</body>
</html>
```

---

## 📋 環境變數設定 (.env)

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Server
PORT=3000
NODE_ENV=production
```

---

## 🗄️ 資料庫 Schema (Supabase)

```sql
-- 預約表
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(100) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(100),
  line_user_id VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- LINE 用戶綁定表
CREATE TABLE line_users (
  line_user_id VARCHAR(100) PRIMARY KEY,
  display_name VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引優化
CREATE INDEX idx_booking_date ON bookings(booking_date);
CREATE INDEX idx_booking_status ON bookings(status);
CREATE INDEX idx_line_user ON bookings(line_user_id);
```

---

## 📦 package.json

```json
{
  "name": "booking-system-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "@supabase/supabase-js": "^2.39.0",
    "@line/bot-sdk": "^8.0.0",
    "node-cron": "^3.0.3",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## 🚀 部署到 Render

1. 在 Render 建立 Web Service
2. 連結你的 GitHub repo
3. 設定環境變數（.env 內容）
4. Build Command: `npm install`
5. Start Command: `npm start`
6. 自動部署完成！

---

## ✅ 完成後你會有：

✅ 預約系統 HTML 前端（原有的）
✅ Node.js 後端 API（處理預約邏輯）
✅ LINE Bot（自動推播通知）
✅ 後台管理介面（查看/修改預約）
✅ Supabase 資料庫（永久儲存）

**總結**：用 Node.js 無痛接軌現有程式碼，不需要學 Python！