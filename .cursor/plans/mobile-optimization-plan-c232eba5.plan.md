<!-- c232eba5-9640-4baf-97ef-398fca1d3328 fbc4e34c-1dba-4f96-9d09-5638092ee4f9 -->
# Kế Hoạch Tối Ưu Mobile Toàn Diện

## 1. Nâng Cấp Hệ Thống Responsive (UIToggle & Context)

### Hiện trạng

- Đã có `ResponsiveContext`, `UIToggle`, `UIModeIndicator`
- Breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- Toggle mode: auto/mobile/desktop được lưu trong localStorage

### Cải tiến

**File: `src/hooks/useResponsiveDesign.ts`**

- Thêm debounce cho resize handler (tránh re-render liên tục)
- Thêm orientation detection (portrait/landscape)
- Thêm touch capability detection
- Optimize performance với `useMemo` và `useCallback`

**File: `src/components/UIToggle.tsx`**

- ⚠️ GIỮ NGUYÊN: Colors, borders, shadows hiện tại
- Cải thiện animation mượt hơn (transform-based)
- Thêm tooltip chi tiết hơn
- Responsive cho chính nó (icon-only trên mobile nhỏ)

**File: `src/contexts/ResponsiveContext.tsx`**

- Thêm `isLandscape`, `isTouchDevice` vào context
- Thêm `getOptimalSpacing()` helper (trả về spacing values)

---

## 2. Tối Ưu GamePage - Giao Diện & UX

### 2.1 Header Section (Lines 1781-1956)

**Vấn đề hiện tại:**

- Header quá cao trên mobile (nhiều thông tin)
- Thông tin game (time, turn counter, adult content) chỉ ẩn trên mobile
- Buttons quá nhỏ, khó tap (44x44px minimum)

**Giải pháp:**

```typescript
// Tạo component mới: MobileGameHeader.tsx
- Collapsible header với 2 states: compact & expanded
- Compact: chỉ hiện buttons chính (Info, Save, Skip Time)
- Expanded: hiện đầy đủ thông tin (time, turn, adult content)
- Tap header để toggle (không dùng swipe - giữ đơn giản)
- Smooth animation với framer-motion

⚠️ GIỮ NGUYÊN:
- Glass-effect background
- Border colors (border-gray-700/50)
- Button colors (blue-600/20, green-600/20, purple-600/20)
- Icon set (lucide-react)
- Typography (font sizes, weights)
```

**File: `src/pages/GamePage.tsx` (Lines 1781-1956)**

- Tách header thành component riêng (conditional render: mobile vs desktop)
- Implement collapsible logic (chỉ trên mobile)
- Optimize button size (min 48x48px trên mobile, giữ nguyên desktop)
- Thêm haptic feedback (vibration) khi tap

### 2.2 Chat Messages Area (Lines 1959-2066)

**Vấn đề:**

- Scroll performance kém với nhiều messages
- Message bubbles không tối ưu cho màn hình nhỏ
- Resend button UX chưa tốt

**Giải pháp:**

```typescript
// Implement Virtual Scrolling
- Sử dụng IntersectionObserver
- Chỉ render messages trong viewport + buffer
- Lazy load old messages khi scroll lên

// Message Optimization
- Giảm padding trên mobile (px-2 thay vì px-4)
- Optimize DialogueRenderer performance
- Memoize message components
- Long-press để show resend button (thay vì tap)

⚠️ GIỮ NGUYÊN:
- Message bubble colors (blue-500/20, gray-800/50)
- Border styles
- Text colors
- Animation styles (motion.div)
```

**File: `src/pages/GamePage.tsx` (Lines 1959-2066)**

- Implement virtual scrolling với IntersectionObserver
- Memoize message rendering với React.memo
- Optimize scroll behavior với `will-change-scroll`
- Improve resend button UX (long-press gesture)

### 2.3 Input Area & Action Suggestions (Lines 2068-2163)

**Vấn đề:**

- ActionSuggestions chiếm nhiều không gian
- Input area cố định, không tận dụng keyboard space
- Suggestions không swipeable

**Giải pháp:**

```typescript
// ActionSuggestions Enhancement
- Horizontal swiper cho suggestions (swipe left/right)
- Pagination dots indicator (màu blue-500 như theme hiện tại)
- Haptic feedback khi pick
- Auto-collapse khi keyboard xuất hiện

// Input Area Optimization
- Dynamic textarea height (1-4 lines)
- Keyboard-aware layout (adjust padding)
- Giữ nguyên send button position

⚠️ GIỮ NGUYÊN:
- Suggestion card colors (glass-effect, border-gray-600/50)
- Hover/active states colors
- Typography
- Icon colors
- Border radius
```

**File: `src/components/ActionSuggestions/ActionSuggestions.tsx`**

- Implement horizontal swiper với touch gestures
- Add pagination dots (styled theo theme hiện tại)
- Optimize animation performance
- Add haptic feedback

**File: `src/pages/GamePage.tsx` (Lines 2120-2163)**

- Dynamic textarea height
- Keyboard-aware layout
- Maintain current styling

---

## 3. Tối Ưu InfoMenu - Responsive & Performance

### 3.1 Layout & Navigation (Lines 1240-1299)

**Vấn đề:**

- Menu quá rộng trên mobile (w-96 = 384px)
- Tab navigation không swipeable
- Scroll performance kém với nhiều NPCs

**Giải pháp:**

```typescript
// Responsive Width
- Mobile: w-full max-w-sm (giữ nguyên hiện tại)
- Tablet: w-96
- Desktop: w-96
- Optimize slide animation (transform-based)

// Swipeable Tabs
- Swipe left/right để switch tabs
- Visual indicator (underline animation)
- Smooth transition

⚠️ GIỮ NGUYÊN:
- Background (bg-black/95 backdrop-blur-sm)
- Border (border-gray-700/50)
- Tab colors (blue-600/20 active, gray-400 inactive)
- All icons and typography
```

**File: `src/components/InfoMenu/InfoMenu.tsx` (Lines 1240-1299)**

- Implement swipeable tabs với gesture detection
- Optimize slide animation với `transform`
- Add loading skeleton (styled theo theme)
- Lazy load tab content

### 3.2 NPC Relationships Section (Lines 862-1189)

**Vấn đề:**

- Render tất cả NPCs cùng lúc (performance issue)
- Expand/collapse animation không smooth
- Notes section có thể rất dài

**Giải pháp:**

```typescript
// Virtual List cho NPCs
- Chỉ render NPCs trong viewport
- Lazy load NPC details khi expand
- Optimize re-render với React.memo

// Notes Optimization
- Truncate notes mặc định (3 lines)
- "Xem thêm" button để expand
- Smooth height animation

⚠️ GIỮ NGUYÊN:
- NPC card colors (bg-gray-700/50)
- Status badge colors (green, yellow, red variants)
- Progress bar colors
- All text colors and sizes
```

**File: `src/components/InfoMenu/InfoMenu.tsx` (Lines 862-1189)**

- Implement virtual list pattern với IntersectionObserver
- Memoize NPC components
- Optimize expand/collapse animation
- Add skeleton loading (styled theo theme)

---

## 4. Performance Optimization - Runtime

### 4.1 Component Memoization

**Files cần optimize:**

- `src/pages/GamePage.tsx`: Memoize expensive components
- `src/components/InfoMenu/InfoMenu.tsx`: Memoize sections
- `src/components/ActionSuggestions/ActionSuggestions.tsx`: Memoize suggestions

**Kỹ thuật:**

```typescript
// Use React.memo cho components
const MemoizedMessage = React.memo(MessageComponent, (prev, next) => {
  return prev.message.id === next.message.id;
});

// Use useMemo cho expensive calculations
const processedNPCs = useMemo(() => {
  return npcs.filter(...).map(...);
}, [npcs, dependencies]);

// Use useCallback cho event handlers
const handleMessageTap = useCallback((index) => {
  // handler logic
}, [dependencies]);
```

### 4.2 Animation Performance

**Optimize animations:**

```css
/* Use GPU-accelerated properties */
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform;
}

/* Avoid animating expensive properties */
/* ❌ BAD: width, height, margin, padding */
/* ✅ GOOD: transform, opacity */
```

**Files to update:**

- `src/index.css`: Add GPU acceleration classes
- `src/pages/GamePage.tsx`: Use transform for animations
- `src/components/InfoMenu/InfoMenu.tsx`: Optimize slide animations

---

## 5. Touch & Gesture Enhancements

### 5.1 Custom Gesture Hooks

**File: `src/hooks/useGestures.ts` (new)**

```typescript
// Custom hooks - không dùng external library
- useSwipe: Detect swipe direction
- useLongPress: Detect long press
- useTap: Detect tap with haptic
```

**Gestures cần implement:**

- Swipe left/right: Navigate tabs, suggestions
- Long-press: Show resend button
- Tap: Standard interactions với haptic

### 5.2 Haptic Feedback

**File: `src/utils/haptics.ts` (new)**

```typescript
export const haptics = {
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(20),
  success: () => navigator.vibrate?.([10, 50, 10]),
  error: () => navigator.vibrate?.([50, 100, 50])
};
```

**Integrate vào:**

- Button clicks
- Suggestion picks
- Tab switches
- Message sends
- Error notifications

---

## 6. CSS & Styling Optimization

### 6.1 Mobile-First Utilities

**File: `src/index.css` (Lines 179-244)**

**Thêm utilities:**

```css
/* Better touch targets */
.touch-target-lg {
  @apply min-h-[48px] min-w-[48px];
}

/* Safe area support (notch, home indicator) */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Smooth scrolling optimization */
.scroll-smooth-gpu {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  transform: translateZ(0);
}

/* Loading skeleton - STYLED THEO THEME HIỆN TẠI */
.skeleton {
  @apply animate-pulse bg-gray-700/50 rounded;
}

⚠️ KHÔNG THÊM:
- Không thêm colors mới
- Không thêm font families mới
- Không thêm border styles mới
- Chỉ thêm technical utilities
```

### 6.2 Responsive Spacing

**Update spacing cho mobile:**

```css
/* Mobile: reduce spacing, giữ nguyên visual style */
@media (max-width: 768px) {
  .mobile-padding {
    @apply px-2 sm:px-4; /* Giảm từ px-4 */
  }
  
  .mobile-spacing {
    @apply p-2 sm:p-4; /* Giảm từ p-4 */
  }
}

⚠️ GIỮ NGUYÊN:
- Font sizes (18px base)
- Line heights
- Font families
- Colors
```

---

## 7. Implementation Order

1. **Phase 1: Foundation** (Ưu tiên cao)

   - Nâng cấp ResponsiveContext với debounce & orientation
   - Thêm haptic feedback utilities
   - Update CSS utilities cho mobile (chỉ technical)

2. **Phase 2: GamePage UI** (Ưu tiên cao)

   - Tối ưu header (collapsible cho mobile)
   - Improve input area (dynamic height, keyboard-aware)
   - Better touch targets (48x48px minimum)

3. **Phase 3: GamePage Performance** (Ưu tiên cao)

   - Virtual scrolling cho messages
   - Memoization cho components
   - Optimize animations (GPU acceleration)

4. **Phase 4: ActionSuggestions** (Ưu tiên cao)

   - Horizontal swiper
   - Pagination dots (styled theo theme)
   - Haptic feedback

5. **Phase 5: InfoMenu** (Ưu tiên trung bình)

   - Swipeable tabs
   - Virtual list cho NPCs
   - Lazy load tab content

6. **Phase 6: Gestures & Polish** (Ưu tiên trung bình)

   - Custom gesture hooks
   - Add haptic feedback everywhere
   - Long-press interactions

7. **Phase 7: Testing & Refinement** (Ưu tiên thấp)

   - Performance testing
   - Device testing
   - Bug fixes & polish

---

## Files Sẽ Thay Đổi

### Modified Files

1. `src/hooks/useResponsiveDesign.ts` - Debounce, orientation
2. `src/contexts/ResponsiveContext.tsx` - New helpers
3. `src/components/UIToggle.tsx` - Better animation (giữ nguyên style)
4. `src/pages/GamePage.tsx` - Major refactor (giữ nguyên visual)
5. `src/components/ActionSuggestions/ActionSuggestions.tsx` - Swipeable
6. `src/components/InfoMenu/InfoMenu.tsx` - Virtual list, swipeable tabs
7. `src/index.css` - Technical utilities only

### New Files

1. `src/components/GamePage/MobileGameHeader.tsx` - Collapsible header
2. `src/utils/haptics.ts` - Haptic feedback
3. `src/hooks/useGestures.ts` - Gesture detection (custom, no library)
4. `src/hooks/useVirtualList.ts` - Virtual list logic

---

## Lưu Ý Quan Trọng

✅ **Không ảnh hưởng game flow:**

- Tất cả thay đổi chỉ là UI/UX
- Logic game không đổi
- State management không đổi
- API calls không đổi

✅ **KHÔNG THAY ĐỔI PHONG CÁCH UI:**

- ✅ Giữ nguyên 100% color scheme (glass-effect, blue/purple/green accents)
- ✅ Giữ nguyên 100% typography (SVN-Determination Sans, font sizes, weights)
- ✅ Giữ nguyên 100% border styles (border-gray-700/50, rounded-lg, etc.)
- ✅ Giữ nguyên 100% shadows và blur effects (backdrop-blur-sm, shadow-lg)
- ✅ Giữ nguyên 100% icon set (lucide-react)
- ✅ Giữ nguyên 100% animation styles (framer-motion patterns)
- ⚠️ CHỈ điều chỉnh: spacing (padding/margin), sizing (width/height), layout (flexbox/grid)
- ⚠️ CHỈ thêm: technical elements (pagination dots, loading skeletons) - styled theo theme hiện tại

✅ **Toggle PC/Mobile hoạt động:**

- Nâng cấp từ hệ thống hiện có
- Backward compatible
- Smooth transition giữa modes
- Visual style giống hệt nhau ở cả 2 modes

✅ **Performance first:**

- Mọi optimization đều đo lường được
- Không trade-off functionality cho performance
- Progressive enhancement approach

### To-dos

- [ ] Nâng cấp ResponsiveContext: debounce resize, orientation detection, touch capability
- [ ] Tạo haptic feedback utilities và integrate vào buttons
- [ ] Thêm mobile-first CSS utilities (touch targets, safe area, skeleton)
- [ ] Tạo MobileGameHeader component với collapsible logic
- [ ] Cải thiện input area: dynamic height, floating button, keyboard-aware
- [ ] Implement swipeable ActionSuggestions với pagination dots
- [ ] Implement virtual scrolling cho chat messages
- [ ] Memoize expensive components trong GamePage và InfoMenu
- [ ] Optimize animations với GPU acceleration và transform
- [ ] Implement swipeable tabs cho InfoMenu
- [ ] Virtual list cho NPC relationships section
- [ ] Implement gesture library và handlers (swipe, long-press, pull-to-refresh)
- [ ] Performance testing và device testing trên các thiết bị khác nhau