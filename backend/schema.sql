-- ============================================================
-- 預約系統資料庫 Schema
-- PostgreSQL / Supabase
-- ============================================================

-- ── 預約主表 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 業務類型
  business_type VARCHAR(50) DEFAULT 'medical',
  -- 可選：medical, beauty, restaurant, fitness, education, consulting
  
  -- 預約編號（給客戶看的）
  booking_code VARCHAR(20) UNIQUE NOT NULL,
  
  -- 服務資訊
  provider_name VARCHAR(100) NOT NULL,      -- 服務人員名稱
  service_name VARCHAR(100) NOT NULL,       -- 服務項目名稱
  
  -- 時間資訊
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  
  -- 客戶資訊
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(100),
  customer_id_number VARCHAR(20),           -- 身分證字號（醫療用）
  
  -- LINE 綁定
  line_user_id VARCHAR(100),
  
  -- 其他資訊
  notes TEXT,
  metadata JSONB DEFAULT '{}',              -- 彈性欄位（存額外資料）
  
  -- 狀態
  status VARCHAR(20) DEFAULT 'confirmed',
  -- 可選：pending, confirmed, completed, cancelled, no_show
  
  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 索引
  CONSTRAINT unique_booking UNIQUE (provider_name, booking_date, booking_time, status)
);

-- ── LINE 用戶表 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS line_users (
  line_user_id VARCHAR(100) PRIMARY KEY,
  display_name VARCHAR(100),
  picture_url VARCHAR(500),
  phone VARCHAR(20),
  email VARCHAR(100),
  
  -- 會員資訊（選填）
  member_id VARCHAR(50),
  member_tier VARCHAR(20),
  points INTEGER DEFAULT 0,
  
  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 通知紀錄表 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- 通知類型
  type VARCHAR(50) NOT NULL,
  -- 可選：confirmation, reminder_1day, reminder_1hour, cancellation
  
  -- 通知渠道
  channel VARCHAR(20) NOT NULL,
  -- 可選：line, sms, email
  
  -- 狀態
  status VARCHAR(20) NOT NULL,
  -- 可選：sent, failed, pending
  
  -- 內容（選填）
  content TEXT,
  error_message TEXT,
  
  -- 時間戳記
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 服務人員表（選用）──────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type VARCHAR(50),
  name VARCHAR(100) NOT NULL,
  title VARCHAR(100),                       -- 職稱
  specialty VARCHAR(200),                   -- 專長
  experience VARCHAR(50),                   -- 經歷
  photo_url VARCHAR(500),
  bio TEXT,
  
  -- 排班設定
  working_days INTEGER[],                   -- [1,2,3,4,5] = 週一到週五
  working_hours JSONB DEFAULT '{}',         -- {"start": "09:00", "end": "18:00"}
  
  -- 狀態
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 服務項目表（選用）──────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type VARCHAR(50),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration INTEGER,                         -- 分鐘
  price DECIMAL(10, 2),
  icon VARCHAR(10),                         -- 圖示符號
  
  -- 狀態
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 營業時間表（選用）──────────────────────────────────
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type VARCHAR(50),
  day_of_week INTEGER NOT NULL,            -- 0=日, 1=一, ..., 6=六
  is_open BOOLEAN DEFAULT true,
  open_time TIME,
  close_time TIME,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 索引優化
-- ============================================================

-- 預約查詢效能優化
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_provider ON bookings(provider_name);
CREATE INDEX idx_bookings_line_user ON bookings(line_user_id);
CREATE INDEX idx_bookings_phone ON bookings(customer_phone);
CREATE INDEX idx_bookings_date_time ON bookings(booking_date, booking_time);

-- 通知查詢優化
CREATE INDEX idx_notifications_booking ON notifications(booking_id);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ============================================================
-- Row Level Security (RLS) - Supabase 安全性設定
-- ============================================================

-- 啟用 RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 政策：後端服務可完整存取（使用 service_role key）
-- 前端只能讀取自己的預約（使用 anon key + RLS）

-- 範例：允許用戶查詢自己的預約
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (line_user_id = auth.uid()::text);

-- 範例：允許用戶建立預約
CREATE POLICY "Users can insert bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 預設資料插入（範例）
-- ============================================================

-- 插入範例服務人員
INSERT INTO providers (business_type, name, title, specialty, experience, is_active)
VALUES 
  ('medical', '林俊宏', '醫師', '家庭醫學科', '15 年', true),
  ('medical', '陳雅玲', '醫師', '內科', '12 年', true),
  ('beauty', 'Kimi', '設計師', '染髮、燙髮', '8 年', true),
  ('restaurant', '內用區', '座位區', '2-6 人', '', true)
ON CONFLICT DO NOTHING;

-- 插入範例服務項目
INSERT INTO services (business_type, name, duration, price, icon, is_active)
VALUES 
  ('medical', '一般門診', 15, 250, '＋', true),
  ('medical', '健康檢查', 30, 500, '◇', true),
  ('beauty', '質感剪髮', 60, 800, '—', true),
  ('beauty', '單色染髮', 120, 2500, '◈', true),
  ('restaurant', '午餐訂位', 120, 0, '內', true),
  ('restaurant', '晚餐訂位', 150, 0, '內', true)
ON CONFLICT DO NOTHING;

-- 插入營業時間（週一到週六）
INSERT INTO business_hours (business_type, day_of_week, is_open, open_time, close_time)
VALUES 
  ('medical', 1, true, '09:00', '21:00'),
  ('medical', 2, true, '09:00', '21:00'),
  ('medical', 3, true, '09:00', '21:00'),
  ('medical', 4, true, '09:00', '21:00'),
  ('medical', 5, true, '09:00', '21:00'),
  ('medical', 6, true, '09:00', '17:00'),
  ('medical', 0, false, NULL, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 實用查詢範例
-- ============================================================

-- 查詢今日所有預約
-- SELECT * FROM bookings WHERE booking_date = CURRENT_DATE ORDER BY booking_time;

-- 查詢某服務人員本週預約
-- SELECT * FROM bookings 
-- WHERE provider_name = '林俊宏' 
--   AND booking_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
-- ORDER BY booking_date, booking_time;

-- 統計本月預約數
-- SELECT COUNT(*), status 
-- FROM bookings 
-- WHERE DATE_TRUNC('month', booking_date) = DATE_TRUNC('month', CURRENT_DATE)
-- GROUP BY status;

-- 查詢熱門時段
-- SELECT booking_time, COUNT(*) as count
-- FROM bookings
-- WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days'
--   AND status = 'completed'
-- GROUP BY booking_time
-- ORDER BY count DESC
-- LIMIT 10;

-- ============================================================
-- 清理測試資料（危險！生產環境勿用）
-- ============================================================

-- TRUNCATE TABLE bookings CASCADE;
-- TRUNCATE TABLE notifications CASCADE;
-- TRUNCATE TABLE line_users CASCADE;

-- ============================================================