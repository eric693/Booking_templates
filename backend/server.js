// ============================================================
// 預約系統後端 API Server
// Node.js + Express + Supabase + LINE Bot SDK
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const line = require('@line/bot-sdk');
const cron = require('node-cron');

const app = express();

// ── 中介軟體設定 ────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Supabase 初始化 ─────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── LINE Bot 設定 ───────────────────────────────────────
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const lineClient = new line.Client(lineConfig);

// ============================================================
// 工具函式
// ============================================================

// 產生預約確認碼
function generateBookingCode() {
  return 'BK' + Date.now().toString(36).toUpperCase().slice(-6);
}

// 格式化日期顯示
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return `${dateStr} 週${days[date.getDay()]}`;
}

// ============================================================
// API 路由：預約管理
// ============================================================

// ── 建立預約 ──
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      businessType,     // 'medical' | 'beauty' | 'restaurant'
      provider,         // 服務人員名稱
      service,          // 服務項目
      date,             // 預約日期 YYYY-MM-DD
      time,             // 預約時間 HH:MM
      customerName,     // 客戶姓名
      customerPhone,    // 客戶電話
      customerEmail,    // 客戶信箱（選填）
      lineUserId,       // LINE User ID（選填，若已綁定）
      notes,            // 備註
      metadata          // 其他資料（JSON）
    } = req.body;

    // 基本驗證
    if (!provider || !service || !date || !time || !customerName || !customerPhone) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必填欄位' 
      });
    }

    // 檢查時段是否已被預約
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('provider_name', provider)
      .eq('booking_date', date)
      .eq('booking_time', time)
      .eq('status', 'confirmed')
      .single();

    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: '此時段已被預約' 
      });
    }

    // 建立預約
    const bookingCode = generateBookingCode();
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        business_type: businessType || 'medical',
        booking_code: bookingCode,
        provider_name: provider,
        service_name: service,
        booking_date: date,
        booking_time: time,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        line_user_id: lineUserId,
        notes: notes || '',
        metadata: metadata || {},
        status: 'confirmed',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // 發送 LINE 通知（如果有綁定）
    if (lineUserId) {
      await sendBookingConfirmation(booking);
    }

    // 記錄通知
    await supabase.from('notifications').insert({
      booking_id: booking.id,
      type: 'confirmation',
      channel: lineUserId ? 'line' : 'none',
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    res.json({ 
      success: true, 
      booking: {
        id: booking.id,
        bookingCode: bookingCode,
        provider: provider,
        service: service,
        date: date,
        time: time,
        customerName: customerName
      }
    });

  } catch (error) {
    console.error('建立預約失敗:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ── 查詢預約（後台用）──
app.get('/api/bookings', async (req, res) => {
  try {
    const { 
      date, 
      status, 
      provider, 
      phone,
      startDate,
      endDate,
      limit = 100 
    } = req.query;

    let query = supabase
      .from('bookings')
      .select('*')
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false })
      .limit(parseInt(limit));

    if (date) query = query.eq('booking_date', date);
    if (status) query = query.eq('status', status);
    if (provider) query = query.ilike('provider_name', `%${provider}%`);
    if (phone) query = query.eq('customer_phone', phone);
    if (startDate) query = query.gte('booking_date', startDate);
    if (endDate) query = query.lte('booking_date', endDate);

    const { data, error } = await query;

    if (error) throw error;

    res.json({ 
      success: true, 
      bookings: data,
      count: data.length
    });

  } catch (error) {
    console.error('查詢預約失敗:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ── 查詢單一預約 ──
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: '找不到預約紀錄' 
      });
    }

    res.json({ 
      success: true, 
      booking: data 
    });

  } catch (error) {
    console.error('查詢預約失敗:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ── 更新預約 ──
app.patch('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, date, time } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (date) updateData.booking_date = date;
    if (time) updateData.booking_time = time;

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      success: true, 
      booking: data 
    });

  } catch (error) {
    console.error('更新預約失敗:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ── 取消預約 ──
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 發送取消通知
    if (data.line_user_id) {
      await lineClient.pushMessage(data.line_user_id, {
        type: 'text',
        text: `您的預約已取消\n\n預約編號：${data.booking_code}\n日期：${data.booking_date}\n時間：${data.booking_time}`
      });
    }

    res.json({ 
      success: true, 
      message: '預約已取消' 
    });

  } catch (error) {
    console.error('取消預約失敗:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ── 查詢可用時段 ──
app.get('/api/availability', async (req, res) => {
  try {
    const { provider, date } = req.query;

    if (!provider || !date) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 provider 或 date 參數' 
      });
    }

    // 查詢該日期已被預約的時段
    const { data: bookedSlots, error } = await supabase
      .from('bookings')
      .select('booking_time')
      .eq('provider_name', provider)
      .eq('booking_date', date)
      .eq('status', 'confirmed');

    if (error) throw error;

    const booked = bookedSlots.map(b => b.booking_time);

    // 預設時段（可從資料庫讀取）
    const allSlots = {
      morning: ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
      afternoon: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'],
      evening: ['18:30', '19:00', '19:30', '20:00', '20:30']
    };

    const available = {
      morning: allSlots.morning.filter(t => !booked.includes(t)),
      afternoon: allSlots.afternoon.filter(t => !booked.includes(t)),
      evening: allSlots.evening.filter(t => !booked.includes(t))
    };

    res.json({ 
      success: true, 
      date,
      provider,
      available,
      booked
    });

  } catch (error) {
    console.error('查詢可用時段失敗:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================
// API 路由：統計報表
// ============================================================

app.get('/api/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase.from('bookings').select('status');

    if (startDate) query = query.gte('booking_date', startDate);
    if (endDate) query = query.lte('booking_date', endDate);

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total: data.length,
      confirmed: data.filter(b => b.status === 'confirmed').length,
      completed: data.filter(b => b.status === 'completed').length,
      cancelled: data.filter(b => b.status === 'cancelled').length
    };

    res.json({ success: true, stats });

  } catch (error) {
    console.error('統計失敗:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// LINE Bot Webhook
// ============================================================

app.post('/webhook/line', line.middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;

    await Promise.all(events.map(async (event) => {
      // 處理訊息事件
      if (event.type === 'message' && event.message.type === 'text') {
        return handleTextMessage(event);
      }

      // 處理 Postback 事件（按鈕點擊）
      if (event.type === 'postback') {
        return handlePostback(event);
      }

      // 處理加入好友事件
      if (event.type === 'follow') {
        return handleFollow(event);
      }
    }));

    res.status(200).end();
  } catch (err) {
    console.error('Webhook 錯誤:', err);
    res.status(500).end();
  }
});

// ── 處理文字訊息 ──
async function handleTextMessage(event) {
  const userMessage = event.message.text.trim();
  const userId = event.source.userId;

  // 指令：我的預約
  if (userMessage === '我的預約' || userMessage === '查詢預約') {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('line_user_id', userId)
      .in('status', ['confirmed', 'pending'])
      .order('booking_date', { ascending: true })
      .limit(5);

    if (!bookings || bookings.length === 0) {
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '您目前沒有預約紀錄'
      });
    }

    const flexMessage = {
      type: 'flex',
      altText: '您的預約紀錄',
      contents: {
        type: 'carousel',
        contents: bookings.map(b => ({
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: b.service_name,
                weight: 'bold',
                size: 'lg',
                color: '#2C1810'
              },
              {
                type: 'text',
                text: `預約編號：${b.booking_code}`,
                size: 'xs',
                color: '#8B6B47',
                margin: 'md'
              },
              {
                type: 'separator',
                margin: 'lg'
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'lg',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: `日期：${formatDate(b.booking_date)}`
                  },
                  {
                    type: 'text',
                    text: `時間：${b.booking_time}`
                  },
                  {
                    type: 'text',
                    text: `服務人員：${b.provider_name}`
                  }
                ]
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '取消預約',
                  data: `action=cancel&id=${b.id}`
                },
                style: 'secondary'
              }
            ]
          }
        }))
      }
    };

    return lineClient.replyMessage(event.replyToken, flexMessage);
  }

  // 預設回應
  return lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: '請使用選單進行預約或查詢\n\n可用指令：\n• 我的預約\n• 查詢預約'
  });
}

// ── 處理 Postback（按鈕點擊）──
async function handlePostback(event) {
  const data = new URLSearchParams(event.postback.data);
  const action = data.get('action');
  const bookingId = data.get('id');

  if (action === 'cancel' && bookingId) {
    await supabase
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '您的預約已取消'
    });
  }
}

// ── 處理加入好友 ──
async function handleFollow(event) {
  const userId = event.source.userId;

  // 取得用戶資料
  const profile = await lineClient.getProfile(userId);

  // 儲存用戶資訊
  await supabase.from('line_users').upsert({
    line_user_id: userId,
    display_name: profile.displayName,
    picture_url: profile.pictureUrl,
    created_at: new Date().toISOString()
  });

  // 歡迎訊息
  return lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: `${profile.displayName} 您好！\n\n歡迎使用預約系統\n請點選下方選單開始預約`
  });
}

// ============================================================
// LINE 推播函式
// ============================================================

async function sendBookingConfirmation(booking) {
  if (!booking.line_user_id) return;

  const message = {
    type: 'flex',
    altText: '預約確認通知',
    contents: {
      type: 'bubble',
      styles: {
        header: { backgroundColor: '#2C1810' },
        body: { separator: true }
      },
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '預約確認',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'xl'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `預約編號：${booking.booking_code}`,
            size: 'sm',
            color: '#8B6B47',
            margin: 'md'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: `日期：${formatDate(booking.booking_date)}`,
                size: 'md'
              },
              {
                type: 'text',
                text: `時間：${booking.booking_time}`,
                size: 'md'
              },
              {
                type: 'text',
                text: `服務：${booking.service_name}`,
                size: 'md'
              },
              {
                type: 'text',
                text: `服務人員：${booking.provider_name}`,
                size: 'md'
              }
            ]
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'text',
            text: '請於預約時段前 10 分鐘報到',
            size: 'xs',
            color: '#8B6B47',
            margin: 'lg'
          }
        ]
      }
    }
  };

  await lineClient.pushMessage(booking.line_user_id, message);
}

// ============================================================
// 定時任務：預約提醒
// ============================================================

// 每天晚上 8 點，推送明天的預約提醒
cron.schedule('0 20 * * *', async () => {
  console.log('執行明日預約提醒...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_date', dateStr)
    .eq('status', 'confirmed');

  for (const booking of bookings || []) {
    if (booking.line_user_id) {
      await lineClient.pushMessage(booking.line_user_id, {
        type: 'text',
        text: `📅 明天預約提醒\n\n日期：${formatDate(booking.booking_date)}\n時間：${booking.booking_time}\n服務：${booking.service_name}\n服務人員：${booking.provider_name}\n\n請準時出席，謝謝！`
      });

      // 記錄通知
      await supabase.from('notifications').insert({
        booking_id: booking.id,
        type: 'reminder_1day',
        channel: 'line',
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    }
  }

  console.log(`已發送 ${bookings?.length || 0} 則明日提醒`);
});

// 每小時檢查，推送 1 小時內的預約提醒
cron.schedule('0 * * * *', async () => {
  console.log('執行當日預約提醒...');

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);
  const targetTime = oneHourLater.toTimeString().slice(0, 5);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_date', today)
    .gte('booking_time', currentTime)
    .lte('booking_time', targetTime)
    .eq('status', 'confirmed');

  for (const booking of bookings || []) {
    if (booking.line_user_id) {
      // 檢查是否已發送當日提醒
      const { data: sent } = await supabase
        .from('notifications')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('type', 'reminder_1hour')
        .single();

      if (!sent) {
        await lineClient.pushMessage(booking.line_user_id, {
          type: 'text',
          text: `⏰ 即將到預約時間\n\n時間：${booking.booking_time}\n服務：${booking.service_name}\n\n請準備出發，期待與您見面！`
        });

        await supabase.from('notifications').insert({
          booking_id: booking.id,
          type: 'reminder_1hour',
          channel: 'line',
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      }
    }
  }

  console.log(`已發送 ${bookings?.length || 0} 則當日提醒`);
});

// ============================================================
// 健康檢查端點
// ============================================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: '預約系統 API',
    version: '1.0.0',
    endpoints: {
      bookings: '/api/bookings',
      availability: '/api/availability',
      stats: '/api/stats/summary',
      lineWebhook: '/webhook/line'
    }
  });
});

// ============================================================
// 啟動伺服器
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/bookings`);
  console.log(`💬 LINE Webhook: http://localhost:${PORT}/webhook/line`);
});

module.exports = app;