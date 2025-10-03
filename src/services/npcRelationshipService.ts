import { NPCRelationship, NPCEncounter, ContentFlags } from '../types';
import { npcArousalService } from './npcArousalService';

class NPCRelationshipService {
  private static instance: NPCRelationshipService;
  private relationships: Map<string, NPCRelationship> = new Map();
  
  // Performance optimization: Cache for similar narratives
  private analysisCache: Map<string, any> = new Map();
  private readonly CACHE_SIZE_LIMIT = 50;
  private encounters: NPCEncounter[] = [];
  
  // Faction reputation storage
  private factionReputations: Map<string, number> = new Map();

  // Shared constants to avoid duplication
  private readonly GROUP_KEYWORDS = [
    'hơn chục', 'nhiều', 'một nhóm', 'các', 'những', 'tất cả', 'mọi người',
    'học viên', 'sinh viên', 'người dân', 'thường dân', 'quân lính', 'bảo vệ',
    'đám đông', 'nhóm người', 'tập thể', 'đoàn', 'bầy', 'bọn', 'lũ'
  ];

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): NPCRelationshipService {
    if (!NPCRelationshipService.instance) {
      NPCRelationshipService.instance = new NPCRelationshipService();
    }
    return NPCRelationshipService.instance;
  }

  // Load data from localStorage
  private loadFromStorage(): void {
    try {
      const relationshipsData = localStorage.getItem('npc_relationships');
      if (relationshipsData) {
        const relationships = JSON.parse(relationshipsData);
        this.relationships = new Map(relationships.map((r: any) => [r.id, {
          ...r,
          lastInteraction: new Date(r.lastInteraction)
        }]));
        
        // Auto-fix any incorrect statuses after loading
        setTimeout(() => {
          this.fixAllNPCStatuses();
        }, 1000); // Wait 1 second to ensure everything is loaded
      }

      const encountersData = localStorage.getItem('npc_encounters');
      if (encountersData) {
        this.encounters = JSON.parse(encountersData).map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
      }

      // Load faction reputations
      this.loadFactionReputations();
    } catch (error) {
      console.error('Error loading NPC relationship data:', error);
    }
  }

  // Save data to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem('npc_relationships', JSON.stringify(Array.from(this.relationships.values())));
      localStorage.setItem('npc_encounters', JSON.stringify(this.encounters));
    } catch (error) {
      console.error('Error saving NPC relationship data:', error);
    }
  }

  // Public method to save data
  public saveData(): void {
    this.saveToStorage();
  }

  // NPC Relationship Management
  addOrUpdateRelationship(npcData: Partial<NPCRelationship>): NPCRelationship {
    const id = npcData.id || this.generateId();
    const existing = this.relationships.get(id);
    
    const relationship: NPCRelationship = {
      id,
      name: npcData.name || 'Unknown NPC',
      description: npcData.description,
      relationshipLevel: npcData.relationshipLevel ?? (existing?.relationshipLevel ?? 0),
      reputation: npcData.reputation ?? (existing?.reputation ?? 0),
      status: npcData.status ?? (existing?.status ?? 'neutral'),
      lastInteraction: npcData.lastInteraction ?? new Date(),
      totalInteractions: npcData.totalInteractions ?? (existing?.totalInteractions ?? 0),
      notes: npcData.notes ?? existing?.notes ?? [],
      tags: npcData.tags ?? existing?.tags ?? [],
      location: npcData.location,
      faction: npcData.faction
    };

    this.relationships.set(id, relationship);
    this.saveToStorage();
    return relationship;
  }

  getRelationship(npcId: string): NPCRelationship | undefined {
    return this.relationships.get(npcId);
  }

  getAllRelationships(): NPCRelationship[] {
    return Array.from(this.relationships.values());
  }

  // Get NPC relationship context for AI
  getRelationshipContext(location?: string): string {
    const relationships = this.getAllRelationships();
    
    if (relationships.length === 0) {
      return 'Nhân vật chưa có quan hệ đặc biệt với ai.';
    }

    // Filter NPCs by location if provided
    const relevantNPCs = location ? 
      relationships.filter(npc => npc.location === location || !npc.location) :
      relationships;

    if (relevantNPCs.length === 0) {
      return `Nhân vật chưa có quan hệ đặc biệt với ai ở ${location}.`;
    }

    const contextParts: string[] = [];
    
    relevantNPCs.forEach(npc => {
      const relationshipDesc = this.getRelationshipDescription(npc.relationshipLevel);
      const reputationDesc = this.getReputationDescription(npc.reputation);
      const statusDesc = this.getStatusDescription(npc.status);
      
      let npcContext = `${npc.name} (${statusDesc}): ${relationshipDesc}, ${reputationDesc}`;
      
      if (npc.faction) {
        npcContext += `, thuộc phe ${npc.faction}`;
      }
      
      if (npc.notes && npc.notes.length > 0) {
        const latestNote = npc.notes[npc.notes.length - 1];
        npcContext += `. Ghi chú: ${latestNote}`;
      }
      
      contextParts.push(npcContext);
    });

    return 'QUAN HỆ NPC HIỆN TẠI:\n' + contextParts.join('\n');
  }


  private getReputationDescription(reputation: number): string {
    if (reputation >= 80) return 'danh tiếng xuất sắc';
    if (reputation >= 60) return 'danh tiếng tốt';
    if (reputation >= 40) return 'danh tiếng khá';
    if (reputation >= 20) return 'danh tiếng ổn';
    if (reputation >= 10) return 'danh tiếng tích cực';
    if (reputation >= -10) return 'danh tiếng trung lập';
    if (reputation >= -20) return 'danh tiếng hơi xấu';
    if (reputation >= -40) return 'danh tiếng không tốt';
    if (reputation >= -60) return 'danh tiếng xấu';
    if (reputation >= -80) return 'danh tiếng rất xấu';
    return 'danh tiếng tệ hại';
  }

  private getStatusDescription(status: string): string {
    switch (status) {
      case 'admiring': return 'Ngưỡng mộ';
      case 'ally': return 'Đồng minh';
      case 'trusting': return 'Tin tưởng';
      case 'friendly': return 'Thân thiện';
      case 'respectful': return 'Tôn trọng';
      case 'neutral': return 'Trung lập';
      case 'acquaintance': return 'Quen biết';
      case 'cautious': return 'Thận trọng';
      case 'suspicious': return 'Nghi ngờ';
      case 'disappointed': return 'Thất vọng';
      case 'rival': return 'Đối thủ';
      case 'enemy': return 'Kẻ thù';
      case 'hostile': return 'Thù địch';
      case 'competitive': return 'Cạnh tranh';
      default: return 'Trung lập';
    }
  }

  updateRelationshipLevel(npcId: string, change: number): void {
    const relationship = this.relationships.get(npcId);
    if (relationship) {
      relationship.relationshipLevel = Math.max(-100, Math.min(100, relationship.relationshipLevel + change));
      relationship.lastInteraction = new Date();
      relationship.totalInteractions++;
      this.saveToStorage();
    }
  }

  updateReputation(npcId: string, change: number): void {
    const relationship = this.relationships.get(npcId);
    if (relationship) {
      relationship.reputation = Math.max(-100, Math.min(100, relationship.reputation + change));
      relationship.lastInteraction = new Date();
      this.saveToStorage();
    }
  }

  // Remove NPC relationship
  removeRelationship(npcId: string): boolean {
    if (this.relationships.has(npcId)) {
      this.relationships.delete(npcId);
      
      // Also remove related encounters
      this.encounters = this.encounters.filter(encounter => {
        const relatedRelationship = this.findRelationshipByName(encounter.npcName);
        return relatedRelationship !== undefined;
      });
      
      this.saveToStorage();
      console.log(`✅ Removed NPC relationship: ${npcId}`);
      return true;
    }
    console.log(`❌ NPC relationship not found: ${npcId}`);
    return false;
  }

  // Enhanced method with comprehensive context analysis
  // OPTIMIZED: Batch analysis for better performance
  async updateRelationshipsFromNarrative(narrative: string, location?: string, additionalContext?: {
    chatHistory?: Array<{ role: string; content: string }>;
    sceneState?: any;
    sccSummary?: any;
    playerAction?: string;
    contentFlags?: ContentFlags;
  }): Promise<void> {
    if (!narrative) return;

    const allRelationships = this.getAllRelationships();
    const relevantNPCs = location ? 
      allRelationships.filter(npc => npc.location === location || !npc.location) :
      allRelationships;

    // Find NPCs mentioned in narrative
    const mentionedNPCs = relevantNPCs.filter(npc => 
      this.isNPCMentionedInContext(npc.name, narrative, additionalContext)
    );

    if (mentionedNPCs.length === 0) {
      console.log('📝 No NPCs mentioned in narrative, skipping analysis');
      return;
    }

    // OPTIMIZATION: Batch analysis for multiple NPCs
    if (mentionedNPCs.length > 1) {
      console.log(`🚀 Batch analyzing ${mentionedNPCs.length} NPCs for better performance`);
      await this.batchAnalyzeNPCInteractions(narrative, mentionedNPCs, additionalContext);
    } else {
      // Single NPC - use optimized single analysis
      console.log(`⚡ Single NPC analysis for ${mentionedNPCs[0].name}`);
      await this.analyzeSingleNPCInteraction(narrative, mentionedNPCs[0], additionalContext);
    }

    // Arousal processing is now integrated into the main analysis above

    // Save once after all updates
    this.saveToStorage();
  }

  // NEW: Batch analysis for multiple NPCs in one AI call
  private async batchAnalyzeNPCInteractions(
    narrative: string, 
    npcs: any[], 
    additionalContext?: any
  ): Promise<void> {
    try {
      // Check cache first for performance
      const cacheKey = this.generateCacheKey(narrative, npcs);
      const cachedResult = this.analysisCache.get(cacheKey);
      
      if (cachedResult) {
        console.log('⚡ Using cached analysis result for better performance');
        this.applyCachedResults(npcs, cachedResult, narrative, additionalContext);
        return;
      }

      const { geminiService } = await import('../services/geminiService');
      
      if (!geminiService.isConfigured()) {
        console.warn('⚠️ Gemini not configured, skipping batch analysis');
        return;
      }

      // Create compact NPC summary for AI
      const npcSummary = npcs.map(npc => ({
        name: npc.name,
        currentLevel: npc.relationshipLevel,
        currentStatus: npc.status,
        location: npc.location
      }));

      const prompt = `Bạn là AI phân tích tác động của hành động lên mối quan hệ NPC.

NGỮ CẢNH:
- Narrative: "${narrative}"
- NPCs: ${JSON.stringify(npcSummary)}
- Player Action: "${additionalContext?.playerAction || 'N/A'}"

NHIỆM VỤ:
Phân tích tác động lên TẤT CẢ NPCs được đề cập trong narrative.

SCORING GUIDELINES:
RELATIONSHIP CHANGE (-25 to +25):
- Cứu khỏi cái chết: +15 to +25
- Giúp đỡ quan trọng: +8 to +15
- Hành động tốt: +3 to +8
- Tương tác bình thường: +1 to +3
- Phớt lờ: -1 to -3
- Từ chối giúp đỡ: -3 to -8
- Phản bội: -8 to -15
- Tấn công/giết: -15 to -25

REPUTATION CHANGE (-10 to +10):
- Hành động anh hùng: +4 to +10
- Giao dịch công bằng: +1 to +3
- Bình thường: 0 to +1
- Hành vi không tốt: -1 to -3
- Tội ác công khai: -4 to -10

OUTPUT JSON:
{
  "npcs": [
    {
      "name": "NPC_NAME",
      "relationshipChange": number,
      "reputationChange": number,
      "newStatus": "string" | null,
      "contextNote": "string",
      "reasoning": "string"
    }
  ]
}`;

      const responseText = await geminiService.generateContent(prompt);
      const result = this.parseJsonResponse(responseText, { npcs: [] });

      console.log(`🤖 Batch AI Analysis completed for ${result.npcs?.length || 0} NPCs`);

      // Cache the result for future use
      this.cacheAnalysisResult(cacheKey, result);

      // Apply results to each NPC
      if (result.npcs && Array.isArray(result.npcs)) {
        for (const analysis of result.npcs) {
          const npc = npcs.find(n => n.name === analysis.name);
          if (npc && analysis) {
            this.applyNPCAnalysisResult(npc, analysis, narrative, additionalContext);
          }
        }
      }

    } catch (error) {
      console.warn('⚠️ Batch analysis failed, falling back to individual analysis:', error);
      // Fallback to individual analysis
      for (const npc of npcs) {
        await this.analyzeSingleNPCInteraction(narrative, npc, additionalContext);
      }
    }
  }

  // NEW: Optimized single NPC analysis
  private async analyzeSingleNPCInteraction(
    narrative: string, 
    npc: any, 
    additionalContext?: any
  ): Promise<void> {
    try {
      const sentiment = await this.analyzeNPCInteractionSentimentEnhanced(
        narrative, 
        npc.name, 
        npc.relationshipLevel, 
        npc,
        additionalContext
      );
      
      this.applyNPCAnalysisResult(npc, sentiment, narrative, additionalContext);
      
      // Process arousal if available and adult content is enabled
      if (sentiment.arousalChange !== undefined && additionalContext?.contentFlags?.adult_enabled && 
          additionalContext.contentFlags.adult_intensity === 'direct') {
        // Initialize arousal if not exists
        if (!npc.arousal) {
          npcArousalService.initializeArousalForNPC(npc);
        }
        
        // Update arousal
        if (sentiment.arousalChange !== 0) {
          npcArousalService.updateNPCArousal(
            npc,
            sentiment.arousalChange,
            sentiment.arousalReason || 'Unknown reason',
            sentiment.arousalContext || 'General interaction',
            sentiment.arousalIntensity || 'low'
          );
        }
      }
    } catch (error) {
      console.warn(`⚠️ Single NPC analysis failed for ${npc.name}:`, error);
    }
  }

  // NEW: Apply analysis result to NPC
  private applyNPCAnalysisResult(npc: any, analysis: any, narrative: string, additionalContext?: any): void {
    let hasChanges = false;

    // Apply relationship changes
    if (analysis.relationshipChange && analysis.relationshipChange !== 0) {
      this.updateRelationshipLevel(npc.id, analysis.relationshipChange);
      hasChanges = true;
    }
    
    // Apply reputation changes
    if (analysis.reputationChange && analysis.reputationChange !== 0) {
      this.updateReputation(npc.id, analysis.reputationChange);
      hasChanges = true;
    }

    // Update status if significant change
    if (analysis.newStatus && analysis.newStatus !== npc.status) {
      const validStatuses = [
        'neutral', 'friendly', 'hostile', 'rival',
        'acquaintance', 'ally', 'enemy', 'suspicious', 'admiring', 'respectful',
        'disappointed', 'cautious', 'trusting', 'competitive'
      ];
      if (validStatuses.includes(analysis.newStatus)) {
        npc.status = analysis.newStatus as any;
        hasChanges = true;
      }
    }

    // Auto-fix status based on current relationship level
    const currentLevelStatus = this.determineStatusByRelationshipLevel(npc.relationshipLevel);
    if (currentLevelStatus && currentLevelStatus !== npc.status) {
      const oldStatus = npc.status;
      npc.status = currentLevelStatus as any;
      hasChanges = true;
      console.log(`🔧 Auto-fixed ${npc.name} status: '${oldStatus}' → '${currentLevelStatus}' (Level: ${npc.relationshipLevel})`);
    }

    // Add contextual notes
    if (analysis.contextNote) {
      this.addNotesToNPC(npc, [analysis.contextNote], 20);
      hasChanges = true;
    }

    // Generate enhanced notes with all available context
    if (additionalContext) {
      const enhancedNotes = this.generateEnhancedNotes(npc.name, narrative, additionalContext);
      if (enhancedNotes.length > 0) {
        this.addNotesToNPC(npc, enhancedNotes, 20);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      npc.lastInteraction = new Date();
      npc.totalInteractions++;
    }
  }

  // NEW: Cache management methods for performance optimization
  private generateCacheKey(narrative: string, npcs: any[]): string {
    const npcNames = npcs.map(npc => npc.name).sort().join(',');
    const narrativeHash = this.simpleHash(narrative);
    return `${narrativeHash}_${npcNames}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private cacheAnalysisResult(key: string, result: any): void {
    // Limit cache size to prevent memory issues
    if (this.analysisCache.size >= this.CACHE_SIZE_LIMIT) {
      const firstKey = this.analysisCache.keys().next().value;
      if (firstKey) {
        this.analysisCache.delete(firstKey);
      }
    }
    
    this.analysisCache.set(key, result);
    console.log(`💾 Cached analysis result (${this.analysisCache.size}/${this.CACHE_SIZE_LIMIT})`);
  }

  private applyCachedResults(npcs: any[], cachedResult: any, narrative: string, additionalContext?: any): void {
    if (cachedResult.npcs && Array.isArray(cachedResult.npcs)) {
      for (const analysis of cachedResult.npcs) {
        const npc = npcs.find(n => n.name === analysis.name);
        if (npc && analysis) {
          this.applyNPCAnalysisResult(npc, analysis, narrative, additionalContext);
        }
      }
    }
  }


  // Get arousal context for AI
  getArousalContext(location?: string): string {
    const relationships = this.getAllRelationships();
    const relevantNPCs = location ? 
      relationships.filter(npc => npc.location === location || !npc.location) :
      relationships;

    const arousalContexts = relevantNPCs
      .filter(npc => npc.arousal)
      .map(npc => npcArousalService.getArousalContext(npc));

    return arousalContexts.length > 0 ? arousalContexts.join('\n') : '';
  }

  // Clear cache when needed
  public clearAnalysisCache(): void {
    this.analysisCache.clear();
    console.log('🗑️ Analysis cache cleared');
  }

  // Legacy method for backward compatibility
  async updateRelationshipsFromNarrativeSimple(narrative: string, location?: string): Promise<void> {
    await this.updateRelationshipsFromNarrative(narrative, location);
  }

  // Force update all NPC statuses based on current relationship levels
  fixAllNPCStatuses(): void {
    console.log('🔧 Fixing all NPC statuses based on current relationship levels...');
    
    this.relationships.forEach(npc => {
      const correctStatus = this.determineStatusByRelationshipLevel(npc.relationshipLevel);
      if (correctStatus && correctStatus !== npc.status) {
        const oldStatus = npc.status;
        npc.status = correctStatus as any;
        console.log(`🔧 Fixed ${npc.name}: '${oldStatus}' → '${correctStatus}' (Level: ${npc.relationshipLevel})`);
      }
    });
    
    this.saveToStorage();
    console.log('✅ All NPC statuses have been fixed!');
  }

  private async analyzeNPCInteractionSentiment(
    narrative: string, 
    npcName: string, 
    currentRelationshipLevel: number = 0,
    additionalContext?: {
      chatHistory?: Array<{ role: string; content: string }>;
      sceneState?: any;
      sccSummary?: any;
      playerAction?: string;
      contentFlags?: ContentFlags;
    }
  ): Promise<{
    relationshipChange: number;
    reputationChange: number;
    newStatus?: string;
    contextNote?: string;
    arousalChange?: number;
    arousalReason?: string;
    arousalContext?: string;
    arousalIntensity?: 'low' | 'medium' | 'high';
  }> {
    // Only use AI analysis
    try {
      return await this.analyzeInteractionWithAI(narrative, npcName, currentRelationshipLevel, additionalContext);
    } catch (error) {
      console.warn('⚠️ AI analysis failed, returning neutral result:', error);
      // Return neutral result when AI fails
      return {
        relationshipChange: 0,
        reputationChange: 0,
        newStatus: undefined,
        contextNote: 'Không thể phân tích tương tác (AI service unavailable)'
      };
    }
  }

  private async analyzeInteractionWithAI(
    narrative: string, 
    npcName: string, 
    currentRelationshipLevel: number,
    additionalContext?: {
      chatHistory?: Array<{ role: string; content: string }>;
      sceneState?: any;
      sccSummary?: any;
      playerAction?: string;
      contentFlags?: ContentFlags;
    }
  ): Promise<{
    relationshipChange: number;
    reputationChange: number;
    newStatus?: string;
    contextNote?: string;
    arousalChange?: number;
    arousalReason?: string;
    arousalContext?: string;
    arousalIntensity?: 'low' | 'medium' | 'high';
  }> {
    // Import geminiService
    const { geminiService } = await import('../services/geminiService');
    
    if (!geminiService.isConfigured()) {
      throw new Error('Gemini not configured');
    }

    // Generate NPC personality traits for more realistic analysis
    const npcPersonality = this.generateNPCPersonality(npcName);

    // Build context for arousal analysis
    const sceneStateContext = additionalContext?.sceneState ? 
      npcArousalService['buildSceneStateContext'](additionalContext.sceneState) : '';
    const chatHistoryContext = additionalContext?.chatHistory ? 
      npcArousalService['buildChatHistoryContext'](additionalContext.chatHistory) : '';
    const playerActionContext = additionalContext?.playerAction ? 
      `\nHÀNH ĐỘNG NGƯỜI CHƠI: "${additionalContext.playerAction}"` : '';

    // Check if arousal analysis should be included
    const shouldIncludeArousal = additionalContext?.contentFlags?.adult_enabled && 
      additionalContext.contentFlags.adult_intensity === 'direct';

    const prompt = `Bạn là AI phân tích tác động của hành động lên mối quan hệ NPC với tư duy THỰC TẾ và NGHIÊM NGẶT.

NGỮ CẢNH:
- Narrative: "${narrative}"
- NPC: "${npcName}"
- Relationship hiện tại: ${currentRelationshipLevel}/100 (${this.getRelationshipDescription(currentRelationshipLevel)})
- Tính cách NPC: ${npcPersonality}

${sceneStateContext}

${chatHistoryContext}${playerActionContext}

NHIỆM VỤ:
Phân tích hành động của người chơi trong narrative và tác động lên mối quan hệ với ${npcName} một cách THỰC TẾ, dựa trên tính cách của NPC.

NGUYÊN TẮC PHÂN TÍCH THỰC TẾ:
1. NPCs có tính cách riêng, không phải lúc nào cũng đồng tình
2. Hành động nhỏ chỉ có tác động nhỏ, không phải lúc nào cũng tích cực
3. Mối quan hệ cần thời gian xây dựng, không thể tăng nhanh
4. NPCs có thể hiểu lầm, nghi ngờ, hoặc không thích hành động của người chơi
5. Ngữ cảnh và tình huống quan trọng hơn ý định

SCORING GUIDELINES (THỰC TẾ HƠN):
RELATIONSHIP CHANGE (-20 to +20):
- Cứu khỏi cái chết, hy sinh vì NPC: +12 to +20
- Giúp đỡ quan trọng, bảo vệ khỏi nguy hiểm: +5 to +12
- Hành động tốt, chia sẻ, hỗ trợ: +1 to +5
- Tương tác bình thường, trò chuyện: 0 to +2
- Phớt lờ, thờ ơ: -1 to -2
- Từ chối giúp đỡ, làm tổn thương: -2 to -5
- Phản bội, lừa dối nghiêm trọng: -5 to -12
- Cố ý làm hại, tấn công, giết: -12 to -20

REPUTATION CHANGE (-10 to +10):
- Hành động công cộng có impact x1.2
- Hành động anh hùng, cứu người: +4 to +10
- Giao dịch công bằng, giúp đỡ: +1 to +3
- Bình thường: 0 to +1
- Hành vi không tốt: -1 to -3
- Phản bội, tội ác công khai: -4 to -10

FACTORS GIẢM ĐIỂM (THỰC TẾ):
- Hành động quá nhanh, thiếu suy nghĩ: -1 to -3
- Hành động không phù hợp với tình huống: -1 to -2
- Hành động có vẻ giả tạo, không chân thành: -2 to -4
- Hành động vi phạm nguyên tắc của NPC: -3 to -6
- Hành động gây khó chịu, không tôn trọng: -2 to -4

FACTORS TĂNG ĐIỂM (THỰC TẾ):
- Hành động chân thành, tự nhiên: +1 to +2
- Hành động phù hợp với tình huống: +1 to +2
- Hành động thể hiện sự hiểu biết về NPC: +2 to +4
- Hành động có tính nhất quán: +1 to +2

STATUS (nếu thay đổi lớn):
- admiring (75+), ally (60+), trusting (45+), friendly (30+), respectful (15+)
- neutral (-15 to 14), acquaintance (-30 to -16), cautious (-45 to -31)
- suspicious (-60 to -46), disappointed (-75 to -61), rival (-90 to -76), enemy (-100 to -91)

CHÚ Ý QUAN TRỌNG:
- Phân tích kỹ ngữ cảnh và tình huống
- NPCs không phải lúc nào cũng phản ứng tích cực
- Hành động nhỏ chỉ có tác động nhỏ
- Mối quan hệ cần thời gian và sự nhất quán
- Xem xét personality và background của NPC
- Không cho điểm quá cao cho hành động bình thường

${shouldIncludeArousal ? `
HƯỚNG DẪN VỀ HỆ THỐNG HỨNG TÌNH (18+):
- Chỉ áp dụng khi nội dung 18+ được bật và ở chế độ tả thực
- Phân tích mức độ hứng tình của NPC dựa trên hành động và ngữ cảnh
- Xem xét tính cách, sở thích và ranh giới của NPC
- Mô tả phản ứng một cách chân thực và nhất quán

AROUSAL SCORING GUIDELINES (-50 to +50):
- Hành động rất kích thích, phù hợp sở thích: +20 to +50
- Hành động kích thích vừa phải: +5 to +20
- Hành động trung tính: -5 to +5
- Hành động không phù hợp: -10 to -30
- Hành động vi phạm ranh giới: -30 to -50

AROUSAL INTENSITY:
- low: Thay đổi nhỏ, tương tác bình thường
- medium: Thay đổi rõ rệt, có dấu hiệu quan tâm
- high: Thay đổi lớn, phản ứng mạnh mẽ
` : ''}

OUTPUT JSON:
{
  "relationshipChange": number,
  "reputationChange": number,
  "newStatus": "string" | null,
  "contextNote": "string",
  "reasoning": "string - giải thích tại sao cho điểm này dựa trên phân tích thực tế"${shouldIncludeArousal ? `,
  "arousalChange": number,
  "arousalReason": "string - lý do thay đổi hứng tình",
  "arousalContext": "string - ngữ cảnh cụ thể",
  "arousalIntensity": "low|medium|high"` : ''}
}`;

    const responseText = await geminiService.generateContent(prompt);
    const result = this.parseJsonResponse(responseText, {
      relationshipChange: 0,
      reputationChange: 0,
      newStatus: null,
      contextNote: 'Không thể phân tích tương tác',
      reasoning: 'AI analysis failed',
      ...(shouldIncludeArousal && {
        arousalChange: 0,
        arousalReason: 'Không thể phân tích hứng tình',
        arousalContext: 'Unknown',
        arousalIntensity: 'low'
      })
    });

    console.log(`🤖 AI Analysis for ${npcName}: ${result.reasoning}`);
    
    return {
      relationshipChange: Math.max(-25, Math.min(25, result.relationshipChange || 0)),
      reputationChange: Math.max(-10, Math.min(10, result.reputationChange || 0)),
      newStatus: result.newStatus || undefined,
      contextNote: result.contextNote || 'Tương tác được phân tích bởi AI',
      ...(shouldIncludeArousal && {
        arousalChange: Math.max(-50, Math.min(50, result.arousalChange || 0)),
        arousalReason: result.arousalReason || 'Không thể phân tích hứng tình',
        arousalContext: result.arousalContext || 'Unknown',
        arousalIntensity: result.arousalIntensity || 'low'
      })
    };
  }


  private getRelationshipDescription(level: number): string {
    if (level >= 85) return 'Ngưỡng mộ';
    if (level >= 70) return 'Tin tưởng sâu sắc';
    if (level >= 55) return 'Đồng minh';
    if (level >= 40) return 'Thân thiện';
    if (level >= 25) return 'Tôn trọng';
    if (level >= 10) return 'Trung lập tích cực';
    if (level >= -10) return 'Trung lập';
    if (level >= -25) return 'Quen biết lạnh nhạt';
    if (level >= -40) return 'Thận trọng';
    if (level >= -55) return 'Nghi ngờ';
    if (level >= -70) return 'Thất vọng';
    if (level >= -85) return 'Đối thủ';
    return 'Kẻ thù';
  }

  private parseJsonResponse(responseText: string, fallbackData: any = {}): any {
    try {
      return JSON.parse(responseText);
    } catch {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        try {
          const arrayMatch = responseText.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            return JSON.parse(arrayMatch[0]);
          }
        } catch {
          console.warn('⚠️ JSON parse failed, using fallback data');
          return fallbackData;
        }
      }
    }
    return fallbackData;
  }


  // Determine status based on relationship level thresholds - more nuanced levels
  private determineStatusByRelationshipLevel(relationshipLevel: number): string | undefined {
    if (relationshipLevel >= 85) {
      return 'admiring'; // 85+ = Ngưỡng mộ (thay thế romantic)
    } else if (relationshipLevel >= 70) {
      return 'trusting'; // 70-84 = Tin tưởng sâu sắc
    } else if (relationshipLevel >= 55) {
      return 'ally'; // 55-69 = Đồng minh
    } else if (relationshipLevel >= 40) {
      return 'friendly'; // 40-54 = Thân thiện
    } else if (relationshipLevel >= 25) {
      return 'respectful'; // 25-39 = Tôn trọng
    } else if (relationshipLevel >= 10) {
      return 'neutral'; // 10-24 = Trung lập tích cực
    } else if (relationshipLevel >= -10) {
      return 'neutral'; // -10 to 9 = Trung lập
    } else if (relationshipLevel >= -25) {
      return 'acquaintance'; // -25 to -11 = Quen biết (hơi lạnh nhạt)
    } else if (relationshipLevel >= -40) {
      return 'cautious'; // -40 to -26 = Thận trọng
    } else if (relationshipLevel >= -55) {
      return 'suspicious'; // -55 to -41 = Nghi ngờ
    } else if (relationshipLevel >= -70) {
      return 'disappointed'; // -70 to -56 = Thất vọng
    } else if (relationshipLevel >= -85) {
      return 'rival'; // -85 to -71 = Đối thủ
    } else {
      return 'enemy'; // -100 to -86 = Kẻ thù
    }
  }

  // Check if NPC is mentioned in any context
  private isNPCMentionedInContext(npcName: string, narrative: string, additionalContext?: {
    chatHistory?: Array<{ role: string; content: string }>;
    sceneState?: any;
    sccSummary?: any;
    playerAction?: string;
  }): boolean {
    const lowerName = npcName.toLowerCase();
    
    // Check in narrative
    if (narrative.toLowerCase().includes(lowerName)) {
      return true;
    }
    
    // Check in player action
    if (additionalContext?.playerAction?.toLowerCase().includes(lowerName)) {
      return true;
    }
    
    // Check in recent chat history (last 3 messages)
    if (additionalContext?.chatHistory) {
      const recentMessages = additionalContext.chatHistory.slice(-3);
      for (const message of recentMessages) {
        if (message.content.toLowerCase().includes(lowerName)) {
          return true;
        }
      }
    }
    
    // Check in scene state NPCs
    if (additionalContext?.sceneState?.npcs) {
      for (const sceneNPC of additionalContext.sceneState.npcs) {
        if (sceneNPC.name && sceneNPC.name.toLowerCase().includes(lowerName)) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Enhanced sentiment analysis with comprehensive context
  private async analyzeNPCInteractionSentimentEnhanced(
    narrative: string, 
    npcName: string, 
    currentRelationshipLevel: number, 
    npcData: NPCRelationship,
    additionalContext?: {
      chatHistory?: Array<{ role: string; content: string }>;
      sceneState?: any;
      sccSummary?: any;
      playerAction?: string;
      contentFlags?: ContentFlags;
    }
  ): Promise<{
    relationshipChange: number;
    reputationChange: number;
    newStatus?: string;
    contextNote?: string;
    arousalChange?: number;
    arousalReason?: string;
    arousalContext?: string;
    arousalIntensity?: 'low' | 'medium' | 'high';
  }> {
    // Start with basic sentiment analysis (now includes arousal)
    const basicSentiment = await this.analyzeNPCInteractionSentiment(narrative, npcName, currentRelationshipLevel, additionalContext);
    
    // Apply context modifiers
    const contextModifiers = this.analyzeContextualFactors(npcName, npcData, additionalContext);
    
    // Apply relationship history modifiers
    const historyModifiers = this.analyzeRelationshipHistory(npcData, additionalContext);
    
    // Combine all factors
    let finalRelationshipChange = basicSentiment.relationshipChange;
    let finalReputationChange = basicSentiment.reputationChange;
    let finalContextNote = basicSentiment.contextNote;
    
    // Apply context multipliers
    finalRelationshipChange = Math.round(finalRelationshipChange * contextModifiers.relationshipMultiplier);
    finalReputationChange = Math.round(finalReputationChange * contextModifiers.reputationMultiplier);
    
    // Apply history modifiers
    finalRelationshipChange += historyModifiers.relationshipBonus;
    finalReputationChange += historyModifiers.reputationBonus;
    
    // Add context note if any modifiers were applied
    if (contextModifiers.note || historyModifiers.note) {
      const additionalNotes = [contextModifiers.note, historyModifiers.note].filter(Boolean);
      if (additionalNotes.length > 0) {
        finalContextNote = finalContextNote ? 
          `${finalContextNote}. ${additionalNotes.join('. ')}` : 
          additionalNotes.join('. ');
      }
    }
    
    return {
      relationshipChange: finalRelationshipChange,
      reputationChange: finalReputationChange,
      newStatus: basicSentiment.newStatus,
      contextNote: finalContextNote,
      arousalChange: basicSentiment.arousalChange,
      arousalReason: basicSentiment.arousalReason,
      arousalContext: basicSentiment.arousalContext,
      arousalIntensity: basicSentiment.arousalIntensity
    };
  }

  // Analyze contextual factors from scene state and current situation
  private analyzeContextualFactors(npcName: string, npcData: NPCRelationship, additionalContext?: any): {
    relationshipMultiplier: number;
    reputationMultiplier: number;
    note?: string;
  } {
    let relationshipMultiplier = 1.0;
    let reputationMultiplier = 1.0;
    let notes: string[] = [];
    
    if (!additionalContext) {
      return { relationshipMultiplier, reputationMultiplier };
    }
    
    // Check scene state factors
    if (additionalContext.sceneState) {
      const sceneState = additionalContext.sceneState;
      
      // Emotional state of the scene affects relationship building
      if (sceneState.mood) {
        if (sceneState.mood.includes('tense') || sceneState.mood.includes('căng thẳng')) {
          relationshipMultiplier *= 0.6; // Much harder to build relationship in tense situations
          notes.push('Tình huống căng thẳng');
        } else if (sceneState.mood.includes('peaceful') || sceneState.mood.includes('yên bình')) {
          relationshipMultiplier *= 1.1; // Slightly easier in peaceful times
          notes.push('Không khí yên bình');
        } else if (sceneState.mood.includes('hostile') || sceneState.mood.includes('thù địch')) {
          relationshipMultiplier *= 0.4; // Very hard to build relationship in hostile environment
          notes.push('Môi trường thù địch');
        }
      }
      
      // Privacy level affects intimate interactions
      if (sceneState.privacy) {
        if (sceneState.privacy === 'private' || sceneState.privacy === 'riêng tư') {
          relationshipMultiplier *= 1.2; // Private moments are more meaningful
          notes.push('Không gian riêng tư');
        } else if (sceneState.privacy === 'public' || sceneState.privacy === 'công cộng') {
          relationshipMultiplier *= 0.7; // Public interactions less intimate
          reputationMultiplier *= 1.3; // But better for reputation
          notes.push('Nơi công cộng');
        }
      }
      
      // Danger level affects relationship dynamics
      if (sceneState.danger) {
        if (sceneState.danger === 'high' || sceneState.danger === 'cao') {
          relationshipMultiplier *= 1.3; // Bonds formed in danger are stronger
          notes.push('Tình huống nguy hiểm');
        } else if (sceneState.danger === 'low' || sceneState.danger === 'thấp') {
          relationshipMultiplier *= 0.9; // Less impactful in safe situations
          notes.push('Môi trường an toàn');
        }
      }
      
      // Time of day affects NPC mood
      if (sceneState.timeOfDay) {
        if (sceneState.timeOfDay.includes('night') || sceneState.timeOfDay.includes('đêm')) {
          relationshipMultiplier *= 0.8; // NPCs might be more cautious at night
          notes.push('Thời gian ban đêm');
        } else if (sceneState.timeOfDay.includes('morning') || sceneState.timeOfDay.includes('sáng')) {
          relationshipMultiplier *= 1.1; // Fresh start in the morning
          notes.push('Thời gian buổi sáng');
        }
      }
      
      // Weather affects mood
      if (sceneState.weather) {
        if (sceneState.weather.includes('storm') || sceneState.weather.includes('bão')) {
          relationshipMultiplier *= 0.7; // Bad weather affects mood
          notes.push('Thời tiết xấu');
        } else if (sceneState.weather.includes('sunny') || sceneState.weather.includes('nắng')) {
          relationshipMultiplier *= 1.1; // Good weather improves mood
          notes.push('Thời tiết tốt');
        }
      }
    }
    
    // Check SCC summary for relationship context
    if (additionalContext.sccSummary?.relationships) {
      const sccRelationships = additionalContext.sccSummary.relationships;
      const relevantSccRel = sccRelationships.find((rel: any) => 
        rel.npc && rel.npc.toLowerCase().includes(npcName.toLowerCase())
      );
      
      if (relevantSccRel) {
        if (relevantSccRel.status && relevantSccRel.status.includes('conflict')) {
          relationshipMultiplier *= 0.6; // Existing conflicts make positive interactions harder
          notes.push('Có xung đột từ trước');
        } else if (relevantSccRel.status && relevantSccRel.status.includes('trust')) {
          relationshipMultiplier *= 1.3; // Existing trust makes interactions more meaningful
          notes.push('Có nền tảng tin tương');
        }
      }
    }
    
    // Factor in current relationship level for diminishing returns
    const absRelLevel = Math.abs(npcData.relationshipLevel);
    if (absRelLevel > 60) {
      relationshipMultiplier *= 0.7; // Harder to change high relationships
      notes.push('Quan hệ đã ổn định');
    } else if (absRelLevel < 10) {
      relationshipMultiplier *= 1.1; // Easier to change neutral relationships
    }
    
    return {
      relationshipMultiplier,
      reputationMultiplier,
      note: notes.length > 0 ? notes.join(', ') : undefined
    };
  }

  // Analyze relationship history for patterns
  private analyzeRelationshipHistory(npcData: NPCRelationship, additionalContext?: any): {
    relationshipBonus: number;
    reputationBonus: number;
    note?: string;
  } {
    let relationshipBonus = 0;
    let reputationBonus = 0;
    let notes: string[] = [];
    
    // Check interaction frequency - more realistic approach
    if (npcData.totalInteractions > 20) {
      relationshipBonus += 1; // Long-term relationships have depth but not much bonus
      notes.push('Quen biết lâu');
    } else if (npcData.totalInteractions < 3) {
      relationshipBonus -= 2; // New relationships are fragile and uncertain
      notes.push('Mới quen biết');
    } else if (npcData.totalInteractions < 10) {
      relationshipBonus -= 1; // Still building trust
      notes.push('Quen biết vừa phải');
    }
    
    // Check time since last interaction - more realistic
    const daysSinceLastInteraction = (Date.now() - npcData.lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastInteraction > 14) {
      relationshipBonus -= 2; // Long gaps hurt relationships significantly
      notes.push('Lâu không gặp');
    } else if (daysSinceLastInteraction > 7) {
      relationshipBonus -= 1; // Moderate gaps have some impact
      notes.push('Khá lâu không gặp');
    } else if (daysSinceLastInteraction < 1) {
      relationshipBonus += 0; // Recent interactions don't give bonus, just maintain
    }
    
    // Check current relationship level - more realistic
    if (npcData.relationshipLevel > 50) {
      relationshipBonus -= 1; // High relationships are harder to improve
      notes.push('Mối quan hệ đã tốt');
    } else if (npcData.relationshipLevel < -30) {
      relationshipBonus -= 2; // Bad relationships are hard to fix
      notes.push('Mối quan hệ xấu');
    }
    
    // Check reputation level
    if (npcData.reputation > 30) {
      reputationBonus -= 1; // High reputation is hard to improve
      notes.push('Danh tiếng đã tốt');
    } else if (npcData.reputation < -20) {
      reputationBonus -= 1; // Bad reputation is hard to fix
      notes.push('Danh tiếng xấu');
    }
    
    // Check chat history for patterns - more realistic
    if (additionalContext?.chatHistory) {
      const recentPlayerMessages = additionalContext.chatHistory
        .filter((msg: any) => msg.role === 'player')
        .slice(-10); // Look at more messages
      
      // Count positive/negative words in recent player messages
      let positiveCount = 0;
      let negativeCount = 0;
      let neutralCount = 0;
      
      for (const message of recentPlayerMessages) {
        const content = message.content.toLowerCase();
        if (content.includes(npcData.name.toLowerCase())) {
          // Positive words
          if (content.match(/(cảm ơn|tuyệt vời|thích|yêu|tốt|giúp|hỗ trợ|đồng ý|hợp tác)/)) {
            positiveCount++;
          }
          // Negative words  
          else if (content.match(/(ghét|tệ|xấu|từ chối|không thích|phản đối|giận|bực)/)) {
            negativeCount++;
          }
          // Neutral words
          else if (content.match(/(hỏi|nói|gặp|thấy|nghe)/)) {
            neutralCount++;
          }
        }
      }
      
      // More realistic scoring
      if (positiveCount > negativeCount + 2) {
        relationshipBonus += 1; // Reduced bonus
        notes.push('Thái độ tích cực gần đây');
      } else if (negativeCount > positiveCount + 2) {
        relationshipBonus -= 2; // Increased penalty
        notes.push('Thái độ tiêu cực gần đây');
      } else if (neutralCount > positiveCount + negativeCount) {
        relationshipBonus -= 1; // Neutral interactions don't help much
        notes.push('Tương tác trung tính');
      }
    }
    
    return {
      relationshipBonus,
      reputationBonus,
      note: notes.length > 0 ? notes.join(', ') : undefined
    };
  }

  // NPC Encounter Management
  addEncounter(encounter: Omit<NPCEncounter, 'id' | 'timestamp'>): NPCEncounter {
    const newEncounter: NPCEncounter = {
      id: this.generateId(),
      timestamp: new Date(),
      ...encounter
    };

    this.encounters.push(newEncounter);
    
    // Update relationship if it exists
    if (encounter.relationshipChange || encounter.reputationChange) {
      const relationship = this.findRelationshipByName(encounter.npcName);
      if (relationship) {
        if (encounter.relationshipChange) {
          this.updateRelationshipLevel(relationship.id, encounter.relationshipChange);
        }
        if (encounter.reputationChange) {
          this.updateReputation(relationship.id, encounter.reputationChange);
        }
      }
    }

    this.saveToStorage();
    return newEncounter;
  }

  getEncountersForNPC(npcName: string): NPCEncounter[] {
    return this.encounters.filter(e => e.npcName === npcName);
  }

  getAllEncounters(): NPCEncounter[] {
    return [...this.encounters].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Character Status - đã được tích hợp vào NPC notes

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private findRelationshipByName(npcName: string): NPCRelationship | undefined {
    return Array.from(this.relationships.values()).find(r => r.name === npcName);
  }

  // Parse NPCs from AI response and update relationships
  parseNPCsFromAIResponse(aiResponse: any, currentLocation?: string): void {
    // Tìm tất cả các trường có chứa "npc" (case insensitive)
    const npcFields = this.findNPCFields(aiResponse);

    // Xử lý từng trường NPC tìm được
    npcFields.forEach(({ npcData }) => {
      if (Array.isArray(npcData)) {
        this.processNPCs(npcData, currentLocation);
      }
    });
  }

  // Tìm tất cả các trường có chứa "npc" trong object
  private findNPCFields(obj: any, prefix: string = ''): Array<{ fieldName: string; npcData: any }> {
    const npcFields: Array<{ fieldName: string; npcData: any }> = [];
    
    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        // Kiểm tra nếu key chứa "npc" (case insensitive)
        if (key.toLowerCase().includes('npc')) {
          npcFields.push({ fieldName: fullKey, npcData: value });
        }
        
        // Đệ quy tìm trong nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          npcFields.push(...this.findNPCFields(value, fullKey));
        }
      }
    }
    
    return npcFields;
  }

  // Kiểm tra xem tên NPC có phải là cá thể riêng biệt không
  private isValidIndividualNPC(name: string): boolean {
    const lowerName = name.toLowerCase();
    
    // Kiểm tra từ khóa nhóm (sử dụng shared constant)
    for (const keyword of this.GROUP_KEYWORDS) {
      if (lowerName.includes(keyword)) {
        console.log(`❌ Rejected group NPC: "${name}" (contains "${keyword}")`);
        return false;
      }
    }
    
    // Kiểm tra tên quá ngắn hoặc quá chung chung
    if (name.length < 3) {
      console.log(`❌ Rejected short NPC name: "${name}"`);
      return false;
    }
    
    // Kiểm tra tên có chứa số (trừ tên có số thứ tự hợp lệ)
    if (/\d+/.test(name) && !/^(thứ|số|đầu|cuối)/.test(lowerName)) {
      console.log(`❌ Rejected numbered NPC name: "${name}"`);
      return false;
    }
    
    console.log(`✅ Accepted individual NPC: "${name}"`);
    return true;
  }

  // Helper method to process NPCs array
  private processNPCs(npcs: any[], currentLocation?: string): void {
    npcs.forEach((npc: any) => {
      if (npc.name && this.isValidIndividualNPC(npc.name)) {
        // Tìm NPC existing bằng tên chính xác hoặc tên tương tự
        const existing = this.findRelationshipByNameOrSimilar(npc.name);
        
        if (existing) {
          // Update existing NPC - cập nhật tên nếu có tên mới chi tiết hơn
          if (this.isMoreDetailedName(npc.name, existing.name)) {
            existing.name = npc.name;
          }
          
          existing.location = currentLocation;
          existing.lastInteraction = new Date();
          
          // Cập nhật description nếu có thông tin mới
          if (npc.description && npc.description.length > (existing.description?.length || 0)) {
            existing.description = npc.description;
          }
          
          // Cập nhật faction nếu có thông tin mới (chỉ khi có faction)
          if (npc.faction && npc.faction !== existing.faction) {
            existing.faction = npc.faction;
          }
          
          // Enhanced note generation based on scene state and context
          this.updateNPCNotesFromSceneState(existing, npc, currentLocation);
        } else {
          // Create new NPC relationship
          this.addOrUpdateRelationship({
            name: npc.name,
            description: npc.description || '',
            location: currentLocation,
            tags: npc.tags || [],
            faction: npc.faction || undefined, // Faction là optional, chỉ có khi AI gán
            status: 'neutral',
            relationshipLevel: 0,
            reputation: 0,
            totalInteractions: 0,
            notes: this.generateInitialNotes(npc, currentLocation)
          });
        }
      }
    });
  }

  // Tìm NPC bằng tên chính xác hoặc tên tương tự
  private findRelationshipByNameOrSimilar(npcName: string): NPCRelationship | undefined {
    // Tìm tên chính xác trước
    let existing = this.findRelationshipByName(npcName);
    if (existing) return existing;

    // Tìm tên tương tự
    const allRelationships = Array.from(this.relationships.values());
    
    for (const relationship of allRelationships) {
      if (this.areNamesSimilar(npcName, relationship.name)) {
        return relationship;
      }
    }
    
    return undefined;
  }

  // Kiểm tra xem 2 tên có tương tự không
  private areNamesSimilar(name1: string, name2: string): boolean {
    const clean1 = name1.toLowerCase().trim();
    const clean2 = name2.toLowerCase().trim();
    
    // Nếu một tên chứa tên kia
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      return true;
    }
    
    // Tách tên thành các từ
    const words1 = clean1.split(/\s+/);
    const words2 = clean2.split(/\s+/);
    
    // Nếu có ít nhất 2 từ giống nhau
    const commonWords = words1.filter(word => 
      words2.some(w2 => w2.includes(word) || word.includes(w2))
    );
    
    return commonWords.length >= 2;
  }

  // Kiểm tra xem tên mới có chi tiết hơn không
  private isMoreDetailedName(newName: string, existingName: string): boolean {
    // Nếu tên mới dài hơn và chứa tên cũ
    if (newName.length > existingName.length && 
        newName.toLowerCase().includes(existingName.toLowerCase())) {
      return true;
    }
    
    // Nếu tên mới có dấu ngoặc đơn (thường là tên chi tiết hơn)
    if (newName.includes('(') && !existingName.includes('(')) {
      return true;
    }
    
    return false;
  }

  // Enhanced note generation based on scene state and context
  private updateNPCNotesFromSceneState(existing: NPCRelationship, npcData: any, currentLocation?: string): void {
    // Generate contextual notes based on scene data
    const contextualNotes = this.generateContextualNotes(npcData, currentLocation);
    
    // Use consolidated method to add notes
    this.addNotesToNPC(existing, contextualNotes);
    
    this.saveToStorage();
  }

  // Enhanced comprehensive note generation
  generateEnhancedNotes(
    npcName: string,
    narrative: string,
    additionalContext?: {
      chatHistory?: Array<{ role: string; content: string }>;
      sceneState?: any;
      sccSummary?: any;
      playerAction?: string;
      turnCounter?: number;
    }
  ): string[] {
    const enhancedNotes: string[] = [];
    
    // Analyze narrative for specific NPC interactions
    const narrativeNotes = this.extractNarrativeNotes(narrative, npcName, additionalContext);
    enhancedNotes.push(...narrativeNotes);
    
    // Analyze chat history patterns
    if (additionalContext?.chatHistory) {
      const chatNotes = this.extractChatHistoryNotes(npcName, additionalContext.chatHistory);
      enhancedNotes.push(...chatNotes);
    }
    
    // Analyze scene state context
    if (additionalContext?.sceneState) {
      const sceneNotes = this.extractSceneStateNotes(npcName, additionalContext.sceneState);
      enhancedNotes.push(...sceneNotes);
    }
    
    // Analyze SCC summary context
    if (additionalContext?.sccSummary) {
      const sccNotes = this.extractSCCNotes(npcName, additionalContext.sccSummary);
      enhancedNotes.push(...sccNotes);
    }
    
    // Add temporal context
    if (additionalContext?.turnCounter) {
      const temporalNote = `Lần gặp thứ ${additionalContext.turnCounter} (Turn ${additionalContext.turnCounter})`;
      enhancedNotes.push(temporalNote);
    }
    
    return enhancedNotes.filter(note => note && note.trim().length > 0);
  }

  // Extract detailed notes from narrative
  private extractNarrativeNotes(narrative: string, npcName: string, context?: any): string[] {
    const notes: string[] = [];
    const lowerNarrative = narrative.toLowerCase();
    const lowerName = npcName.toLowerCase();
    
    if (!lowerNarrative.includes(lowerName)) {
      return notes;
    }
    
    // Extract specific interactions and their context
    const interactionPatterns = [
      {
        patterns: [/nói.*chuyện.*với/i, /trò chuyện.*với/i, /trao đổi.*với/i],
        note: (reason: string) => `Đã trò chuyện (${reason})`
      },
      {
        patterns: [/giúp.*đỡ/i, /hỗ.*trợ/i, /cứu/i],
        note: (reason: string) => `Đã được giúp đỡ (${reason})`
      },
      {
        patterns: [/tặng.*cho/i, /đưa.*cho/i, /biếu.*cho/i],
        note: (reason: string) => `Đã trao đổi vật phẩm (${reason})`
      },
      {
        patterns: [/chia.*sẻ/i, /kể.*cho/i, /tiết.*lộ/i],
        note: (reason: string) => `Đã chia sẻ thông tin (${reason})`
      },
      {
        patterns: [/cùng.*nhau/i, /bên.*cạnh/i, /đồng.*hành/i],
        note: (reason: string) => `Đã đồng hành (${reason})`
      },
      {
        patterns: [/từ.*chối/i, /không.*đồng.*ý/i, /phản.*đối/i],
        note: (reason: string) => `Đã từ chối (${reason})`
      },
      {
        patterns: [/cãi.*nhau/i, /tranh.*cãi/i, /bất.*đồng/i],
        note: (reason: string) => `Đã có tranh cãi (${reason})`
      },
      {
        patterns: [/nhìn.*âu.*yếm/i, /ôm/i, /hôn/i],
        note: (reason: string) => `Đã có tương tác thân mật (${reason})`
      }
    ];
    
    // Extract emotional states
    const emotionPatterns = [
      {
        patterns: [/vui.*mừng/i, /hạnh.*phúc/i, /phấn.*khích/i],
        emotion: 'vui mừng'
      },
      {
        patterns: [/buồn/i, /thất.*vọng/i, /chán.*nản/i],
        emotion: 'buồn bã'
      },
      {
        patterns: [/tức.*giận/i, /phẫn.*nộ/i, /bực.*mình/i],
        emotion: 'tức giận'
      },
      {
        patterns: [/lo.*lắng/i, /băn.*khoăn/i, /bối.*rối/i],
        emotion: 'lo lắng'
      },
      {
        patterns: [/sợ.*hãi/i, /hoảng.*sợ/i, /kinh.*hãi/i],
        emotion: 'sợ hãi'
      }
    ];
    
    // Find interactions
    for (const interaction of interactionPatterns) {
      for (const pattern of interaction.patterns) {
        if (pattern.test(narrative)) {
          const contextReason = this.extractContextReason(narrative, context);
          notes.push(interaction.note(contextReason));
          break;
        }
      }
    }
    
    // Find emotional states
    for (const emotion of emotionPatterns) {
      for (const pattern of emotion.patterns) {
        if (pattern.test(narrative)) {
          const contextReason = this.extractContextReason(narrative, context);
          notes.push(`Tâm trạng ${emotion.emotion} (${contextReason})`);
          break;
        }
      }
    }
    
    // Extract location context
    const locationMatch = narrative.match(/tại\s+([^,\.]+)/i) || narrative.match(/ở\s+([^,\.]+)/i);
    if (locationMatch) {
      notes.push(`Gặp tại ${locationMatch[1].trim()} (theo narrative)`);
    }
    
    return notes;
  }

  // Extract contextual reason for the interaction
  private extractContextReason(narrative: string, context?: any): string {
    const reasons: string[] = [];
    
    // Scene context reasons
    if (context?.sceneState) {
      const scene = context.sceneState;
      if (scene.location) reasons.push(`tại ${scene.location}`);
      if (scene.timeOfDay) reasons.push(`vào ${scene.timeOfDay}`);
      if (scene.weather) reasons.push(`trong thời tiết ${scene.weather}`);
      if (scene.mood) reasons.push(`trong không khí ${scene.mood}`);
      if (scene.danger) reasons.push(`trong tình huống ${scene.danger}`);
    }
    
    // Narrative context reasons
    const contextPatterns = [
      { pattern: /trong.*lúc/i, extract: /trong\s+lúc\s+([^,\.]+)/i },
      { pattern: /vì/i, extract: /vì\s+([^,\.]+)/i },
      { pattern: /để/i, extract: /để\s+([^,\.]+)/i },
      { pattern: /sau.*khi/i, extract: /sau\s+khi\s+([^,\.]+)/i },
      { pattern: /trước.*khi/i, extract: /trước\s+khi\s+([^,\.]+)/i },
      { pattern: /khi/i, extract: /khi\s+([^,\.]+)/i }
    ];
    
    for (const { pattern, extract } of contextPatterns) {
      if (pattern.test(narrative)) {
        const match = narrative.match(extract);
        if (match) {
          reasons.push(match[1].trim());
          break;
        }
      }
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'theo tình huống hiện tại';
  }

  // Extract notes from chat history patterns
  private extractChatHistoryNotes(npcName: string, chatHistory: Array<{ role: string; content: string }>): string[] {
    const notes: string[] = [];
    const lowerName = npcName.toLowerCase();
    
    // Analyze recent player messages about this NPC
    const recentPlayerMessages = chatHistory
      .filter(msg => msg.role === 'player' && msg.content.toLowerCase().includes(lowerName))
      .slice(-5);
    
    let positiveCount = 0;
    let negativeCount = 0;
    let questionsCount = 0;
    let commandsCount = 0;
    
    for (const message of recentPlayerMessages) {
      const content = message.content.toLowerCase();
      
      // Count sentiment
      if (content.match(/(cảm ơn|thích|yêu|tuyệt vời|tốt|giúp|hỗ trợ|đồng ý)/)) {
        positiveCount++;
      }
      if (content.match(/(ghét|không thích|tệ|xấu|từ chối|phản đối|giận)/)) {
        negativeCount++;
      }
      
      // Count interaction types
      if (content.includes('?') || content.match(/(hỏi|tại sao|làm thế nào|ở đâu)/)) {
        questionsCount++;
      }
      if (content.match(/(hãy|làm|đi|chúng ta|cùng nhau)/)) {
        commandsCount++;
      }
    }
    
    // Generate pattern notes
    if (positiveCount > negativeCount + 1) {
      notes.push('Thái độ tích cực trong các cuộc trò chuyện gần đây (từ lịch sử chat)');
    } else if (negativeCount > positiveCount + 1) {
      notes.push('Có dấu hiệu bất đồng trong các cuộc trò chuyện gần đây (từ lịch sử chat)');
    }
    
    if (questionsCount >= 2) {
      notes.push('Người chơi thường xuyên hỏi han (từ lịch sử chat)');
    }
    
    if (commandsCount >= 2) {
      notes.push('Người chơi thường đưa ra đề xuất hợp tác (từ lịch sử chat)');
    }
    
    // Frequency analysis
    if (recentPlayerMessages.length >= 3) {
      notes.push(`Được nhắc đến thường xuyên trong ${recentPlayerMessages.length} tin nhắn gần đây (từ lịch sử chat)`);
    }
    
    return notes;
  }

  // Extract notes from scene state
  private extractSceneStateNotes(npcName: string, sceneState: any): string[] {
    const notes: string[] = [];
    const lowerName = npcName.toLowerCase();
    
    // Check if NPC is present in scene
    if (sceneState.npcs) {
      const sceneNPC = sceneState.npcs.find((npc: any) => 
        npc.name && npc.name.toLowerCase().includes(lowerName)
      );
      
      if (sceneNPC) {
        // Current status in scene
        if (sceneNPC.state) {
          notes.push(`Trạng thái hiện tại: ${sceneNPC.state} (từ scene state)`);
        }
        
        if (sceneNPC.activity) {
          notes.push(`Đang: ${sceneNPC.activity} (từ scene state)`);
        }
        
        if (sceneNPC.mood) {
          notes.push(`Tâm trạng: ${sceneNPC.mood} (từ scene state)`);
        }
        
        if (sceneNPC.position) {
          notes.push(`Vị trí: ${sceneNPC.position} (từ scene state)`);
        }
        
        if (sceneNPC.equipment && sceneNPC.equipment.length > 0) {
          notes.push(`Trang bị: ${sceneNPC.equipment.join(', ')} (từ scene state)`);
        }
        
        if (sceneNPC.tags && sceneNPC.tags.length > 0) {
          notes.push(`Đặc điểm: ${sceneNPC.tags.join(', ')} (từ scene state)`);
        }
      }
    }
    
    // Scene context that affects all NPCs
    const contextNotes: string[] = [];
    
    if (sceneState.location) {
      const location = typeof sceneState.location === 'string' 
        ? sceneState.location 
        : ((sceneState.location as any).name || JSON.stringify(sceneState.location));
      contextNotes.push(`tại ${location}`);
    }
    
    if (sceneState.timeOfDay) {
      contextNotes.push(`vào ${sceneState.timeOfDay}`);
    }
    
    if (sceneState.weather) {
      contextNotes.push(`trong thời tiết ${sceneState.weather}`);
    }
    
    if (sceneState.atmosphere) {
      contextNotes.push(`trong không khí ${sceneState.atmosphere}`);
    }
    
    if (contextNotes.length > 0) {
      notes.push(`Bối cảnh: ${contextNotes.join(', ')} (từ scene state)`);
    }
    
    return notes;
  }

  // Extract notes from SCC summary
  private extractSCCNotes(npcName: string, sccSummary: any): string[] {
    const notes: string[] = [];
    const lowerName = npcName.toLowerCase();
    
    // Check relationships in SCC
    if (sccSummary.relationships) {
      const sccRelationship = sccSummary.relationships.find((rel: any) => 
        rel.npc && rel.npc.toLowerCase().includes(lowerName)
      );
      
      if (sccRelationship) {
        if (sccRelationship.status) {
          notes.push(`Mối quan hệ: ${sccRelationship.status} (từ SCC summary)`);
        }
        
        if (sccRelationship.notes) {
          notes.push(`Ghi chú SCC: ${sccRelationship.notes} (từ SCC summary)`);
        }
        
        if (sccRelationship.lastInteraction) {
          notes.push(`Tương tác cuối: ${sccRelationship.lastInteraction} (từ SCC summary)`);
        }
      }
    }
    
    // Check if mentioned in goals
    if (sccSummary.goals) {
      for (const goal of sccSummary.goals) {
        if (goal.pcGoal && goal.pcGoal.toLowerCase().includes(lowerName)) {
          notes.push(`Liên quan đến mục tiêu: ${goal.pcGoal} (từ SCC summary)`);
        }
        if (goal.actGoal && goal.actGoal.toLowerCase().includes(lowerName)) {
          notes.push(`Liên quan đến cốt truyện: ${goal.actGoal} (từ SCC summary)`);
        }
      }
    }
    
    // Check if mentioned in timeline
    if (sccSummary.timeline) {
      for (const event of sccSummary.timeline) {
        if (event.event && event.event.toLowerCase().includes(lowerName)) {
          notes.push(`Sự kiện: ${event.event} (từ SCC timeline)`);
        }
      }
    }
    
    // Check open threads
    if (sccSummary.openThreads) {
      for (const thread of sccSummary.openThreads) {
        if (thread.toLowerCase().includes(lowerName)) {
          notes.push(`Tình tiết chưa giải quyết: ${thread} (từ SCC open threads)`);
        }
      }
    }
    
    return notes;
  }

  private generateInitialNotes(npcData: any, currentLocation?: string): string[] {
    return this.generateContextualNotes(npcData, currentLocation);
  }

  private generateContextualNotes(npcData: any, currentLocation?: string): string[] {
    const notes: string[] = [];
    
    // Location-based notes
    if (currentLocation) {
      const location = typeof currentLocation === 'string' 
        ? currentLocation 
        : ((currentLocation as any).name || JSON.stringify(currentLocation));
      notes.push(`Gặp tại ${location}`);
    }
    
    // State-based notes with more context
    if (npcData.state) {
      if (typeof npcData.state === 'string') {
        notes.push(`Trạng thái: ${npcData.state}`);
      } else if (typeof npcData.state === 'object') {
        // Extract meaningful state information
        const stateEntries = Object.entries(npcData.state);
        stateEntries.forEach(([key, value]) => {
          if (value) {
            notes.push(`${this.formatStateKey(key)}: ${value}`);
          }
        });
      }
    }
    
    // Status with context
    if (npcData.status && npcData.status !== 'neutral') {
      notes.push(`Tình trạng: ${npcData.status}`);
    }
    
    // Activity or occupation
    if (npcData.activity) {
      notes.push(`Hoạt động: ${npcData.activity}`);
    }
    
    if (npcData.occupation) {
      notes.push(`Nghề nghiệp: ${npcData.occupation}`);
    }
    
    // Emotional state
    if (npcData.mood) {
      notes.push(`Tâm trạng: ${npcData.mood}`);
    }
    
    // Relationship with others
    if (npcData.relationship) {
      notes.push(`Quan hệ: ${npcData.relationship}`);
    }
    
    // Current goals or intentions
    if (npcData.goals) {
      if (Array.isArray(npcData.goals)) {
        npcData.goals.forEach((goal: string) => {
          notes.push(`Mục tiêu: ${goal}`);
        });
      } else {
        notes.push(`Mục tiêu: ${npcData.goals}`);
      }
    }
    
    // Current problems or concerns
    if (npcData.concerns) {
      if (Array.isArray(npcData.concerns)) {
        npcData.concerns.forEach((concern: string) => {
          notes.push(`Lo lắng: ${concern}`);
        });
      } else {
        notes.push(`Lo lắng: ${npcData.concerns}`);
      }
    }
    
    // Equipment or items
    if (npcData.equipment && Array.isArray(npcData.equipment) && npcData.equipment.length > 0) {
      notes.push(`Trang bị: ${npcData.equipment.join(', ')}`);
    }
    
    // Special abilities or skills
    if (npcData.abilities && Array.isArray(npcData.abilities) && npcData.abilities.length > 0) {
      notes.push(`Khả năng: ${npcData.abilities.join(', ')}`);
    }
    
    // Faction or allegiance
    if (npcData.faction && npcData.faction !== 'neutral') {
      notes.push(`Phe phái: ${npcData.faction}`);
    }
    
    return notes.filter(note => note && note.trim().length > 0);
  }

  private formatStateKey(key: string): string {
    // Convert camelCase and snake_case to readable Vietnamese
    const keyMappings: { [key: string]: string } = {
      'isHurt': 'Bị thương',
      'isAngry': 'Tức giận',
      'isHappy': 'Vui vẻ',
      'isSad': 'Buồn bã',
      'isTired': 'Mệt mỏi',
      'isHungry': 'Đói',
      'isThirsty': 'Khát',
      'isSick': 'Ốm',
      'isAfraid': 'Sợ hãi',
      'isConfused': 'Bối rối',
      'isBusy': 'Bận rộn',
      'isWorking': 'Đang làm việc',
      'isResting': 'Đang nghỉ ngơi',
      'isSleeping': 'Đang ngủ',
      'isEating': 'Đang ăn',
      'health': 'Sức khỏe',
      'energy': 'Năng lượng',
      'money': 'Tiền',
      'reputation': 'Danh tiếng'
    };
    
    return keyMappings[key] || key.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  }

  // Consolidated method to add notes to NPC (avoiding duplicates)
  private addNotesToNPC(npc: NPCRelationship, newNotes: string[], maxNotes: number = 15): void {
    npc.notes = npc.notes || [];
    
    // Add only unique notes
    newNotes.forEach(note => {
      if (note && note.trim() && !npc.notes!.includes(note)) {
        npc.notes!.push(note);
      }
    });
    
    // Limit notes to prevent bloat
    if (npc.notes.length > maxNotes) {
      npc.notes = npc.notes.slice(-maxNotes);
    }
  }

  // Shared status patterns for reuse
  private readonly STATUS_PATTERNS = [
      { 
        pattern: /mệt|tired|exhausted/i, 
        baseStatus: 'Mệt mỏi',
        severity: 'moderate' as const, 
        effects: { statModifiers: { strength: -1, agility: -1, intelligence: 0, wisdom: 0, constitution: 0, dexterity: 0, charisma: 0 } },
        contextPatterns: [
          { pattern: /nằm ngoài trời|sleeping outside|outdoor/i, reason: 'do nằm ngoài trời lâu' },
          { pattern: /hành trình dài|long journey|travel/i, reason: 'do hành trình dài' },
          { pattern: /thức khuya|stayed up late|late night/i, reason: 'do thức khuya' },
          { pattern: /làm việc quá sức|overworked|hard work/i, reason: 'do làm việc quá sức' },
          { pattern: /căng thẳng|stressed|anxiety/i, reason: 'do căng thẳng' },
          { pattern: /thiếu ngủ|lack of sleep|insomnia/i, reason: 'do thiếu ngủ' }
        ]
      },
      { 
        pattern: /thương tích|injured|wounded|bị thương/i, 
        baseStatus: 'Bị thương',
        severity: 'moderate' as const, 
        effects: { healthModifier: -10 },
        contextPatterns: [
          { pattern: /đánh nhau|fight|combat/i, reason: 'do đánh nhau' },
          { pattern: /té ngã|fell down|fall/i, reason: 'do té ngã' },
          { pattern: /vật sắc nhọn|sharp object|knife|dao/i, reason: 'do vật sắc nhọn' },
          { pattern: /tai nạn|accident/i, reason: 'do tai nạn' },
          { pattern: /bị tấn công|attacked|assault/i, reason: 'do bị tấn công' }
        ]
      },
      { 
        pattern: /buồn ngủ|sleepy|drowsy/i, 
        baseStatus: 'Buồn ngủ',
        severity: 'minor' as const, 
        effects: { statModifiers: { intelligence: -1, wisdom: -1, strength: 0, agility: 0, constitution: 0, dexterity: 0, charisma: 0 } },
        contextPatterns: [
          { pattern: /thức khuya|stayed up late/i, reason: 'do thức khuya' },
          { pattern: /thiếu ngủ|lack of sleep/i, reason: 'do thiếu ngủ' },
          { pattern: /thời tiết|weather|nóng|lạnh/i, reason: 'do thời tiết' },
          { pattern: /ăn no|full stomach|after meal/i, reason: 'do ăn no' }
        ]
      },
      { 
        pattern: /đói|hungry/i, 
        baseStatus: 'Đói',
        severity: 'minor' as const, 
        effects: { statModifiers: { constitution: -1, strength: 0, agility: 0, intelligence: 0, wisdom: 0, dexterity: 0, charisma: 0 } },
        contextPatterns: [
          { pattern: /không có thức ăn|no food|starving/i, reason: 'do không có thức ăn' },
          { pattern: /hành trình dài|long journey/i, reason: 'do hành trình dài' },
          { pattern: /bị bỏ đói|starved|deprived/i, reason: 'do bị bỏ đói' },
          { pattern: /tiền hết|no money|broke/i, reason: 'do hết tiền mua thức ăn' }
        ]
      },
      { 
        pattern: /khát|thirsty/i, 
        baseStatus: 'Khát',
        severity: 'minor' as const, 
        effects: { statModifiers: { constitution: -1, strength: 0, agility: 0, intelligence: 0, wisdom: 0, dexterity: 0, charisma: 0 } },
        contextPatterns: [
          { pattern: /không có nước|no water/i, reason: 'do không có nước' },
          { pattern: /nóng|hot weather/i, reason: 'do thời tiết nóng' },
          { pattern: /vận động|exercise|physical activity/i, reason: 'do vận động nhiều' },
          { pattern: /hành trình|journey|travel/i, reason: 'do hành trình dài' }
        ]
      },
      { 
        pattern: /bị cắt|cut|dao cắt/i, 
        baseStatus: 'Vết cắt',
        severity: 'moderate' as const, 
        effects: { healthModifier: -5, statModifiers: { dexterity: -1, strength: 0, agility: 0, intelligence: 0, wisdom: 0, constitution: 0, charisma: 0 } },
        contextPatterns: [
          { pattern: /dao|knife|blade/i, reason: 'do dao cắt' },
          { pattern: /kính vỡ|broken glass/i, reason: 'do kính vỡ' },
          { pattern: /đánh nhau|fight/i, reason: 'do đánh nhau' },
          { pattern: /tai nạn|accident/i, reason: 'do tai nạn' }
        ]
      },
      { 
        pattern: /bị bỏng|burned|burn/i, 
        baseStatus: 'Bỏng',
        severity: 'moderate' as const, 
        effects: { healthModifier: -8, statModifiers: { constitution: -1, strength: 0, agility: 0, intelligence: 0, wisdom: 0, dexterity: 0, charisma: 0 } },
        contextPatterns: [
          { pattern: /lửa|fire|flame/i, reason: 'do lửa' },
          { pattern: /nước sôi|boiling water/i, reason: 'do nước sôi' },
          { pattern: /hóa chất|chemical/i, reason: 'do hóa chất' },
          { pattern: /nắng|sunburn/i, reason: 'do nắng' }
        ]
      },
      { 
        pattern: /bị ngộ độc|poisoned|poison/i, 
        baseStatus: 'Ngộ độc',
        severity: 'severe' as const, 
        effects: { healthModifier: -15, statModifiers: { constitution: -2, dexterity: -1, strength: 0, agility: 0, intelligence: 0, wisdom: 0, charisma: 0 } },
        contextPatterns: [
          { pattern: /thức ăn|food|ate/i, reason: 'do thức ăn' },
          { pattern: /nước|water|drank/i, reason: 'do nước' },
          { pattern: /hóa chất|chemical/i, reason: 'do hóa chất' },
          { pattern: /khí độc|toxic gas/i, reason: 'do khí độc' }
        ]
      },
      { 
        pattern: /bị bệnh|sick|illness/i, 
        baseStatus: 'Bệnh',
        severity: 'moderate' as const, 
        effects: { healthModifier: -12, statModifiers: { constitution: -2, strength: -1, agility: 0, intelligence: 0, wisdom: 0, dexterity: 0, charisma: 0 } },
        contextPatterns: [
          { pattern: /cảm lạnh|cold|flu/i, reason: 'do cảm lạnh' },
          { pattern: /thời tiết|weather/i, reason: 'do thời tiết' },
          { pattern: /ăn uống|food|diet/i, reason: 'do ăn uống không đúng' },
          { pattern: /stress|căng thẳng/i, reason: 'do căng thẳng' }
        ]
      },
      // Thêm trạng thái tâm lý
      { 
        pattern: /xúc phạm|insulted|offended|hurt/i, 
        baseStatus: 'Bị xúc phạm',
        severity: 'minor' as const, 
        effects: { statModifiers: { charisma: -1, intelligence: -1, strength: 0, agility: 0, constitution: 0, dexterity: 0, wisdom: 0 } },
        contextPatterns: [
          { pattern: /nói xấu|badmouth|gossip/i, reason: 'do bị nói xấu' },
          { pattern: /chế giễu|mocked|ridiculed/i, reason: 'do bị chế giễu' },
          { pattern: /bị từ chối|rejected|turned down/i, reason: 'do bị từ chối' },
          { pattern: /bị phản bội|betrayed|backstabbed/i, reason: 'do bị phản bội' }
        ]
      },
      { 
        pattern: /sợ hãi|fearful|scared|afraid/i, 
        baseStatus: 'Sợ hãi',
        severity: 'moderate' as const, 
        effects: { statModifiers: { wisdom: -2, charisma: -1, strength: -1, agility: 0, intelligence: 0, constitution: 0, dexterity: 0 } },
        contextPatterns: [
          { pattern: /bóng tối|darkness|dark/i, reason: 'do bóng tối' },
          { pattern: /quái vật|monster|creature/i, reason: 'do quái vật' },
          { pattern: /ma quỷ|ghost|spirit/i, reason: 'do ma quỷ' },
          { pattern: /nguy hiểm|danger|threat/i, reason: 'do nguy hiểm' }
        ]
      }
    ];

  // Parse character status from AI response and add to current NPC notes
  parseCharacterStatusFromAIResponse(aiResponse: any, currentLocation?: string): void {
    const narrative = aiResponse.narrative || '';
    
    this.STATUS_PATTERNS.forEach(({ pattern, baseStatus, contextPatterns }) => {
      if (pattern.test(narrative)) {
        // Tìm lý do cụ thể từ context
        let reason = '';
        for (const contextPattern of contextPatterns) {
          if (contextPattern.pattern.test(narrative)) {
            reason = contextPattern.reason;
            break;
          }
        }
        
        // Nếu không tìm thấy lý do cụ thể, tạo mô tả chung
        if (!reason) {
          reason = 'do tình huống hiện tại';
        }

               const statusName = reason ? `${baseStatus} (${reason})` : baseStatus;

               // Thêm character status vào notes của NPC hiện tại (nếu có)
               if (currentLocation) {
                 // Tìm NPC ở vị trí hiện tại
                 const currentNPCs = Array.from(this.relationships.values())
                   .filter(relationship => relationship.location === currentLocation);
                 
                   const statusNote = `Trạng thái PC: ${statusName}`;
                 currentNPCs.forEach(relationship => {
                   this.addNotesToNPC(relationship, [statusNote]);
                 });
                 
                 // Lưu lại để cập nhật localStorage
                 if (currentNPCs.length > 0) {
                 this.saveToStorage();
                 }
               }
      }
    });
  }

  // Force reload data from localStorage
  reloadFromStorage(): void {
    this.loadFromStorage();
  }

  // Xóa NPC group (nhóm người) - sử dụng logic từ isValidIndividualNPC
  removeGroupNPCs(): void {
    const toRemove: string[] = [];
    
    for (const [id, relationship] of this.relationships) {
      // Sử dụng lại logic validation thay vì duplicate code
      if (!this.isValidIndividualNPC(relationship.name)) {
        console.log(`🗑️ Removing invalid NPC: "${relationship.name}"`);
          toRemove.push(id);
      }
    }
    
    // Xóa các NPC không hợp lệ
    toRemove.forEach(id => {
      this.relationships.delete(id);
    });
    
    if (toRemove.length > 0) {
      this.saveToStorage();
      console.log(`✅ Removed ${toRemove.length} invalid NPCs`);
    }
  }

  // Merge duplicate NPCs (gộp các NPC trùng lặp)
  mergeDuplicateNPCs(): void {
    const allRelationships = Array.from(this.relationships.values());
    const mergedRelationships = new Map<string, NPCRelationship>();
    
    for (const relationship of allRelationships) {
      let merged = false;
      
      // Tìm xem có NPC tương tự nào đã được merge chưa
      for (const [, existing] of mergedRelationships) {
        if (this.areNamesSimilar(relationship.name, existing.name)) {
          // Merge thông tin
          if (this.isMoreDetailedName(relationship.name, existing.name)) {
            existing.name = relationship.name;
          }
          
          if ((relationship.description?.length || 0) > (existing.description?.length || 0)) {
            existing.description = relationship.description || existing.description;
          }
          
          // Merge notes
          existing.notes = [...(existing.notes || []), ...(relationship.notes || [])];
          existing.notes = [...new Set(existing.notes)]; // Remove duplicates
          
          // Merge tags
          existing.tags = [...(existing.tags || []), ...(relationship.tags || [])];
          existing.tags = [...new Set(existing.tags)]; // Remove duplicates
          
          // Cập nhật thời gian interaction gần nhất
          if (relationship.lastInteraction > existing.lastInteraction) {
            existing.lastInteraction = relationship.lastInteraction;
          }
          
          // Cộng dồn totalInteractions
          existing.totalInteractions += relationship.totalInteractions;
          
          merged = true;
          break;
        }
      }
      
      if (!merged) {
        mergedRelationships.set(relationship.id, { ...relationship });
      }
    }
    
    // Cập nhật relationships
    this.relationships = mergedRelationships;
    this.saveToStorage();
    
    console.log(`✅ Merged duplicate NPCs: ${allRelationships.length} -> ${mergedRelationships.size}`);
  }

  // Export data for save games
  exportForSaveGame(): { relationships: { [key: string]: NPCRelationship }, encounters: any[] } {
    const relationshipsObj: { [key: string]: NPCRelationship } = {};
    for (const [id, relationship] of this.relationships) {
      relationshipsObj[id] = relationship;
    }
    
    return {
      relationships: relationshipsObj,
      encounters: this.encounters
    };
  }

  // Import data from save games
  importFromSaveGame(data: { relationships: { [key: string]: NPCRelationship }, encounters: any[] }): void {
    this.relationships.clear();
    this.encounters = [];
    
    if (data.relationships) {
      for (const [id, relationship] of Object.entries(data.relationships)) {
        this.relationships.set(id, relationship);
      }
    }
    
    if (data.encounters) {
      this.encounters = [...data.encounters];
    }
    
    // Save to localStorage for persistence
    this.saveToStorage();
    console.log(`✅ Imported ${Object.keys(data.relationships || {}).length} NPC relationships and ${(data.encounters || []).length} encounters from save game`);
  }

  // Clear all data (for testing or reset)
  clearAllData(): void {
    this.relationships.clear();
    this.encounters = [];
    this.factionReputations.clear();
    localStorage.removeItem('npc_relationships');
    localStorage.removeItem('npc_encounters');
    localStorage.removeItem('rp_summary_backup');
    localStorage.removeItem('faction_quests');
    localStorage.removeItem('faction_reputations');
    console.log('🗑️ Cleared all NPC relationship data, encounters, faction data, and summary backup JSON files');
  }

  // Get faction reputation (from stored value + NPC contributions)
  getFactionReputation(factionName: string): number {
    const storedReputation = this.factionReputations.get(factionName) || 0;
    const npcContribution = this.calculateNPCContribution(factionName);
    return Math.max(-300, Math.min(300, storedReputation + npcContribution));
  }

  // Set faction reputation directly
  setFactionReputation(factionName: string, reputation: number): void {
    this.factionReputations.set(factionName, Math.max(-300, Math.min(300, reputation)));
    this.saveFactionReputations();
  }

  // Adjust faction reputation
  adjustFactionReputation(factionName: string, amount: number): void {
    const currentReputation = this.factionReputations.get(factionName) || 0;
    this.factionReputations.set(factionName, Math.max(-300, Math.min(300, currentReputation + amount)));
    this.saveFactionReputations();
    
    // Notify quest system about faction reputation change
    this.notifyQuestSystemFactionReputationChange(factionName);
  }

  // Notify quest system about faction reputation change
  private notifyQuestSystemFactionReputationChange(factionName: string): void {
    // Dispatch custom event for quest system to listen
    const event = new CustomEvent('factionReputationChanged', {
      detail: {
        factionName,
        reputation: this.getFactionReputation(factionName)
      }
    });
    window.dispatchEvent(event);
  }

  // Calculate NPC contribution to faction reputation
  private calculateNPCContribution(factionName: string): number {
    const factionMembers = Array.from(this.relationships.values())
      .filter(npc => npc.faction === factionName);
    
    return factionMembers.reduce((sum, npc) => sum + npc.reputation, 0);
  }

  // Save faction reputations to localStorage
  private saveFactionReputations(): void {
    const factionReputationData = Array.from(this.factionReputations.entries()).map(([name, reputation]) => ({
      factionName: name,
      reputation: reputation
    }));
    localStorage.setItem('faction_reputations', JSON.stringify(factionReputationData));
  }

  // Load faction reputations from localStorage
  private loadFactionReputations(): void {
    try {
      const data = localStorage.getItem('faction_reputations');
      if (data) {
        const factionReputationData = JSON.parse(data);
        this.factionReputations.clear();
        factionReputationData.forEach((item: any) => {
          this.factionReputations.set(item.factionName, item.reputation);
        });
      }
    } catch (error) {
      console.error('Lỗi load faction reputations:', error);
    }
  }

  // Calculate faction reputation based on NPCs in that faction
  calculateFactionReputation(factionName: string): {
    reputation: number;
    memberCount: number;
    averageReputation: number;
    members: Array<{ name: string; reputation: number; relationshipLevel: number }>;
  } {
    const factionMembers = Array.from(this.relationships.values())
      .filter(npc => npc.faction === factionName);
    
    const totalReputation = this.getFactionReputation(factionName);
    
    if (factionMembers.length === 0) {
      return {
        reputation: totalReputation,
        memberCount: 0,
        averageReputation: 0,
        members: []
      };
    }

    const averageReputation = totalReputation / factionMembers.length;
    
    const members = factionMembers.map(npc => ({
      name: npc.name,
      reputation: npc.reputation,
      relationshipLevel: npc.relationshipLevel
    }));

    return {
      reputation: totalReputation,
      memberCount: factionMembers.length,
      averageReputation: Math.round(averageReputation * 100) / 100, // Round to 2 decimal places
      members
    };
  }

  // Get all factions with their reputation data
  getAllFactionReputations(): Array<{
    factionName: string;
    reputation: number;
    memberCount: number;
    averageReputation: number;
    members: Array<{ name: string; reputation: number; relationshipLevel: number }>;
  }> {
    // Get all unique faction names from NPCs
    const factionNames = new Set<string>();
    this.relationships.forEach(npc => {
      if (npc.faction) {
        factionNames.add(npc.faction);
      }
    });

    // Calculate reputation for each faction
    return Array.from(factionNames).map(factionName => ({
      factionName,
      ...this.calculateFactionReputation(factionName)
    }));
  }

  // Generate NPC personality traits for more realistic analysis
  private generateNPCPersonality(npcName: string): string {
    // Use NPC name as seed for consistent personality
    const seed = npcName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (seed * 9301 + 49297) % 233280 / 233280;
    
    const personalities = [
      'Thận trọng, không dễ tin tưởng người lạ',
      'Nhiệt tình, dễ bị ảnh hưởng bởi cảm xúc',
      'Lạnh lùng, ít biểu lộ cảm xúc',
      'Nghi ngờ, luôn tìm kiếm động cơ ẩn',
      'Tốt bụng, dễ tha thứ và giúp đỡ',
      'Kiêu ngạo, coi thường người khác',
      'Thông minh, phân tích kỹ trước khi quyết định',
      'Bốc đồng, hành động theo cảm xúc',
      'Cẩn thận, không thích rủi ro',
      'Tự tin, không dễ bị thuyết phục'
    ];
    
    const selectedPersonality = personalities[Math.floor(random * personalities.length)];
    return selectedPersonality;
  }
}

export const npcRelationshipService = NPCRelationshipService.getInstance();