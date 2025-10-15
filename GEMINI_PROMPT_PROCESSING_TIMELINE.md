# 📋 TIMELINE HOẠT ĐỘNG CÁC TIẾN TRÌNH XỬ LÝ PROMPT GEMINI

## Tổng quan
Tài liệu này mô tả chi tiết timeline hoạt động của các tiến trình xử lý liên quan đến prompt gửi lên Gemini API trong hệ thống game RPG text-based.

## PHASE 1: PRE-PROCESSING (Trước khi gửi prompt chính)

### 1.1 Input Validation & Enhancement (0-50ms)
```
🔄 GamePage.sendMessage() - Dòng 1750
├── Load services (loadServices)
├── Detect dialogue (detectPlayerDialogue)
├── Enhance dialogue (enhanceDialogueForAI) 
├── Process DC Check actions (handleDCCheckAction)
└── Prepare enhanced message
```

**Chi tiết:**
- Kiểm tra input hợp lệ
- Phát hiện và xử lý đối thoại
- Tăng cường đối thoại với context
- Xử lý DC Check actions trước khi gửi AI
- Chuẩn bị message đã được enhance

### 1.2 Context Building (50-100ms)
```
🔄 buildContextForAI() - Dòng 1884
├── Load world data (world_gen_result/currentWorldData)
├── Load character data (currentCharacter)
├── Load scenario data (rp_scenario)
├── Build SCC context (sccService.addTurn)
└── Prepare delta context for AI
```

**Chi tiết:**
- Tải dữ liệu thế giới từ localStorage
- Tải dữ liệu nhân vật
- Tải dữ liệu scenario
- Cập nhật SCC context với player message
- Chuẩn bị delta context cho AI

## PHASE 2: MAIN GEMINI PROMPT PROCESSING (100-3000ms)

### 2.1 Main AI Response Generation (100-3000ms)
```
🤖 geminiService.generateTurnResponseWithDeltaStreaming() - Dòng 1891
├── Build content guidance section
├── Build quest system section  
├── Build relationship section
├── Build core narrative instructions
├── Build arousal system instructions
├── Build dialogue and naming rules
├── Build quest system rules
├── Build NPC and location rules
├── Build item and inventory rules
├── Build narrative structure rules
├── Add sex education framing (if 18+)
├── Construct final prompt
└── Send to Gemini API with streaming
```

**Prompt Structure:**
- **Content Guidance**: Quy tắc nội dung 18+
- **Quest Context**: Quest đang active, quest đã từ chối
- **Relationship Context**: Mối quan hệ NPC, arousal levels
- **Core Instructions**: Quy tắc narrative, tính nhất quán nhân vật
- **Arousal System**: Xử lý nội dung 18+
- **Dialogue Rules**: Đặt tên nhân vật, format đối thoại
- **Quest Rules**: Tạo và quản lý quest
- **NPC Rules**: Hành vi và tương tác NPC
- **Item Rules**: Quản lý inventory và items
- **Narrative Rules**: Cấu trúc câu chuyện và pacing

### 2.2 Response Validation (3000-3050ms)
```
✅ validateAIResponse() - Dòng 1914
├── Check response structure
├── Validate narrative content
├── Verify required fields
└── Set aiResponseSuccess flag
```

**Chi tiết:**
- Kiểm tra cấu trúc response
- Validate nội dung narrative
- Xác minh các trường bắt buộc
- Set flag thành công cho AI response

## PHASE 3: PARALLEL POST-PROCESSING (3050-8000ms)

### 3.1 Parallel Tasks Execution (3050-8000ms)
```
⚡ Promise.all(parallelTasks) - Dòng 2482
├── Task 1: Quest Processing
│   └── Process quest completion/offers
├── Task 2: Signature NPC Linking  
│   └── Link NPCs with signature quests
├── Task 3: Character Status Parsing
│   └── Parse character status from AI response
├── Task 4: NPC Analysis (if narrative exists)
│   └── retryNPCAnalysis() - Analyze NPC relationships
├── Task 5: Action Suggestions
│   └── loadActionSuggestions() - Generate new suggestions
├── Task 6: Duration Estimation (NEW - Parallel)
│   └── estimateActionDurationAsync() - Estimate action duration
└── Task 7: ComfyUI Image Generation (if enabled)
    └── generateImageForResponse() - Generate scene image
```

### 3.2 Individual Parallel Tasks Detail

#### Task 4: NPC Analysis (Parallel)
```
🤖 npcRelationshipService.retryNPCAnalysis()
├── Extract NPCs from narrative
├── For each NPC:
│   ├── analyzeNPCInteractionSentiment()
│   │   ├── Build AI prompt for relationship analysis
│   │   ├── Send to Gemini API
│   │   └── Parse relationship changes
│   └── Update NPC relationship data
└── Save updated relationships
```

**Prompt cho NPC Analysis:**
- Phân tích tác động hành động lên mối quan hệ
- Scoring guidelines thực tế (-20 to +20)
- Xem xét personality và background của NPC
- Cập nhật relationship level và status

#### Task 5: Action Suggestions (Parallel)
```
🤖 actionSuggestionService.generateSuggestions()
├── Build suggestion prompt
├── Send to Gemini API
├── Parse suggestions from response
└── Filter by content flags
```

**Prompt cho Action Suggestions:**
- Tạo 4 gợi ý hành động ngắn gọn
- Ưu tiên cốt truyện > quest > hành động thường > 18+
- Hướng dẫn tạo Attack actions và DC Check actions
- Lọc bỏ hành động di chuyển đến địa điểm có sẵn

#### Task 6: Duration Estimation (Parallel) - MỚI
```
🤖 actionSuggestionService.estimateActionDurationAsync()
├── Check cache first
├── Try keyword-based estimation
├── Try pattern-based estimation
├── If needed: Send to Gemini API
└── Return duration with message
```

**Prompt cho Duration Estimation:**
- Ước tính thời gian (phút) cho hành động
- Context: location và level nhân vật
- Trả về số từ 5-60 phút
- Fallback thông minh dựa trên độ dài message

#### Task 7: ComfyUI Image Generation (Parallel)
```
🎨 generateImageForResponse()
├── promptExtractionService.extractVisualPrompt()
│   ├── Build visual prompt for Stable Diffusion
│   ├── Send to Gemini API
│   └── Parse visual prompt response
├── Generate image via ComfyUI API
└── Save generated image
```

**Prompt cho Visual Generation:**
- Tạo prompt chi tiết cho Stable Diffusion
- Tập trung vào visual elements: địa điểm, nhân vật, khí quyển
- Sử dụng quality tags cao
- Tránh text, chữ viết, watermark

## PHASE 4: POST-PROCESSING (8000-8500ms)

### 4.1 Sequential Tasks (8000-8500ms)
```
🔄 After Promise.all() completes
├── Advance world time (using duration from Task 6)
├── Check and restock merchant shops
├── Save SCC context
├── Handle summarization (if needed)
├── Process pending attack actions
└── Update UI state
```

**Chi tiết:**
- Cập nhật thời gian thế giới dựa trên duration từ Task 6
- Kiểm tra và restock cửa hàng merchant
- Lưu SCC context
- Xử lý summarization nếu cần
- Xử lý pending attack actions
- Cập nhật UI state

## PHASE 5: UI UPDATE (8500-9000ms)

### 5.1 State Updates (8500-9000ms)
```
🔄 Final UI updates
├── Update chat history
├── Update scene state
├── Update action suggestions
├── Update NPC relationships
├── Update quest system
└── Clear loading states
```

## 📊 PERFORMANCE METRICS

### Timing Breakdown:
- **Pre-processing**: ~100ms
- **Main AI Response**: ~3000ms (streaming)
- **Parallel Post-processing**: ~5000ms
- **Sequential Post-processing**: ~500ms
- **UI Updates**: ~500ms
- **Total**: ~9100ms

### Parallel Efficiency:
- **Before**: Sequential processing (~8000ms)
- **After**: Parallel processing (~5000ms)
- **Improvement**: ~37.5% faster

### Gemini API Calls per Turn:
1. **Main Response**: 1 call (streaming)
2. **NPC Analysis**: 1-3 calls (per NPC)
3. **Action Suggestions**: 1 call
4. **Duration Estimation**: 0-1 call (cached/keyword first)
5. **Image Generation**: 1 call (prompt extraction)
6. **Total**: 4-7 calls per turn

## 🔧 OPTIMIZATION FEATURES

### Caching:
- **Duration estimation cache**: Lưu kết quả ước tính thời gian
- **Visual prompt cache**: Lưu prompt cho image generation
- **API key rotation**: Tự động chuyển đổi API key khi có lỗi

### Error Handling:
- **Retry mechanisms**: Exponential backoff cho failed requests
- **Fallback suggestions**: Gợi ý dự phòng khi AI fail
- **Graceful degradation**: Hệ thống vẫn hoạt động khi có lỗi

### Streaming:
- **Real-time narrative display**: Hiển thị narrative theo thời gian thực
- **Progressive UI updates**: Cập nhật UI từng phần
- **Better user experience**: Trải nghiệm người dùng tốt hơn

## 🚀 CẢI TIẾN GẦN ĐÂY

### Duration Estimation Parallel Processing:
- Chuyển đổi `estimateActionDuration` thành parallel task
- Chạy song song với các task khác sau AI response
- Giảm thời gian chờ tổng thể
- Tương thích ngược với code cũ

### Hệ thống Parallel Tasks:
1. **Task 1**: Quest Processing
2. **Task 2**: Signature NPC Linking  
3. **Task 3**: Character Status Parsing
4. **Task 4**: NPC Analysis
5. **Task 5**: Action Suggestions
6. **Task 6**: Duration Estimation (mới)
7. **Task 7**: ComfyUI Image Generation
8. **Task 8**: Check and restock merchant shops

## 📝 GHI CHÚ KỸ THUẬT

### File Locations:
- **Main Processing**: `src/pages/GamePage.tsx` (dòng 1750-4927)
- **Action Suggestions**: `src/services/actionSuggestionService.ts`
- **NPC Analysis**: `src/services/npcRelationshipService.ts`
- **Gemini Service**: `src/services/geminiService.ts`
- **Visual Generation**: `src/services/promptExtractionService.ts`

### Key Functions:
- `sendMessage()`: Entry point chính
- `generateTurnResponseWithDeltaStreaming()`: AI response generation
- `estimateActionDurationAsync()`: Duration estimation (parallel)
- `retryNPCAnalysis()`: NPC relationship analysis
- `generateSuggestions()`: Action suggestions generation

### Dependencies:
- Google Generative AI SDK
- Multi-API key service
- ComfyUI integration
- Local storage management
- SCC (Story Context Control) service

---

*Tài liệu này được tạo tự động dựa trên phân tích codebase. Cập nhật lần cuối: $(date)*
