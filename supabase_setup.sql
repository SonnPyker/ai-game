-- =====================================================
-- SUPABASE SETUP SQL SCRIPT
-- Thiết lập bảng và RLS cho hệ thống Save Game
-- =====================================================

-- 1. Tạo bảng saves
CREATE TABLE IF NOT EXISTS public.saves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    slot_id TEXT NOT NULL CHECK (slot_id IN ('slot1', 'slot2', 'slot3')),
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Đảm bảo mỗi user chỉ có 1 slot với cùng slot_id
    UNIQUE(user_id, slot_id)
);

-- 2. Tạo index để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_saves_user_id ON public.saves(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_slot_id ON public.saves(slot_id);
CREATE INDEX IF NOT EXISTS idx_saves_updated_at ON public.saves(updated_at);

-- 3. Bật Row Level Security (RLS)
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;

-- 4. Tạo RLS Policies

-- Policy: Users chỉ có thể xem saves của chính mình
CREATE POLICY "Users can view their own saves" ON public.saves
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users chỉ có thể tạo saves cho chính mình
CREATE POLICY "Users can create their own saves" ON public.saves
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users chỉ có thể cập nhật saves của chính mình
CREATE POLICY "Users can update their own saves" ON public.saves
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users chỉ có thể xóa saves của chính mình
CREATE POLICY "Users can delete their own saves" ON public.saves
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Tạo function để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Tạo trigger để tự động cập nhật updated_at khi có thay đổi
CREATE TRIGGER handle_saves_updated_at
    BEFORE UPDATE ON public.saves
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Tạo function để kiểm tra giới hạn 3 slot
CREATE OR REPLACE FUNCTION public.check_slot_limit()
RETURNS TRIGGER AS $$
DECLARE
    slot_count INTEGER;
BEGIN
    -- Đếm số slot hiện tại của user
    SELECT COUNT(*) INTO slot_count
    FROM public.saves
    WHERE user_id = NEW.user_id;
    
    -- Nếu đã có 3 slot và đang cố tạo slot mới, từ chối
    IF slot_count >= 3 AND TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'User đã đạt giới hạn 3 slot. Không thể tạo thêm slot mới.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Tạo trigger để kiểm tra giới hạn slot
CREATE TRIGGER check_slot_limit_trigger
    BEFORE INSERT ON public.saves
    FOR EACH ROW
    EXECUTE FUNCTION public.check_slot_limit();

-- 9. Tạo view để dễ dàng query thông tin saves
CREATE OR REPLACE VIEW public.user_saves AS
SELECT 
    id,
    user_id,
    slot_id,
    data,
    updated_at,
    created_at,
    -- Thêm thông tin metadata từ data JSONB
    data->>'version' as save_version,
    data->'meta'->>'source' as save_source,
    data->'meta'->>'pendingSync' as pending_sync,
    data->'meta'->>'migrated' as migrated
FROM public.saves
WHERE user_id = auth.uid();

-- 10. Tạo function để lấy thống kê saves của user
CREATE OR REPLACE FUNCTION public.get_user_save_stats()
RETURNS TABLE (
    total_saves BIGINT,
    cloud_saves BIGINT,
    local_saves BIGINT,
    pending_sync_saves BIGINT,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_saves,
        COUNT(*) FILTER (WHERE data->'meta'->>'source' = 'cloud') as cloud_saves,
        COUNT(*) FILTER (WHERE data->'meta'->>'source' = 'local') as local_saves,
        COUNT(*) FILTER (WHERE data->'meta'->>'pendingSync' = 'true') as pending_sync_saves,
        MAX(updated_at) as last_updated
    FROM public.saves
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Tạo function để cleanup saves cũ (tùy chọn)
CREATE OR REPLACE FUNCTION public.cleanup_old_saves(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Xóa saves cũ hơn X ngày (chỉ dành cho admin)
    DELETE FROM public.saves
    WHERE updated_at < NOW() - INTERVAL '1 day' * days_old
    AND user_id = auth.uid();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HƯỚNG DẪN SỬ DỤNG:
-- =====================================================

-- 1. Chạy script này trong Supabase SQL Editor
-- 2. Kiểm tra bảng đã được tạo: SELECT * FROM public.saves LIMIT 1;
-- 3. Kiểm tra RLS policies: SELECT * FROM pg_policies WHERE tablename = 'saves';
-- 4. Test với user: SELECT * FROM public.user_saves;
-- 5. Xem thống kê: SELECT * FROM public.get_user_save_stats();

-- =====================================================
-- NOTES:
-- =====================================================

-- - Bảng saves hỗ trợ tối đa 3 slot per user
-- - RLS đảm bảo users chỉ truy cập saves của chính mình
-- - JSONB data field chứa toàn bộ SaveGame object
-- - Triggers tự động cập nhật updated_at
-- - Functions hỗ trợ query và thống kê
