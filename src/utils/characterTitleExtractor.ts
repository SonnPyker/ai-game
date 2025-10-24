/**
 * Utility để trích xuất danh hiệu/nghề nghiệp từ backstory của nhân vật
 * Sử dụng AI để phân tích chính xác hơn
 */

export interface CharacterTitle {
  title: string;
  confidence: number; // 0-1, độ tin cậy của việc trích xuất
  source: 'backstory' | 'description' | 'inferred' | 'ai_analyzed';
}

/**
 * Trích xuất danh hiệu từ backstory hoặc mô tả nhân vật
 */
export function extractCharacterTitle(backstory: string, description?: string): CharacterTitle {
  const text = `${backstory} ${description || ''}`.toLowerCase();
  
  // Danh sách các pattern để tìm danh hiệu/nghề nghiệp
  const titlePatterns = [
    // Nghề nghiệp giáo dục
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:thầy giáo|giáo viên|giảng viên|giáo sư|hiệu trưởng|phó hiệu trưởng|trợ giảng|gia sư)/i, 
      title: 'Thầy giáo', confidence: 0.9 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:cô giáo|nữ giáo viên|nữ giảng viên|nữ giáo sư)/i, 
      title: 'Cô giáo', confidence: 0.9 },
    
    // Nghề nghiệp chính phủ/công chức
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:nhân viên chính phủ|công chức|viên chức|quan chức|bộ trưởng|thứ trưởng|giám đốc|phó giám đốc)/i, 
      title: 'Nhân viên chính phủ', confidence: 0.9 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:cảnh sát|cảnh sát trưởng|thanh tra|điều tra viên)/i, 
      title: 'Cảnh sát', confidence: 0.9 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:quân nhân|sĩ quan|đại úy|trung úy|thiếu úy|tướng|đại tướng)/i, 
      title: 'Quân nhân', confidence: 0.9 },
    
    // Nghề nghiệp y tế
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:bác sĩ|y sĩ|y tá|dược sĩ|nha sĩ|bác sĩ tâm lý|bác sĩ phẫu thuật)/i, 
      title: 'Bác sĩ', confidence: 0.9 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:y tá|điều dưỡng|hộ lý)/i, 
      title: 'Y tá', confidence: 0.9 },
    
    // Nghề nghiệp pháp lý
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:luật sư|thẩm phán|kiểm sát viên|thư ký tòa án|thực tập sinh luật)/i, 
      title: 'Luật sư', confidence: 0.9 },
    
    // Nghề nghiệp kinh doanh
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:doanh nhân|giám đốc|phó giám đốc|quản lý|trưởng phòng|nhân viên kinh doanh|thương gia)/i, 
      title: 'Doanh nhân', confidence: 0.8 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:kế toán|kiểm toán|tài chính|ngân hàng)/i, 
      title: 'Kế toán', confidence: 0.8 },
    
    // Nghề nghiệp kỹ thuật
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:kỹ sư|công nghệ|lập trình viên|developer|IT|kỹ thuật viên)/i, 
      title: 'Kỹ sư', confidence: 0.8 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:nhà khoa học|nghiên cứu viên|phòng thí nghiệm)/i, 
      title: 'Nhà khoa học', confidence: 0.8 },
    
    // Nghề nghiệp nghệ thuật
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:nghệ sĩ|họa sĩ|nhạc sĩ|ca sĩ|diễn viên|đạo diễn|nhà văn|nhà thơ)/i, 
      title: 'Nghệ sĩ', confidence: 0.8 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:nhà báo|phóng viên|biên tập viên|tác giả)/i, 
      title: 'Nhà báo', confidence: 0.8 },
    
    // Nghề nghiệp dịch vụ
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:đầu bếp|bồi bàn|lễ tân|bảo vệ|tài xế|thợ sửa chữa)/i, 
      title: 'Nhân viên dịch vụ', confidence: 0.7 },
    
    // Nghề nghiệp pháp sư/magical
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:pháp sư|phù thủy|thầy pháp|thực tập sinh pháp sư|học viên pháp sư)/i, 
      title: 'Pháp sư', confidence: 0.9 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:thầy pháp|thầy phù thủy|pháp sư cao cấp|đại pháp sư)/i, 
      title: 'Thầy pháp', confidence: 0.9 },
    
    // Nghề nghiệp phiêu lưu
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:thợ săn|thám hiểm|phiêu lưu gia|hiệp sĩ|chiến binh)/i, 
      title: 'Phiêu lưu gia', confidence: 0.8 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:trộm|sát thủ|ninja|đặc vụ|gián điệp)/i, 
      title: 'Đặc vụ', confidence: 0.8 },
    
    // Học sinh/sinh viên
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:học sinh|sinh viên|nghiên cứu sinh|thực tập sinh)/i, 
      title: 'Sinh viên', confidence: 0.8 },
    
    // Nghề nghiệp tôn giáo
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:linh mục|thầy tu|sư|ni sư|mục sư|giáo sĩ)/i, 
      title: 'Giáo sĩ', confidence: 0.9 },
    
    // Nghề nghiệp nông nghiệp
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:nông dân|chăn nuôi|trồng trọt|thợ rừng)/i, 
      title: 'Nông dân', confidence: 0.8 },
    
    // Nghề nghiệp thủ công
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:thợ rèn|thợ mộc|thợ may|thợ gốm|thợ kim hoàn)/i, 
      title: 'Thợ thủ công', confidence: 0.8 },
    
    // Nghề nghiệp siêu nhiên/fantasy
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:thợ săn quỷ|demon hunter|thợ săn ma|quỷ sư|demon slayer)/i, 
      title: 'Thợ Săn Quỷ', confidence: 0.95 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:thợ săn quỷ cấp cao|high-ranking demon hunter|thợ săn ma cấp cao)/i, 
      title: 'Thợ Săn Quỷ Cấp Cao', confidence: 0.98 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:phù thủy|witch|wizard|pháp sư|mage|sorcerer)/i, 
      title: 'Phù Thủy', confidence: 0.9 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:hiệp sĩ|knight|paladin|chiến binh|warrior)/i, 
      title: 'Hiệp Sĩ', confidence: 0.9 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:ninja|assassin|sát thủ|đặc vụ|spy)/i, 
      title: 'Ninja', confidence: 0.9 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:thầy tu|monk|tu sĩ|priest|giáo sĩ)/i, 
      title: 'Thầy Tu', confidence: 0.9 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:ranger|thợ săn|hunter|tracker)/i, 
      title: 'Thợ Săn', confidence: 0.8 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:bard|nhạc sĩ|ca sĩ|nghệ sĩ)/i, 
      title: 'Nghệ Sĩ', confidence: 0.8 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:rogue|trộm|thief|burglar)/i, 
      title: 'Trộm', confidence: 0.8 },
    { pattern: /(?:là|từng là|hiện là|đang làm|đang học|đang thực tập)\s*(?:một\s*)?(?:cleric|healer|chữa bệnh|healing priest)/i, 
      title: 'Thầy Thuốc', confidence: 0.9 }
  ];
  
  // Tìm pattern phù hợp nhất
  let bestMatch: CharacterTitle | null = null;
  
  for (const { pattern, title, confidence } of titlePatterns) {
    if (pattern.test(text)) {
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = {
          title,
          confidence,
          source: 'backstory'
        };
      }
    }
  }
  
  // Nếu không tìm thấy, thử suy luận từ context
  if (!bestMatch) {
    const inferredTitle = inferTitleFromContext(text);
    if (inferredTitle) {
      bestMatch = {
        title: inferredTitle,
        confidence: 0.5,
        source: 'inferred'
      };
    }
  }
  
  // Nếu vẫn không có, trả về mặc định
  return bestMatch || {
    title: 'Thường dân',
    confidence: 0.1,
    source: 'inferred'
  };
}

/**
 * Suy luận danh hiệu từ context khi không tìm thấy pattern rõ ràng
 */
function inferTitleFromContext(text: string): string | null {
  // Tìm các từ khóa gợi ý
  if (text.includes('học') || text.includes('trường') || text.includes('đại học')) {
    return 'Sinh viên';
  }
  
  if (text.includes('bệnh viện') || text.includes('y tế') || text.includes('chữa bệnh')) {
    return 'Nhân viên y tế';
  }
  
  if (text.includes('công ty') || text.includes('doanh nghiệp') || text.includes('kinh doanh')) {
    return 'Nhân viên văn phòng';
  }
  
  if (text.includes('pháp luật') || text.includes('tòa án') || text.includes('luật')) {
    return 'Nhân viên pháp lý';
  }
  
  if (text.includes('nghệ thuật') || text.includes('sáng tạo') || text.includes('vẽ') || text.includes('nhạc')) {
    return 'Nghệ sĩ';
  }
  
  if (text.includes('công nghệ') || text.includes('máy tính') || text.includes('lập trình')) {
    return 'Kỹ sư';
  }
  
  if (text.includes('phép thuật') || text.includes('ma thuật') || text.includes('phù thủy')) {
    return 'Pháp sư';
  }
  
  if (text.includes('phiêu lưu') || text.includes('thám hiểm') || text.includes('hiệp sĩ')) {
    return 'Phiêu lưu gia';
  }
  
  // Kiểm tra các từ khóa siêu nhiên
  if (text.includes('quỷ') || text.includes('demon') || text.includes('ma') || text.includes('ghost')) {
    if (text.includes('săn') || text.includes('hunt') || text.includes('slay') || text.includes('tiêu diệt')) {
      return 'Thợ Săn Quỷ';
    }
  }
  
  if (text.includes('phép thuật') || text.includes('magic') || text.includes('spell') || text.includes('enchant')) {
    return 'Pháp sư';
  }
  
  if (text.includes('kiếm') || text.includes('sword') || text.includes('vũ khí') || text.includes('weapon')) {
    if (text.includes('hiệp sĩ') || text.includes('knight') || text.includes('warrior')) {
      return 'Hiệp Sĩ';
    }
  }
  
  return null;
}

/**
 * Phân tích danh hiệu bằng AI từ backstory
 */
export async function analyzeCharacterTitleWithAI(backstory: string, personality?: string): Promise<CharacterTitle> {
  try {
    // Import GeminiService dynamically để tránh circular dependency
    const { geminiService } = await import('../services/geminiService');
    
    const prompt = `
Hãy phân tích backstory và personality của nhân vật để xác định danh hiệu/nghề nghiệp chính xác nhất.

Backstory: "${backstory}"
${personality ? `Personality: "${personality}"` : ''}

Hãy trả về danh hiệu phù hợp nhất dựa trên thông tin trên. Ưu tiên các danh hiệu fantasy/supernatural nếu có.

Ví dụ:
- Nếu là thợ săn quỷ → "Thợ Săn Quỷ" hoặc "Thợ Săn Quỷ Cấp Cao"
- Nếu là pháp sư → "Pháp sư" hoặc "Phù Thủy"
- Nếu là hiệp sĩ → "Hiệp Sĩ"
- Nếu là ninja → "Ninja"
- Nếu là thầy tu → "Thầy Tu"
- Nếu là thầy thuốc → "Thầy Thuốc"
- Nếu là nghệ sĩ → "Nghệ Sĩ"
- Nếu là thợ săn thông thường → "Thợ Săn"
- Nếu là trộm → "Trộm"
- Nếu không rõ ràng → "Thường dân"

Chỉ trả về danh hiệu, không giải thích thêm.
`;

    const response = await geminiService.generateContent(prompt);

    const aiTitle = response.trim();
    
    return {
      title: aiTitle,
      confidence: 0.9,
      source: 'ai_analyzed'
    };
  } catch (error) {
    console.warn('AI title analysis failed, falling back to pattern matching:', error);
    return extractCharacterTitle(backstory, personality);
  }
}

/**
 * Lấy danh hiệu hiển thị cho nhân vật với AI analysis
 */
export async function getCharacterDisplayTitleWithAI(character: { backstory: string; appearance?: string; personality?: string }): Promise<string> {
  // Thử AI analysis trước
  const aiTitle = await analyzeCharacterTitleWithAI(character.backstory, character.personality);
  
  // Nếu AI trả về kết quả tốt, sử dụng nó
  if (aiTitle.confidence > 0.7) {
    return aiTitle.title;
  }
  
  // Fallback về pattern matching
  const titleInfo = extractCharacterTitle(character.backstory, character.appearance || character.personality);
  return titleInfo.title;
}

/**
 * Lấy danh hiệu hiển thị cho nhân vật (sync version)
 */
export function getCharacterDisplayTitle(character: { backstory: string; appearance?: string; personality?: string }): string {
  const titleInfo = extractCharacterTitle(character.backstory, character.appearance || character.personality);
  return titleInfo.title;
}

/**
 * Cập nhật danh hiệu nhân vật và lưu vào localStorage
 */
export function updateCharacterTitle(character: any, title: string): void {
  if (character) {
    character.title = title;
    
    // Lưu vào localStorage
    try {
      localStorage.setItem('currentCharacter', JSON.stringify(character));
    } catch (error) {
      console.warn('Không thể lưu danh hiệu vào localStorage:', error);
    }
  }
}

/**
 * Lấy danh hiệu từ character data (ưu tiên title đã lưu)
 */
export function getCharacterTitle(character: any): string {
  if (!character) return 'Thường dân';
  
  // Ưu tiên title đã lưu
  if (character.title) {
    return character.title;
  }
  
  // Fallback về pattern matching
  return getCharacterDisplayTitle(character);
}
