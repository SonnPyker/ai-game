import { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, AlertCircle, Play, Clock, MessageSquare, FileText, Undo2, Save, Shield, AlertTriangle, Info, EyeOff, RefreshCw, History, Moon, Sword } from 'lucide-react';
import { worldTimeService } from '../services/worldTimeService';
import { sccService } from '../services/sccService';
import { WorldTime, SCCContext, ChatMessage, ContentFlags, PlayerLocation, InventoryItem } from '../types';
import { buildContextForAI } from '../lib/context';
import { SaveGame } from '../types/saveGame';
import { useQuestSystem } from '../hooks/useQuestSystem';
import { QuestSystem } from '../types';
import { DialogueRenderer } from '../components/DialogueRenderer';
import { detectPlayerDialogue, enhanceDialogueForAI } from '../utils/dialogueProcessor';
import { useResponsiveContext } from '../contexts/ResponsiveContext';
import { actionSuggestionService, SuggestedAction, ActionLogEntry } from '../services/actionSuggestionService';
import { locationService } from '../services/locationService';
import { inventoryService } from '../services/inventoryService';
import { ItemSelectionModal } from '../components/ItemSelectionModal/ItemSelectionModal';
import { MotionWrapper } from '../components/MotionWrapper';
import { questCompletionService } from '../services/questCompletionService';

// Lazy load các services lớn để giảm kích thước bundle chính
let geminiService: any;
let localSaveService: any;
let cloudSyncService: any;
let npcRelationshipService: any;

// Dynamic imports cho services
const loadServices = async () => {
  if (!geminiService) {
    const geminiModule = await import('../services/geminiService');
    geminiService = geminiModule.geminiService;
  }
  if (!localSaveService) {
    const localSaveModule = await import('../services/saveStorage/localSaveService');
    localSaveService = localSaveModule.localSaveService;
  }
  if (!cloudSyncService) {
    const cloudSyncModule = await import('../services/saveStorage/cloudSyncService');
    cloudSyncService = cloudSyncModule.cloudSyncService;
  }
  if (!npcRelationshipService) {
    const npcModule = await import('../services/npcRelationshipService');
    npcRelationshipService = npcModule.npcRelationshipService;
  }
};

// Lazy load các components lớn để giảm kích thước bundle chính
const InfoMenu = lazy(() => import('../components/InfoMenu/InfoMenu').then(module => ({ default: module.InfoMenu })));
const SaveManager = lazy(() => import('../components/SaveManager/SaveManager').then(module => ({ default: module.SaveManager })));
const SavePopup = lazy(() => import('../components/SaveManager/SavePopup').then(module => ({ default: module.SavePopup })));
const QuestOfferModal = lazy(() => import('../components/QuestOfferModal/QuestOfferModal').then(module => ({ default: module.QuestOfferModal })));
const ActionSuggestions = lazy(() => import('../components/ActionSuggestions/ActionSuggestions').then(module => ({ default: module.ActionSuggestions })));
const ActionLog = lazy(() => import('../components/ActionSuggestions/ActionLog').then(module => ({ default: module.ActionLog })));

interface GameState {
  scenarioSkeleton: any;
  sceneState: any;
  storyProgress: any;
  isInitialized: boolean;
  worldTime: WorldTime | null;
  sccContext: SCCContext | null;
  showSummaryBanner: boolean;
  lastSummaryTurn: number;
  contentFlags: ContentFlags | null;
  playerLocation: PlayerLocation | null;
}

export function GamePage() {
  const navigate = useNavigate();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnCounter, setTurnCounter] = useState(0);
  const [showSaveManager, setShowSaveManager] = useState(false);
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [isInfoMenuPinned, setIsInfoMenuPinned] = useState(false);
  // Removed saveLoading state as it's handled in SavePopup
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [characterDataUpdate, setCharacterDataUpdate] = useState(0);
  
  // Quest offer modal state
  const [showQuestOfferModal, setShowQuestOfferModal] = useState(false);
  const [pendingQuestOffer, setPendingQuestOffer] = useState<any>(null);
  const [processedQuests, setProcessedQuests] = useState<Set<string>>(new Set());
  
  // Resend message state
  const [resendingMessageIndex, setResendingMessageIndex] = useState<number | null>(null);
  const [showResendButton, setShowResendButton] = useState<number | null>(null);
  
  // Force UI refresh for NPC relationships
  const [npcRelationshipsUpdated, setNpcRelationshipsUpdated] = useState(0);
  
  // AI processing states
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isNPCAnalysisProcessing, setIsNPCAnalysisProcessing] = useState(false);
  
  // Streaming narrative state
  const [streamingNarrative, setStreamingNarrative] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Action suggestions state
  const [actionSuggestions, setActionSuggestions] = useState<SuggestedAction[]>([]);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [showActionLog, setShowActionLog] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isSuggestionsCollapsed, setIsSuggestionsCollapsed] = useState(false);
  const [hasLoadedSuggestions, setHasLoadedSuggestions] = useState(false);
  const [backupSuggestions, setBackupSuggestions] = useState<SuggestedAction[]>([]);
  const [userInteractedWithSuggestions, setUserInteractedWithSuggestions] = useState(false);
  
  // Retry state
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRetryError, setLastRetryError] = useState<string | null>(null);
  
  // Skip time modal state
  const [showSkipTimeModal, setShowSkipTimeModal] = useState(false);
  const [skipHours, setSkipHours] = useState(2);
  
  // Item selection modal state
  const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  
  // NPC Dialogue Selector state - with persistence
  const [selectedNPCForDialogue, setSelectedNPCForDialogue] = useState<string | null>(() => {
    // Load from localStorage on initialization
    const saved = localStorage.getItem('selectedNPCForDialogue');
    return saved || null;
  });
  const [availableNPCs, setAvailableNPCs] = useState<Array<{id: string, name: string}>>([]);
  const [showNPCDropdown, setShowNPCDropdown] = useState(false);
  
  // Travel action state
  const [isTravelActionSelected, setIsTravelActionSelected] = useState(false);
  const [selectedTravelLocationId, setSelectedTravelLocationId] = useState<string | null>(null);
  
  // Helper function to generate random duration for suggestions (10-120 minutes)
  const generateSuggestionDuration = (): number => {
    return Math.floor(Math.random() * 111) + 10; // 10-120 phút
  };
  
  // Responsive design context
  const { shouldUseMobileLayout } = useResponsiveContext();
  const [gameState, setGameState] = useState<GameState>({
    scenarioSkeleton: null,
    sceneState: {},
    storyProgress: null,
    isInitialized: false,
    worldTime: null,
    sccContext: null,
    showSummaryBanner: false,
    lastSummaryTurn: 0,
    contentFlags: null,
    playerLocation: null
  });

  // Quest system hook
  const {
    questSystem,
    saveQuestSystem,
    acceptQuest,
    declineQuest,
    declineActiveQuest,
    removeDeclinedQuests,
    completeObjective,
    claimReward,
    generateSideQuestFromAI,
    createFactionQuestFromAI
  } = useQuestSystem();
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [chatHistory]);

  // Retry mechanism for NPC relationship analysis
  const retryNPCAnalysis = async (
    narrative: string, 
    location: string | undefined, 
    enhancedContext: any, 
    maxRetries: number = 3
  ): Promise<void> => {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        setIsNPCAnalysisProcessing(true);
        
        await npcRelationshipService.updateRelationshipsFromNarrative(
          narrative, 
          location, 
          enhancedContext,
          selectedNPCForDialogue
        );
        
        // Check if any NPCs were mentioned in the narrative
        // If no NPCs were mentioned, clear any existing selection
        const allRelationships = npcRelationshipService.getAllRelationships();
        const mentionedNPCs = allRelationships.filter((npc: any) => 
          narrative.toLowerCase().includes(npc.name.toLowerCase()) ||
          enhancedContext?.playerAction?.toLowerCase().includes(npc.name.toLowerCase())
        );
        
        // If no NPCs were mentioned, clear any existing selection
        if (mentionedNPCs.length === 0 && selectedNPCForDialogue) {
          setSelectedNPCForDialogue(null);
          localStorage.removeItem('selectedNPCForDialogue');
        }
        
        // Success - force UI refresh
        setNpcRelationshipsUpdated(prev => prev + 1);
        return;
        
      } catch (error) {
        retryCount++;
        console.warn(`⚠️ NPC analysis failed (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount < maxRetries) {
          // Wait before retry
          const delay = Math.min(1000 * retryCount, 3000); // 1s, 2s, 3s max
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // All retries failed
          console.error('❌ NPC analysis failed after all retries');
          setError('Không thể phân tích quan hệ NPC sau nhiều lần thử');
        }
      } finally {
        setIsNPCAnalysisProcessing(false);
      }
    }
  };

  // Load available NPCs from scene state and npcRelationshipService
  const loadAvailableNPCs = async () => {
    try {
      await loadServices();
      
      const npcs: Array<{id: string, name: string}> = [];
      
      // Source 1: Get NPCs from scene state (gameState.sceneState.npcs)
      if (gameState.sceneState?.npcs) {
        gameState.sceneState.npcs.forEach((npc: any) => {
          if (npc.name) {
            // Use name as id if id is not available
            const npcId = npc.id || npc.name.toLowerCase().replace(/\s+/g, '_');
            npcs.push({ id: npcId, name: npc.name });
          }
        });
      }
      
      // Source 2: Get NPCs from npcRelationshipService (ALL NPCs, not just current location)
      const allRelationships = npcRelationshipService.getAllRelationships();
      
      allRelationships.forEach((npc: any) => {
        // Avoid duplicates by checking both id and name
        const existingById = npcs.find(existing => existing.id === npc.id);
        const existingByName = npcs.find(existing => existing.name === npc.name);
        
        if (!existingById && !existingByName && npc.name) {
          npcs.push({ id: npc.id, name: npc.name });
        }
      });
      
      // Source 3: Get NPCs from localStorage npc_relationships directly
      try {
        const storedRelationships = localStorage.getItem('npc_relationships');
        if (storedRelationships) {
          const parsedRelationships = JSON.parse(storedRelationships);
          
          parsedRelationships.forEach((npc: any) => {
            const existingById = npcs.find(existing => existing.id === npc.id);
            const existingByName = npcs.find(existing => existing.name === npc.name);
            
            if (!existingById && !existingByName && npc.name) {
              npcs.push({ id: npc.id, name: npc.name });
            }
          });
        }
      } catch (error) {
        console.warn('Error parsing npc_relationships from localStorage:', error);
      }
      
      setAvailableNPCs(npcs);
      
      // Validate selectedNPCForDialogue - reset if NPC no longer exists
      if (selectedNPCForDialogue) {
        const selectedNPCExists = npcs.some(npc => npc.id === selectedNPCForDialogue);
        if (!selectedNPCExists) {
          setSelectedNPCForDialogue(null);
          localStorage.removeItem('selectedNPCForDialogue');
        }
      }
    } catch (error) {
      console.error('Error loading available NPCs:', error);
      setAvailableNPCs([]);
    }
  };

  // Load NPCs when scene state changes
  useEffect(() => {
    loadAvailableNPCs();
  }, [gameState.sceneState?.location, gameState.sceneState?.npcs, selectedNPCForDialogue]);

  // Load NPCs on component mount
  useEffect(() => {
    loadAvailableNPCs();
  }, []); // Empty dependency array - only run once on mount

  // Close NPC dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNPCDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.npc-dropdown-container')) {
          setShowNPCDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNPCDropdown]);

  // Load chat history from localStorage
  useEffect(() => {
    const savedChat = localStorage.getItem('rp_chat');
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        setChatHistory(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('Lỗi load chat history:', error);
      }
    }
  }, []);

  // Listen for quest reward claimed events để refresh character data
  useEffect(() => {
    const handleQuestRewardClaimed = () => {
      // Force re-render bằng cách update character data
      setCharacterDataUpdate(prev => prev + 1);
    };

    window.addEventListener('questRewardClaimed', handleQuestRewardClaimed);
    return () => {
      window.removeEventListener('questRewardClaimed', handleQuestRewardClaimed);
    };
  }, []);

  // Persist selectedNPCForDialogue to localStorage
  useEffect(() => {
    if (selectedNPCForDialogue) {
      localStorage.setItem('selectedNPCForDialogue', selectedNPCForDialogue);
    } else {
      localStorage.removeItem('selectedNPCForDialogue');
    }
  }, [selectedNPCForDialogue]);

  // Listen for NPC auto-selection events
  useEffect(() => {
    const handleNPCAutoSelected = (event: CustomEvent) => {
      const { npcId } = event.detail;
      
      // Update selected NPC for dialogue
      setSelectedNPCForDialogue(npcId);
      
      // Show notification
    };

    window.addEventListener('npcAutoSelected', handleNPCAutoSelected as EventListener);
    return () => {
      window.removeEventListener('npcAutoSelected', handleNPCAutoSelected as EventListener);
    };
  }, []);

  // Check for loaded save game data
  useEffect(() => {
    const checkForLoadedSave = () => {
      // Check if we have world, character AND scenario data
      const worldData = localStorage.getItem('world_gen_result');
      const characterData = localStorage.getItem('currentCharacter');
      const scenarioData = localStorage.getItem('rp_scenario');
      
      if (worldData && characterData && scenarioData) {
          // We have complete game data, initialize the game state
          try {
            const world = JSON.parse(worldData);
            const scenario = JSON.parse(scenarioData);
            
            // Clear selected NPC when loading game to avoid conflicts
            setSelectedNPCForDialogue(null);
            localStorage.removeItem('selectedNPCForDialogue');
            
            // Load content flags - ưu tiên world_gen_result để đảm bảo consistency
            let contentFlags: ContentFlags | null = null;
          
          // Ưu tiên load từ world_gen_result (dữ liệu chính thức)
          if (worldData) {
            try {
              const worldDataParsed = JSON.parse(worldData);
              if (worldDataParsed.contentFlags) {
                contentFlags = worldDataParsed.contentFlags;
              }
            } catch (error) {
              console.error('Lỗi parse world_gen_result trong load game:', error);
            }
          }
          
          // Fallback: load từ save game nếu không có trong world_gen_result
          if (!contentFlags) {
            const existingSave = localStorage.getItem('save_local1') || 
                                localStorage.getItem('save_local2') || 
                                localStorage.getItem('save_local3');
            
            if (existingSave) {
              try {
                const saveData = JSON.parse(existingSave);
                contentFlags = saveData.contentFlags || null;
              } catch (error) {
                console.error('Lỗi load content flags từ save:', error);
              }
            }
          }
          
          // Load turn counter and chat history
          const savedTurnCounter = parseInt(localStorage.getItem('game_turn_counter') || '0', 10);
          const savedChat = localStorage.getItem('rp_chat');
          let chatHistory = [];
          if (savedChat) {
            try {
              chatHistory = JSON.parse(savedChat).map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }));
            } catch (error) {
              console.error('Lỗi load chat history:', error);
            }
          }
          
          // Load and sync SCC context
          const sccContext = sccService.loadSCCContext();
          sccContext.turnCounter = savedTurnCounter;
          
          setGameState(prev => ({
            ...prev,
            isInitialized: true,
            scenarioSkeleton: scenario,
            worldTime: world.currentTime || { day: 1, hour: 12, month: 1, year: 1, dayOfWeek: 1 },
            contentFlags: contentFlags || { adult_enabled: false, adult_intensity: 'fade', first_time_setup: true },
            sccContext: sccContext
          }));
          
          setTurnCounter(savedTurnCounter);
          setChatHistory(chatHistory);
          
        } catch (error) {
          console.error('❌ Lỗi load game data:', error);
        }
      }
    };

    checkForLoadedSave();
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('rp_chat', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Ensure suggestions are loaded on mount
  useEffect(() => {
    if (gameState.isInitialized && !hasLoadedSuggestions) {
      
      // Check if suggestions already exist in localStorage
      const savedSuggestions = localStorage.getItem('action_suggestions');
      if (savedSuggestions) {
        try {
          const suggestions = JSON.parse(savedSuggestions);
          if (suggestions && suggestions.length > 0) {
            setActionSuggestions(suggestions);
            setBackupSuggestions([...suggestions]);
            setHasLoadedSuggestions(true);
            return; // Don't generate new ones
          }
        } catch (error) {
          console.error('Error parsing saved suggestions:', error);
        }
      }
      
      // Only generate new suggestions if none exist
      setHasLoadedSuggestions(true);
      
      // Set immediate fallback suggestions
      const immediateSuggestions = [
        {
          id: 'immediate_1',
          text: 'Khám phá khu vực xung quanh',
          summary: 'Tìm hiểu môi trường xung quanh',
          durationMinutes: generateSuggestionDuration(),
          impactTags: ['exploration'],
          source: 'heuristic' as const
        },
        {
          id: 'immediate_2', 
          text: 'Nghỉ ngơi và suy nghĩ',
          summary: 'Lên kế hoạch tiếp theo',
          durationMinutes: generateSuggestionDuration(),
          impactTags: ['planning'],
          source: 'heuristic' as const
        },
        {
          id: 'immediate_3',
          text: 'Hỏi thăm người dân địa phương',
          summary: 'Thu thập thông tin từ NPC',
          durationMinutes: generateSuggestionDuration(),
          impactTags: ['social'],
          source: 'heuristic' as const
        },
        {
          id: 'immediate_4',
          text: 'Kiểm tra khu vực nguy hiểm',
          summary: 'Thăm dò nơi có rủi ro',
          durationMinutes: generateSuggestionDuration(),
          impactTags: ['risk'],
          source: 'heuristic' as const
        }
      ];
      setActionSuggestions(immediateSuggestions);
      setBackupSuggestions([...immediateSuggestions]);
      
      // Then try to load AI suggestions
      loadActionSuggestions();
    }
  }, [gameState.isInitialized, hasLoadedSuggestions]);

  // Auto-collapse suggestions when chat history gets long (only if user hasn't interacted)
  useEffect(() => {
    if (chatHistory.length > 10 && !isSuggestionsCollapsed && !userInteractedWithSuggestions) {
      // Add a small delay to prevent immediate collapse when user is trying to open
      const timeoutId = setTimeout(() => {
        setIsSuggestionsCollapsed(true);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [chatHistory.length, isSuggestionsCollapsed, userInteractedWithSuggestions]);

  // Load action log on mount
  useEffect(() => {
    loadActionLog();
  }, []);

  // Add migration and test functions to window for development

  // Load action suggestions
  const loadActionSuggestions = async (isRetry = false) => {
    try {
      if (isRetry) {
        setIsRetrying(true);
        setRetryCount(prev => prev + 1);
        setLastRetryError(null);
      } else {
        setIsGeneratingSuggestions(true);
        setRetryCount(0);
        setLastRetryError(null);
      }
      
      const context = actionSuggestionService.buildContextFromStorage();
      
      const suggestions = await actionSuggestionService.generateSuggestions(context, context.contentFlags);
      
      setActionSuggestions(suggestions);
      setBackupSuggestions([...suggestions]);
      actionSuggestionService.saveCurrentSuggestions(suggestions);
      setHasLoadedSuggestions(true);
      
      // Clear error khi thành công
      setLastRetryError(null);
      
      if (isRetry) {
      }
    } catch (error) {
      console.error('Error loading action suggestions:', error);
      setLastRetryError(error instanceof Error ? error.message : 'Lỗi không xác định');
      
      // Fallback suggestions
      const fallbackSuggestions = [
        {
          id: 'fallback_1',
          text: 'Khám phá khu vực xung quanh',
          summary: 'Tìm hiểu môi trường xung quanh',
          durationMinutes: generateSuggestionDuration(),
          impactTags: ['exploration'],
          source: 'heuristic' as const
        },
        {
          id: 'fallback_2', 
          text: 'Nghỉ ngơi và suy nghĩ',
          summary: 'Lên kế hoạch tiếp theo',
          durationMinutes: generateSuggestionDuration(),
          impactTags: ['planning'],
          source: 'heuristic' as const
        }
      ];
      setActionSuggestions(fallbackSuggestions);
      setBackupSuggestions([...fallbackSuggestions]);
      setHasLoadedSuggestions(true);
    } finally {
      setIsGeneratingSuggestions(false);
      setIsRetrying(false);
    }
  };

  // Retry thủ công
  const handleRetrySuggestions = async () => {
    await loadActionSuggestions(true);
  };

  // Load action log
  const loadActionLog = () => {
    try {
      const log = actionSuggestionService.getActionLog();
      setActionLog(log || []);
    } catch (error) {
      console.error('Error loading action log:', error);
      setActionLog([]);
    }
  };

  // Handle NPC selection for dialogue
  const handleNPCSelection = (npcId: string | null) => {
    setSelectedNPCForDialogue(npcId);
    
    // Clear selected suggestion when switching NPC mode
    if (selectedSuggestionId) {
      setSelectedSuggestionId(null);
    }
    
    // Clear travel selection when switching to NPC dialogue
    if (isTravelActionSelected) {
      setIsTravelActionSelected(false);
      setSelectedTravelLocationId(null);
      setCurrentMessage('');
    }
  };

  // Handle suggestion pick
  const handleSuggestionPick = (suggestion: SuggestedAction) => {
    setUserInteractedWithSuggestions(true);
    
    // Nếu đã chọn suggestion này rồi thì hủy chọn
    if (selectedSuggestionId === suggestion.id) {
      setSelectedSuggestionId(null);
      setCurrentMessage('');
    } else {
      // Chọn suggestion mới
      setCurrentMessage(suggestion.text);
      setSelectedSuggestionId(suggestion.id);
      
      // Clear travel selection khi chọn suggestion
      if (isTravelActionSelected) {
        setIsTravelActionSelected(false);
        setSelectedTravelLocationId(null);
      }
    }
  };

  // Toggle suggestions collapse
  const toggleSuggestionsCollapse = () => {
    setUserInteractedWithSuggestions(true);
    setIsSuggestionsCollapsed(!isSuggestionsCollapsed);
  };

  // Generate action summary for manual actions
  const generateActionSummary = async (actionText: string, gameState: GameState): Promise<string> => {
    try {
      // Ensure services are loaded
      await loadServices();
      
      // Use AI to generate a summary based on the action text and current context
      const context = actionSuggestionService.buildContextFromStorage();
      const prompt = `Tạo một mô tả ngắn gọn (1-2 câu) cho hành động sau trong game RPG:

Hành động: "${actionText}"

Context hiện tại:
- Thế giới: ${context.worldData?.name || 'Unknown'}
- Nhân vật: ${context.characterData?.name || 'Unknown'}
- Vị trí: ${context.sceneState?.location || 'Unknown'}
- Thời gian: ${gameState.worldTime ? `${gameState.worldTime.hour}:${gameState.worldTime.minute.toString().padStart(2, '0')}` : 'Unknown'}

Trả về chỉ mô tả ngắn gọn, không cần giải thích thêm.`;

      const response = await geminiService.generateContent(prompt, gameState.contentFlags);
      return response || `Thực hiện hành động: ${actionText}`;
    } catch (error) {
      console.error('Error generating action summary:', error);
      return `Thực hiện hành động: ${actionText}`;
    }
  };

  // Estimate impact tags for manual actions
  const estimateImpactTags = (actionText: string): string[] => {
    const tags: string[] = [];
    const text = actionText.toLowerCase();
    
    // Story impact
    if (text.includes('nói') || text.includes('hỏi') || text.includes('thảo luận') || 
        text.includes('kể') || text.includes('giải thích') || text.includes('thuyết phục')) {
      tags.push('story');
    }
    
    // Risk impact
    if (text.includes('nguy hiểm') || text.includes('rủi ro') || text.includes('thám hiểm') || 
        text.includes('chiến đấu') || text.includes('tấn công') || text.includes('đối đầu')) {
      tags.push('risk');
    }
    
    // Relationship impact
    if (text.includes('npc') || text.includes('người') || text.includes('bạn') || 
        text.includes('quan hệ') || text.includes('giao tiếp') || text.includes('hợp tác')) {
      tags.push('relationship');
    }
    
    // Exploration impact
    if (text.includes('khám phá') || text.includes('tìm kiếm') || text.includes('đi') || 
        text.includes('thăm') || text.includes('xem') || text.includes('kiểm tra')) {
      tags.push('exploration');
    }
    
    // Planning impact
    if (text.includes('suy nghĩ') || text.includes('lên kế hoạch') || text.includes('quyết định') || 
        text.includes('chọn') || text.includes('xem xét') || text.includes('đánh giá')) {
      tags.push('planning');
    }
    
    // Default to general if no specific tags found
    if (tags.length === 0) {
      tags.push('general');
    }
    
    return tags;
  };

  // Check if narrative contains personal information keywords

  // Hàm validation AI response toàn diện
  const validateAIResponse = (response: any): { isValid: boolean; error?: string } => {
    try {
      // Kiểm tra response tồn tại
      if (!response) {
        return { isValid: false, error: 'AI response không tồn tại' };
      }

      // Kiểm tra narrative
      if (!response.narrative || typeof response.narrative !== 'string' || response.narrative.trim() === '') {
        return { isValid: false, error: 'AI response narrative không hợp lệ hoặc rỗng' };
      }

      // Kiểm tra narrative có độ dài hợp lý (ít nhất 50 ký tự)
      if (response.narrative.trim().length < 50) {
        return { isValid: false, error: 'AI response narrative quá ngắn (dưới 50 ký tự)' };
      }

      // Kiểm tra narrative không chứa lỗi rõ ràng
      const narrative = response.narrative.toLowerCase();
      
      // KIỂM TRA ĐẶC BIỆT: Thông báo lỗi cụ thể từ generateTurnResponse
      if (narrative.includes('xin lỗi, có lỗi xảy ra khi xử lý phản hồi từ ai')) {
        console.error('🚫 PHÁT HIỆN THÔNG BÁO LỖI CỤ THỂ - KHÔNG ĐƯỢC CẬP NHẬT BẤT KỲ THỨ GÌ:', {
          narrative: response.narrative,
          message: 'Đây là thông báo lỗi từ generateTurnResponse - tuyệt đối không được update state'
        });
        return { isValid: false, error: 'PHÁT HIỆN THÔNG BÁO LỖI CỤ THỂ - KHÔNG ĐƯỢC CẬP NHẬT BẤT KỲ STATE NÀO' };
      }
      
      // Kiểm tra các pattern lỗi cụ thể hơn
      const errorPatterns = [
        'error:',
        'lỗi:',
        'failed:',
        'thất bại:',
        'cannot generate',
        'không thể tạo',
        'api error',
        'lỗi api',
        'generation failed',
        'tạo thất bại',
        'invalid response',
        'phản hồi không hợp lệ',
        'sorry, i cannot',
        'xin lỗi, tôi không thể',
        'i apologize, but',
        'tôi xin lỗi, nhưng',
        // Thêm pattern cho thông báo lỗi cụ thể từ generateTurnResponse
        'xin lỗi, có lỗi xảy ra khi xử lý phản hồi từ ai',
        'có lỗi xảy ra khi xử lý phản hồi từ ai',
        'vui lòng thử lại',
        'không thể tạo phản hồi',
        'lỗi khi tạo turn response'
      ];
      
      const hasErrorPattern = errorPatterns.some(pattern => narrative.includes(pattern));
      if (hasErrorPattern) {
        console.error('🚫 AI response chứa thông báo lỗi:', {
          narrative: response.narrative,
          detectedPatterns: errorPatterns.filter(pattern => narrative.includes(pattern))
        });
        return { isValid: false, error: 'AI response chứa thông báo lỗi - không được phép cập nhật bất kỳ state nào' };
      }

      // Kiểm tra sceneState
      if (typeof response.sceneState !== 'object' || response.sceneState === null) {
        console.warn('⚠️ AI response sceneState không hợp lệ, sử dụng fallback');
        response.sceneState = {};
      }

      // Kiểm tra storyProgress
      if (typeof response.storyProgress !== 'object' || response.storyProgress === null) {
        console.warn('⚠️ AI response storyProgress không hợp lệ, sử dụng fallback');
        response.storyProgress = {};
      }

      // Kiểm tra softGuidance (có thể rỗng)
      if (response.softGuidance && typeof response.softGuidance !== 'string') {
        console.warn('⚠️ AI response softGuidance không hợp lệ, sử dụng fallback');
        response.softGuidance = '';
      }

      // Kiểm tra sideQuestOffer (có thể null)
      if (response.sideQuestOffer && typeof response.sideQuestOffer !== 'object') {
        console.warn('⚠️ AI response sideQuestOffer không hợp lệ, sử dụng fallback');
        response.sideQuestOffer = null;
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: `Lỗi validation AI response: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  };

  const initializeGame = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load services trước khi sử dụng
      await loadServices();

      // Load world and character data
      const worldData = localStorage.getItem('world_gen_result');
      const characterData = localStorage.getItem('currentCharacter');

      if (!worldData || !characterData) {
        throw new Error('Không tìm thấy dữ liệu thế giới hoặc nhân vật. Vui lòng tạo lại.');
      }

      // Load content flags - ưu tiên world_gen_result để đảm bảo consistency
      let contentFlags: ContentFlags = { adult_enabled: false, adult_intensity: 'fade', first_time_setup: true };
      
      // Ưu tiên load từ world_gen_result (dữ liệu chính thức)
      if (worldData) {
        try {
          const worldDataParsed = JSON.parse(worldData);
          if (worldDataParsed.contentFlags) {
            contentFlags = worldDataParsed.contentFlags;
          }
        } catch (error) {
          console.error('Lỗi parse world_gen_result:', error);
        }
      }
      
      // Fallback: load từ currentWorldData nếu không có trong world_gen_result
      if (!contentFlags || contentFlags.adult_enabled === false) {
        const currentWorldData = localStorage.getItem('currentWorldData');
        if (currentWorldData) {
          try {
            const currentWorldParsed = JSON.parse(currentWorldData);
            if (currentWorldParsed.contentFlags) {
              contentFlags = currentWorldParsed.contentFlags;
            }
          } catch (error) {
            console.error('Lỗi parse currentWorldData:', error);
          }
        }
      }

      // Parse world data and get current time
      const worldDataParsed = JSON.parse(worldData);
      const currentTime = worldDataParsed.currentTime || worldTimeService.initializeWorldTime(worldDataParsed.startYear || 1);

      // Generate scenario skeleton
      const scenarioSkeleton = await geminiService.generateScenarioSkeleton(worldData, characterData);
      
      // Tạo quest system hoàn toàn mới từ scenario skeleton
      if (scenarioSkeleton.questSystem) {
        const newQuestSystem: QuestSystem = {
          starterQuest: scenarioSkeleton.questSystem.starterQuest,
          mainQuests: scenarioSkeleton.questSystem.mainQuests || [],
          sideQuests: [], // Bắt đầu với side quests rỗng
          factionQuests: [], // Bắt đầu với faction quests rỗng
          currentAct: 1, // Bắt đầu từ act 1
          totalActs: 5,
          unlockedActs: [1], // Unlock act 1
          questHistory: [],
          factionReputations: []
        };
        
        // Lưu quest system mới
        saveQuestSystem(newQuestSystem);
      }
      
      // Lấy thông tin quest để nhắc đến trong opening message
      let questInfo = null;
      
      // Ưu tiên starterQuest trước mainQuests
      if (questSystem.starterQuest && questSystem.starterQuest.objectives.length > 0) {
        questInfo = {
          title: questSystem.starterQuest.title,
          description: questSystem.starterQuest.description,
          firstObjective: questSystem.starterQuest.objectives[0].description
        };
      } else if (questSystem.mainQuests.length > 0) {
        const firstMainQuest = questSystem.mainQuests[0];
        if (firstMainQuest.objectives.length > 0) {
          questInfo = {
            title: firstMainQuest.title,
            description: firstMainQuest.description,
            firstObjective: firstMainQuest.objectives[0].description
          };
        }
      }
      
      // Generate opening narrative với thông tin quest
      const openingNarrative = await geminiService.generateOpeningNarrative(
        worldData, 
        characterData, 
        JSON.stringify(scenarioSkeleton),
        questInfo
      );

      // Save scenario to localStorage
      localStorage.setItem('rp_scenario', JSON.stringify(scenarioSkeleton));

       // Bỏ refresh quest system từ world data - chỉ nhận side quest từ chat
       // Sidequest chỉ được tạo khi người chơi accept từ game chat, không load từ world data

      // Add opening message to chat
      const openingMessage: ChatMessage = {
        role: 'ai',
        content: openingNarrative,
        timestamp: new Date()
      };

      // Load turn counter from localStorage
      const savedTurnCounter = parseInt(localStorage.getItem('game_turn_counter') || '0', 10);
      
      // Load or initialize SCC context
      const sccContext = sccService.loadSCCContext();
      // Sync SCC turnCounter with game turnCounter
      sccContext.turnCounter = savedTurnCounter;
      const updatedSccContext = sccService.addTurn(sccContext, openingMessage);
      
      // Initialize player location
      const initialLocationId = locationService.initializePlayerLocation(
        worldDataParsed,
        scenarioSkeleton,
        openingNarrative
      );
      
      const playerLocation: PlayerLocation = {
        currentLocationId: initialLocationId,
        locationHistory: [{
          locationId: initialLocationId,
          arrivedAt: currentTime,
          turn: savedTurnCounter
        }]
      };
      
      locationService.savePlayerLocation(playerLocation);
      
      setChatHistory([openingMessage]);
      setTurnCounter(savedTurnCounter);
      setGameState({
        scenarioSkeleton,
        sceneState: {},
        storyProgress: null,
        isInitialized: true,
        worldTime: currentTime,
        sccContext: updatedSccContext,
        showSummaryBanner: false,
        lastSummaryTurn: 0,
        contentFlags: contentFlags,
        playerLocation: playerLocation
      });

      // Save SCC context
      sccService.saveSCCContext(updatedSccContext);

      // Load action suggestions and log
      try {
        loadActionLog();
        // Check localStorage first before using service
        const savedSuggestions = localStorage.getItem('action_suggestions');
        if (savedSuggestions) {
          try {
            const suggestions = JSON.parse(savedSuggestions);
            if (suggestions && suggestions.length > 0) {
              setActionSuggestions(suggestions);
              setBackupSuggestions([...suggestions]);
              setHasLoadedSuggestions(true);
            } else {
              // Only generate if no valid suggestions exist
              await loadActionSuggestions();
            }
          } catch (error) {
            console.error('Error parsing saved suggestions in initializeGame:', error);
            await loadActionSuggestions();
          }
        } else {
          // No saved suggestions, generate new ones
          await loadActionSuggestions();
        }
      } catch (suggestionError) {
        console.error('Error loading action suggestions:', suggestionError);
        // Fallback: generate basic suggestions
        const fallbackSuggestions = [
          {
            id: 'fallback_1',
            text: 'Khám phá khu vực xung quanh',
            summary: 'Tìm hiểu môi trường xung quanh',
            durationMinutes: generateSuggestionDuration(),
            impactTags: ['exploration'],
            source: 'heuristic' as const
          },
          {
            id: 'fallback_2', 
            text: 'Nghỉ ngơi và suy nghĩ',
            summary: 'Lên kế hoạch tiếp theo',
            durationMinutes: generateSuggestionDuration(),
            impactTags: ['planning'],
            source: 'heuristic' as const
          },
          {
            id: 'fallback_3',
            text: 'Hỏi thăm người dân địa phương',
            summary: 'Thu thập thông tin từ NPC',
            durationMinutes: generateSuggestionDuration(),
            impactTags: ['social'],
            source: 'heuristic' as const
          },
          {
            id: 'fallback_4',
            text: 'Kiểm tra khu vực nguy hiểm',
            summary: 'Thăm dò nơi có rủi ro',
            durationMinutes: generateSuggestionDuration(),
            impactTags: ['risk'],
            source: 'heuristic' as const
          }
        ];
        setActionSuggestions(fallbackSuggestions);
        setBackupSuggestions([...fallbackSuggestions]);
        setHasLoadedSuggestions(true);
      }

    } catch (error) {
      console.error('Lỗi khởi tạo game:', error);
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading || isAIProcessing || isNPCAnalysisProcessing) return;

    // Load services trước khi sử dụng
    await loadServices();

    // Detect and process dialogue in player input
    const dialogueInfo = detectPlayerDialogue(currentMessage.trim());
    
    // Enhance dialogue if detected
    let enhancedMessage = currentMessage.trim();
    if (dialogueInfo.hasDialogue) {
      // Get current context for dialogue enhancement
      const currentLocation = gameState.sceneState?.location;
      const npcContext = gameState.sceneState?.npcs?.[0]; // Get first NPC if available
      const relationshipLevel = npcContext ? 
        npcRelationshipService.getRelationship(npcContext.name)?.relationshipLevel : undefined;
      
      enhancedMessage = enhanceDialogueForAI(dialogueInfo.dialogueContent, {
        currentLocation,
        npcName: npcContext?.name,
        relationshipLevel,
        gameContext: gameState.sccContext?.summary?.recap || ''
      });
    }

    const playerMessage: ChatMessage = {
      role: 'player',
      content: currentMessage.trim(), // Keep original for display
      timestamp: new Date(),
      turn: turnCounter + 1
    };

    const newChatHistory = [...chatHistory, playerMessage];
    setChatHistory(newChatHistory);
    setCurrentMessage('');
    setIsLoading(true);
    setIsAIProcessing(true);
    setError(null);
    
    // Clear selection states
    setIsTravelActionSelected(false);
    setSelectedTravelLocationId(null);
    setSelectedSuggestionId(null);

    // Backup current suggestions trước khi gửi tin nhắn
    setBackupSuggestions([...actionSuggestions]);

    // Flag để đánh dấu AI response thành công
    // LOGIC: 
    // - Khởi tạo = false (an toàn, không update gì)
    // - Chỉ set = true khi AI response thực sự thành công và hợp lệ
    // - Set = false khi có lỗi (trong catch block)
    let aiResponseSuccess = false;

    try {
      // Load data
      const worldData = localStorage.getItem('world_gen_result');
      const characterData = localStorage.getItem('currentCharacter');
      const scenarioData = localStorage.getItem('rp_scenario');

      if (!worldData || !characterData || !scenarioData) {
        throw new Error('Thiếu dữ liệu game. Vui lòng khởi tạo lại.');
      }

      // Update SCC context with player message
      let updatedSccContext = gameState.sccContext;
      if (updatedSccContext) {
        // Sync SCC turnCounter with game turnCounter
        updatedSccContext.turnCounter = turnCounter;
        updatedSccContext = sccService.addTurn(updatedSccContext, playerMessage);
      }

      // Check if we need to summarize
      let shouldSummarize = false;
      if (updatedSccContext && sccService.shouldSummarize(updatedSccContext)) {
        shouldSummarize = true;
      }
      

      // Build delta context for AI
      const deltaContext = buildContextForAI(turnCounter + 1); // +1 because we're about to add the current turn
      
      
      // Generate AI response using delta context with streaming
      setIsStreaming(true);
      setStreamingNarrative('');
      
      const response = await geminiService.generateTurnResponseWithDeltaStreaming(
        worldData,
        characterData,
        scenarioData,
        deltaContext.summary,
        deltaContext.sceneState,
        deltaContext.recentTurns.map(msg => ({ role: msg.role, content: msg.content, turn: msg.turn || 0 })),
        enhancedMessage, // Use enhanced message for AI processing
        gameState.contentFlags || undefined,
        questSystem,
        turnCounter,
        gameState.worldTime, // Pass world time to AI
        (chunk: string) => {
          // Handle streaming chunks
          setStreamingNarrative(prev => prev + chunk);
        }
      );
      
      setIsStreaming(false);
      setStreamingNarrative('');
      

      // Validate AI response using comprehensive validation function
      const validation = validateAIResponse(response);
      if (!validation.isValid) {
        console.error('🚫 AI response validation failed:', {
          error: validation.error,
          response: response,
          narrative: response?.narrative,
          narrativeLength: response?.narrative?.length
        });
        throw new Error(validation.error || 'AI response validation failed');
      }

      // CHỈ SET FLAG THÀNH CÔNG KHI AI RESPONSE HOÀN TOÀN HỢP LỆ
      // Đây là điểm duy nhất set flag thành true trong try block
      // Nếu đến đây nghĩa là AI response đã được validate thành công
      aiResponseSuccess = true;

      // TẤT CẢ XỬ LÝ SAU AI RESPONSE PHẢI NẰM TRONG TRY-CATCH BLOCK NÀY
      // Để đảm bảo khi AI response bị lỗi, không có gì được cập nhật

      // CHỈ XỬ LÝ CÁC THÀNH PHẦN KHÁC KHI AI RESPONSE THÀNH CÔNG
      // Bảo vệ kép: kiểm tra flag và response validity
      if (aiResponseSuccess && response && response.narrative) {
        // Add AI response to chat
        const aiMessage: ChatMessage = {
          role: 'ai',
          content: response.narrative,
          timestamp: new Date(),
          turn: turnCounter + 1
        };

        const finalChatHistory = [...newChatHistory, aiMessage];
        setChatHistory(finalChatHistory);
        // Quest detection và generation
        try {

          // Kiểm tra quest completion với questCompletionService
          const activeQuests = [
            ...questSystem.mainQuests.filter(q => q.status === 'active'),
            ...questSystem.sideQuests.filter(q => q.status === 'active'),
            ...questSystem.factionQuests.filter(q => q.status === 'active')
          ];

          const questCompletionContext = {
            inventory: inventoryService.getInventory(),
            npcRelationships: npcRelationshipService.getAllRelationships(),
            combatHistory: JSON.parse(localStorage.getItem('combat_history') || '{"defeatedEnemies":[]}'),
            playerLocation: response.sceneState?.locationId,
            playerPosition: response.sceneState?.gridPosition
          };

          const questAnalysis = await questCompletionService.checkAllActiveQuests(questCompletionContext, activeQuests);
          
          // Xử lý side quest offer từ AI response
          if (response.sideQuestOffer && response.sideQuestOffer.title) {
            // Kiểm tra quest đã được xử lý chưa
            const questId = response.sideQuestOffer.id || response.sideQuestOffer.title;
            if (!processedQuests.has(questId)) {
              
              // Kiểm tra signature quest đã tồn tại chưa
              let shouldCreateQuest = true;
              if (response.sideQuestOffer.isLocationSignature && response.sideQuestOffer.signatureLocationId) {
                const existingSignatureQuest = questSystem.sideQuests.find(quest => 
                  quest.isLocationSignature && quest.signatureLocationId === response.sideQuestOffer.signatureLocationId
                );
                
                if (existingSignatureQuest) {
                  // Đánh dấu quest này đã được xử lý để tránh tạo lại
                  processedQuests.add(questId);
                  shouldCreateQuest = false;
                }
              }
              
              if (shouldCreateQuest) {
                // Kiểm tra quest system rules cho side quest bình thường
                if (!response.sideQuestOffer.isLocationSignature) {
                  // Kiểm tra tần suất tạo side quest (tối đa 1 quest mỗi 3-5 turn)
                  const recentSideQuests = questSystem.sideQuests.filter(quest => 
                    quest.turnCreated && turnCounter && (turnCounter - quest.turnCreated) <= 5
                  );
                  
                  if (recentSideQuests.length > 0) {
                    // Đánh dấu quest này đã được xử lý để tránh tạo lại
                    processedQuests.add(questId);
                    shouldCreateQuest = false;
                  }
                }
                
                if (shouldCreateQuest) {
                  // Đảm bảo questOffer có cấu trúc đúng
                  const validQuestOffer = {
                    title: response.sideQuestOffer.title,
                    description: response.sideQuestOffer.description || 'Mô tả quest sẽ được cập nhật sau',
                    objectives: response.sideQuestOffer.objectives || [],
                    rewards: response.sideQuestOffer.rewards || [],
                    // Signature quest properties
                    isLocationSignature: response.sideQuestOffer.isLocationSignature || false,
                    signatureLocationId: response.sideQuestOffer.signatureLocationId || undefined,
                    signatureNPCId: response.sideQuestOffer.signatureNPCId || undefined
                  };
                  
                  // Hiển thị modal để người chơi chọn nhận/từ chối
                  setPendingQuestOffer(validQuestOffer);
                  setShowQuestOfferModal(true);
                }
              }
            }
          }
          
          // Xử lý completed objectives
          if (questAnalysis.completedObjectives.length > 0) {
            for (const { questId, objectiveId } of questAnalysis.completedObjectives) {
              completeObjective(questId, objectiveId, true);
            }
          }
        } catch (questError) {
          console.error('Lỗi quest system:', questError);
        }

        // Parse items from AI response and show selection modal
        try {
          // CHỈ parse items từ AI response hiện tại, không từ sceneState cũ
          const foundItems = inventoryService.parseItemsFromAIResponse(response);
          if (foundItems && foundItems.length > 0) {
            
            // Lọc bỏ items đã có trong character inventory
            const character = characterData ? JSON.parse(characterData) : null;
            const characterInventory = character?.inventory || [];
            const characterItemIds = new Set(characterInventory.map((item: any) => item.id));
            
            // Tạo Set để lọc theo tên + type (tránh trùng lặp theo tên)
            const characterItemKeys = new Set(characterInventory.map((item: any) => `${item.name}_${item.type}`));
            
            // Lọc theo cả ID và tên+type để đảm bảo không trùng lặp
            const newItems = foundItems.filter(item => {
              const itemKey = `${item.name}_${item.type}`;
              return !characterItemIds.has(item.id) && !characterItemKeys.has(itemKey);
            });
            
            if (newItems.length > 0) {
              setAvailableItems(newItems);
              setShowItemSelectionModal(true);
            }
          }
        } catch (itemError) {
          console.error('Lỗi xử lý items:', itemError);
        }

        // Update SCC context with AI message
        if (updatedSccContext) {
          // Sync SCC turnCounter with game turnCounter before adding AI message
          updatedSccContext.turnCounter = turnCounter;
          updatedSccContext = sccService.addTurn(updatedSccContext, aiMessage);
        }

        // Determine action duration
        let durationMinutes = 5; // Default for manual actions
        let isTravelAction = false; // Flag to identify travel actions
        
        // Check if this is a travel action
        if (currentMessage.trim().startsWith('Bạn di chuyển đến')) {
          isTravelAction = true;
        } else if (selectedSuggestionId) {
          const selectedSuggestion = actionSuggestions.find(s => s.id === selectedSuggestionId);
          if (selectedSuggestion) {
            durationMinutes = selectedSuggestion.durationMinutes;
          }
        } else {
          // Estimate duration from message content
          try {
            const context = actionSuggestionService.buildContextFromStorage();
            durationMinutes = await actionSuggestionService.estimateActionDuration(currentMessage.trim(), context, gameState.contentFlags || { adult_enabled: false, adult_intensity: 'fade' });
          } catch (error) {
            console.error('Error estimating action duration:', error);
          }
        }

        // Advance world time by minutes (skip for travel actions as time is already advanced in locationService.moveToLocation)
        let newTime = gameState.worldTime;
        if (!isTravelAction) {
          newTime = gameState.worldTime ? 
            worldTimeService.advanceMinutes(gameState.worldTime, durationMinutes) : 
            null;
        }

        // Increment turn counter after AI response
        setTurnCounter(prev => {
          const newCounter = prev + 1;
          localStorage.setItem('game_turn_counter', newCounter.toString());
          return newCounter;
        });

        // Removed automatic faction quest checking - now manual only

        // Ensure sceneState exists and is an object
        const aiSceneState = response.sceneState || {};
        
        // Update game state - đảm bảo inventory chỉ chứa items từ AI response hiện tại
        const newSceneState = { 
          ...gameState.sceneState, 
          ...aiSceneState, 
          worldTime: newTime,
          // CHỈ sử dụng inventory từ AI response hiện tại, không merge với cũ
          inventory: aiSceneState.inventory || []
        };
        
        
        setGameState(prev => ({
          ...prev,
          sceneState: newSceneState,
          storyProgress: response.storyProgress,
          worldTime: newTime,
          sccContext: updatedSccContext
        }));

        // Save updated time to localStorage
        if (newTime) {
          const worldDataParsed = JSON.parse(worldData);
          worldDataParsed.currentTime = newTime;
          localStorage.setItem('world_gen_result', JSON.stringify(worldDataParsed));
        }

        // Save sceneState to localStorage
        localStorage.setItem('rp_scene_state', JSON.stringify(newSceneState));

        // Log action (both from suggestions and manual input)
        if (gameState.worldTime && newTime) {
          let actionLogEntry: ActionLogEntry | null = null;
          
          if (selectedSuggestionId) {
            // Action from suggestion
            const selectedSuggestion = actionSuggestions.find(s => s.id === selectedSuggestionId);
            if (selectedSuggestion) {
              actionLogEntry = {
                id: `action_${Date.now()}`,
                actionId: selectedSuggestionId,
                text: currentMessage.trim(),
                summary: selectedSuggestion.summary,
                durationMinutes: durationMinutes,
                startedAt: gameState.worldTime,
                endedAt: newTime,
                turn: turnCounter + 1,
                impactTags: selectedSuggestion.impactTags,
                source: 'suggestion'
              };
            }
          } else {
            // Manual action - generate summary and estimate impact
            const actionSummary = await generateActionSummary(currentMessage.trim(), gameState);
            const impactTags = estimateImpactTags(currentMessage.trim());
            
            // For travel actions, use travel time instead of manual action time
            let finalDurationMinutes = durationMinutes;
            let finalEndedAt = newTime;
            
            if (isTravelAction) {
              // Get travel time from locationService
              const currentPlayerLocation = locationService.getCurrentLocation();
              if (currentPlayerLocation) {
                const locationName = currentMessage.trim().replace('Bạn di chuyển đến ', '').trim();
                const worldDataParsed = JSON.parse(worldData);
                const targetLocation = worldDataParsed.locations?.find((loc: any) => 
                  loc.name === locationName
                );
                
                if (targetLocation) {
                  const travelInfo = locationService.getTravelInfo(currentPlayerLocation.currentLocationId, targetLocation.id);
                  finalDurationMinutes = travelInfo.travelMinutes;
                  finalEndedAt = gameState.worldTime ? 
                    worldTimeService.advanceMinutes(gameState.worldTime, finalDurationMinutes) : 
                    gameState.worldTime!;
                  
                }
              }
            }
            
            actionLogEntry = {
              id: `action_${Date.now()}`,
              actionId: undefined,
              text: currentMessage.trim(),
              summary: actionSummary,
              durationMinutes: finalDurationMinutes,
              startedAt: gameState.worldTime,
              endedAt: finalEndedAt,
              turn: turnCounter + 1,
              impactTags: impactTags,
              source: isTravelAction ? 'travel' : 'manual'
            };
          }
          
          if (actionLogEntry) {
            actionSuggestionService.saveActionLog(actionLogEntry);
            setActionLog(prev => [actionLogEntry!, ...prev.slice(0, 99)]); // Keep last 100 entries
          }
        }

        // Clear selected suggestion
        setSelectedSuggestionId(null);

        // Process location travel if message contains travel action
        try {
          const travelMessage = currentMessage.trim();
          
          if (travelMessage.startsWith('Bạn di chuyển đến')) {
            // Extract location name from message
            const locationName = travelMessage.replace('Bạn di chuyển đến ', '').trim();
            
            // Find location by name
            const worldDataParsed = JSON.parse(worldData);
            const targetLocation = worldDataParsed.locations?.find((loc: any) => 
              loc.name === locationName
            );
            
            // Sử dụng locationService.getCurrentLocation() thay vì gameState.playerLocation
            const currentPlayerLocation = locationService.getCurrentLocation();
            
            if (targetLocation && currentPlayerLocation) {
              // Calculate travel time and update location
              const { newTime } = locationService.moveToLocation(
                targetLocation.id,
                gameState.worldTime!,
                turnCounter + 1
              );
              
              // Clear selected NPC when traveling to new location
              setSelectedNPCForDialogue(null);
              localStorage.removeItem('selectedNPCForDialogue');
              
              // Update game state with new location and time
              setGameState(prev => ({
                ...prev,
                worldTime: newTime,
                playerLocation: locationService.getCurrentLocation()
              }));
            }
          }
        } catch (travelError) {
          console.error('Lỗi xử lý di chuyển:', travelError);
        }

        // Process NPC relationships and character status from AI response
        try {
          // Parse NPCs from AI response
          npcRelationshipService.parseNPCsFromAIResponse(response, newSceneState.location);
          
          
          // Parse items from AI response
          inventoryService.parseItemsFromAIResponse(response);
          
          // Check if player is in a secondary location and needs signature NPC
          if (newSceneState.location) {
            const currentLocation = locationService.getLocationById(newSceneState.location);
            if (currentLocation && currentLocation.type === 'secondary') {
              // Check if this location already has a signature NPC
              if (!npcRelationshipService.hasSignatureNPCForLocation(currentLocation.id)) {
              } else {
                // Update location with signature NPC and quest info
                const signatureNPC = npcRelationshipService.getSignatureNPCForLocation(currentLocation.id);
                if (signatureNPC) {
                  currentLocation.signatureNPCId = signatureNPC.id;
                  if (signatureNPC.signatureQuestId) {
                    currentLocation.signatureQuestId = signatureNPC.signatureQuestId;
                  }
                  currentLocation.hasSignatureContent = true;
                }
              }
            }
          }
          
          // Link signature NPC with signature quest if both exist
          if (response.sideQuestOffer && response.sideQuestOffer.isLocationSignature && response.sideQuestOffer.signatureLocationId) {
            const signatureNPC = npcRelationshipService.getSignatureNPCForLocation(response.sideQuestOffer.signatureLocationId);
            if (signatureNPC) {
              // Update NPC with quest ID
              signatureNPC.signatureQuestId = response.sideQuestOffer.id || response.sideQuestOffer.title;
              npcRelationshipService.addOrUpdateRelationship(signatureNPC);
            }
          }
          
          // Parse character status from AI response
          npcRelationshipService.parseCharacterStatusFromAIResponse(response, newSceneState.location);
          
          // Process NPC relationships and generate action suggestions in parallel
          const parallelTasks = [];
          
          // NPC Analysis task
          if (response.narrative) {
            const enhancedContext = {
              chatHistory: finalChatHistory.slice(-10), // Last 10 messages for context
              sceneState: newSceneState,
              sccSummary: updatedSccContext?.summary,
              playerAction: currentMessage,
              contentFlags: gameState.contentFlags
            };
            
            parallelTasks.push(
              retryNPCAnalysis(
                response.narrative, 
                newSceneState.location, 
                enhancedContext
              ).catch(error => {
                console.error('Error processing NPC relationships:', error);
              })
            );
          }

          // Action Suggestions task
          parallelTasks.push(
            loadActionSuggestions().catch(error => {
              console.error('Error loading action suggestions:', error);
            })
          );

          // Run both tasks in parallel
          await Promise.all(parallelTasks);

        } catch (error) {
          console.error('Error processing NPC relationships:', error);
        }

        // Save SCC context
        if (updatedSccContext) {
          // Update sceneState in SCC context before saving
          updatedSccContext.sceneState = newSceneState;
          sccService.saveSCCContext(updatedSccContext);
        }

        // Handle summarization if needed
        if (shouldSummarize && updatedSccContext) {
          await handleSummarization(updatedSccContext, worldData, characterData, scenarioData);
        }
        
        // Clear backup suggestions sau khi AI response thành công
        setBackupSuggestions([]);
      } else {
        // BẢO VỆ KÉP: Đảm bảo không có gì được update khi AI response không thành công
        console.error('🚫 AI response failed - skipping ALL game updates to prevent corruption');
        
        // Khôi phục gợi ý hành động cũ khi AI response bị lỗi
        if (backupSuggestions.length > 0) {
          setActionSuggestions([...backupSuggestions]);
          actionSuggestionService.saveCurrentSuggestions(backupSuggestions);
        }
      }

    } catch (error) {
      console.error('🚫 Lỗi gửi tin nhắn:', {
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Có lỗi xảy ra',
        errorStack: error instanceof Error ? error.stack : undefined,
        aiResponseSuccess: aiResponseSuccess,
        currentMessage: currentMessage,
        turnCounter: turnCounter
      });
      
      // Kiểm tra nếu đây là lỗi từ thông báo lỗi cụ thể
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      if (errorMessage.includes('PHÁT HIỆN THÔNG BÁO LỖI CỤ THỂ')) {
        setError('Xin lỗi, có lỗi xảy ra khi xử lý phản hồi từ AI. Vui lòng thử lại.');
      } else {
        setError(errorMessage);
      }
      
      // QUAN TRỌNG: Khi có lỗi, KHÔNG CẬP NHẬT BẤT KỲ STATE NÀO
      // Đảm bảo aiResponseSuccess = false để ngăn mọi update
      aiResponseSuccess = false;
      
      // Khôi phục gợi ý hành động cũ khi có lỗi
      if (backupSuggestions.length > 0) {
        setActionSuggestions([...backupSuggestions]);
        actionSuggestionService.saveCurrentSuggestions(backupSuggestions);
      }
      
      // KHÔNG CẬP NHẬT BẤT KỲ THỨ GÌ KHÁC:
      // - Không update chatHistory
      // - Không update gameState
      // - Không update turnCounter
      // - Không update sceneState
      // - Không update SCC context
      // - Không update NPC relationships
      // - Không update quest system
      // - Không update world time
      // - Không save to localStorage
    } finally {
      setIsLoading(false);
      setIsAIProcessing(false);
      
      // CHỈ clear backup suggestions khi AI response THÀNH CÔNG
      if (aiResponseSuccess && backupSuggestions.length > 0) {
        setBackupSuggestions([]);
      }
    }
  };

  const handleSummarization = async (
    sccContext: SCCContext, 
    worldData: string, 
    characterData: string, 
    scenarioData: string,
    retryCount: number = 0
  ) => {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    try {
      // Create backup before summarizing (only on first attempt)
      if (retryCount === 0) {
        sccService.createSummaryBackup(sccContext.summary);
      }
      
      // Get recent turns for summarization
      const recentTurns = sccContext.recentTurns.slice(-40).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Call Gemini to summarize
      const summaryResult = await geminiService.summarizeChatContext(
        worldData,
        characterData,
        scenarioData,
        sccContext.summary,
        sccContext.sceneState,
        recentTurns
      );
      
      // Update SCC context with new summary
      const updatedContext = sccService.updateContextAfterSummary(
        sccContext,
        summaryResult.summary,
        summaryResult.sceneState
      );
      
      // Update game state
      setGameState(prev => ({
        ...prev,
        sceneState: summaryResult.sceneState,
        sccContext: updatedContext,
        showSummaryBanner: true,
        lastSummaryTurn: updatedContext.turnCounter
      }));
      
      // Save updated context
      sccService.saveSCCContext(updatedContext);
      
      // Save indexed summary for delta context system
      // Lưu summary với turn hiện tại (turnCounter) thay vì làm tròn xuống 20
      sccService.saveIndexedSummary(turnCounter, summaryResult.summary, summaryResult.sceneState);
      
      // Save sceneState to localStorage
      localStorage.setItem('rp_scene_state', JSON.stringify(summaryResult.sceneState));
      
      // Clean up old chat history to save memory
      sccService.cleanupOldChatHistory(turnCounter);
      
    } catch (error) {
      console.error(`❌ Error during summarization (Attempt ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Recursive retry
        return handleSummarization(sccContext, worldData, characterData, scenarioData, retryCount + 1);
      } else {
        console.error('❌ Summarization failed after all retries. Continuing without summarization.');
        
        // Show error notification but continue game
        setError('Không thể tóm tắt ngữ cảnh. Game sẽ tiếp tục nhưng có thể chậm hơn.');
        
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
        
        // Mark this turn as summarized to prevent infinite retry loops
        setGameState(prev => ({
          ...prev,
          lastSummaryTurn: sccContext.turnCounter
        }));
      }
    }
  };


  const handleUndoSummary = () => {
    const backupSummary = sccService.restoreSummaryFromBackup();
    if (backupSummary && gameState.sccContext) {
      const updatedContext = {
        ...gameState.sccContext,
        summary: backupSummary
      };
      
      setGameState(prev => ({
        ...prev,
        sccContext: updatedContext,
        showSummaryBanner: false
      }));
      
      sccService.saveSCCContext(updatedContext);
    }
  };

  const handleDismissBanner = () => {
    setGameState(prev => ({
      ...prev,
      showSummaryBanner: false
    }));
  };

  // Save game to slot
  const handleSaveGame = async (slotId: 'slot1' | 'slot2' | 'slot3' | 'local1' | 'local2' | 'local3') => {
    // Kiểm tra nếu đang có tiến trình xử lý nào đang chạy
    if (isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions) {
      setSaveMessage('❌ Không thể lưu game khi đang xử lý. Vui lòng đợi hoàn tất.');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    try {
      setSaveMessage(null);

      // Load services trước khi sử dụng
      await loadServices();

      // Get current game data
      const worldData = localStorage.getItem('world_gen_result');
      const characterData = localStorage.getItem('currentCharacter');
      const scenarioData = localStorage.getItem('rp_scenario');
      const sccData = localStorage.getItem('rp_summary_indexed');
      const sceneState = localStorage.getItem('rp_scene_state');
      const questSystemData = localStorage.getItem('quest_system');
      const playerLocationData = localStorage.getItem('player_location');
      const savedTurnCounter = parseInt(localStorage.getItem('game_turn_counter') || '0', 10);

      if (!worldData || !characterData || !scenarioData) {
        setSaveMessage('Không có dữ liệu game để lưu');
        return;
      }

      // Create SaveGame object
      const worldParsed = JSON.parse(worldData);
      const characterParsed = JSON.parse(characterData);
      
      
      // Get current NPC relationship data
      const npcRelationshipData = npcRelationshipService.exportForSaveGame();

      const saveGame: SaveGame = {
        version: '2.6.0',
        meta: {
          slotId,
          updatedAt: Date.now(),
          source: 'local',
          pendingSync: true
        },
        world: worldParsed,
        character: characterParsed,
        scenario: JSON.parse(scenarioData),
        summary: sccData ? JSON.parse(sccData) : { content: '', sceneState: {} },
        sceneState: sceneState ? JSON.parse(sceneState) : {},
        chat: chatHistory,
        turnCounter: savedTurnCounter,
        worldTime: gameState.worldTime || { day: 1, hour: 12, minute: 0, month: 1, year: 1, dayOfWeek: 1 },
        questSystem: questSystemData ? JSON.parse(questSystemData) : undefined,
        npcRelationships: npcRelationshipData,
        ui: { showSummaryBanner: gameState.showSummaryBanner, lastSummaryTurn: gameState.lastSummaryTurn },
        contentFlags: gameState.contentFlags || { adult_enabled: false, adult_intensity: 'fade', first_time_setup: true },
        actionSuggestions: actionSuggestions,
        actionLog: actionLog,
        playerLocation: playerLocationData ? JSON.parse(playerLocationData) : undefined
      };

      // Determine if it's a local or cloud slot
      const isLocalSlot = slotId.startsWith('local');
      const actualSlotId = isLocalSlot ? slotId : slotId;

      // Update SaveGame metadata based on slot type
      const updatedSaveGame: SaveGame = {
        ...saveGame,
        meta: {
          ...saveGame.meta,
          slotId: actualSlotId,
          source: isLocalSlot ? 'local' : 'cloud',
          pendingSync: isLocalSlot ? true : false
        }
      };

      let result;
      
      if (isLocalSlot) {
        // Save to local storage
        result = await localSaveService.saveGame(
          actualSlotId as any,
          updatedSaveGame.world,
          updatedSaveGame.character,
          updatedSaveGame.scenario,
          updatedSaveGame.summary,
          updatedSaveGame.sceneState,
          updatedSaveGame.chat,
          updatedSaveGame.turnCounter,
          updatedSaveGame.worldTime,
          updatedSaveGame.questSystem,
          updatedSaveGame.ui,
          updatedSaveGame.contentFlags,
          actionSuggestions,
          actionLog,
          updatedSaveGame.playerLocation
        );
      } else {
        // Save to cloud
        const cloudResult = await cloudSyncService.saveToCloud(actualSlotId as any, updatedSaveGame);
        result = {
          success: cloudResult.success,
          error: cloudResult.error
        };
      }

      if (result.success) {
        const source = isLocalSlot ? 'Local' : 'Cloud';
        setSaveMessage(`✅ Đã lưu vào slot ${slotId} (${source})`);
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage(`❌ Lỗi: ${result.error}`);
      }
    } catch (error) {
      setSaveMessage(`❌ Lỗi khi lưu game: ${error}`);
    } finally {
      // Loading state is handled in SavePopup
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quest offer modal handlers
  const handleAcceptQuestOffer = async () => {
    if (!pendingQuestOffer) return;
    
    try {
      const worldData = localStorage.getItem('world_gen_result');
      const characterData = localStorage.getItem('currentCharacter');
      
      if (worldData && characterData) {
        const newSideQuest = await generateSideQuestFromAI('', {
          worldData: JSON.parse(worldData),
          characterData: JSON.parse(characterData),
          currentTurn: turnCounter,
          sideQuestOffer: pendingQuestOffer
        }, turnCounter);
        
        if (newSideQuest) {
          // Đánh dấu quest đã được xử lý
          const questId = pendingQuestOffer.id || pendingQuestOffer.title;
          setProcessedQuests(prev => new Set([...prev, questId]));
          
          // Tự động điền chat input
          setCurrentMessage(`Tôi chấp nhận nhiệm vụ "${pendingQuestOffer.title}".`);
        }
      }
    } catch (error) {
      console.error('Lỗi khi chấp nhận side quest:', error);
    } finally {
      // Reset modal state sau khi xử lý xong
      setShowQuestOfferModal(false);
      setPendingQuestOffer(null);
    }
  };

  const handleDeclineQuestOffer = () => {
    if (!pendingQuestOffer) return;
    
    // Đánh dấu quest đã được xử lý
    const questId = pendingQuestOffer.id || pendingQuestOffer.title;
    setProcessedQuests(prev => new Set([...prev, questId]));
    
    // Tự động điền chat input
    setCurrentMessage(`Tôi từ chối nhiệm vụ "${pendingQuestOffer.title}".`);
    
    setShowQuestOfferModal(false);
    setPendingQuestOffer(null);
  };

  // Handle skip time
  const handleSkipTime = () => {
    if (!gameState.worldTime) return;
    
    // Add hours to current time
    const newTime = worldTimeService.advanceTime(gameState.worldTime, skipHours);
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      worldTime: newTime
    }));
    
    // Close modal and reset
    setShowSkipTimeModal(false);
    setSkipHours(2);
    
    // Show success message
    setSaveMessage(`Đã nghỉ ngơi ${skipHours} giờ. Thời gian hiện tại: ${newTime.hour}:${newTime.minute.toString().padStart(2, '0')}`);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Xử lý load game từ SaveManager
  const handleLoadGame = async (saveGame: SaveGame) => {
    try {
      // Load services trước khi sử dụng
      await loadServices();
      
      // Clear existing NPC data before loading save
      npcRelationshipService.clearAllData();
      
      // Clear existing player location before loading save
      localStorage.removeItem('player_location');
      
      // Clear selected NPC for dialogue
      setSelectedNPCForDialogue(null);
      localStorage.removeItem('selectedNPCForDialogue');
      
      // Cập nhật game state từ SaveGame
      setGameState({
        scenarioSkeleton: saveGame.scenario,
        sceneState: saveGame.sceneState,
        storyProgress: null, // Có thể cần thêm logic để restore
        isInitialized: true,
        worldTime: saveGame.worldTime,
        sccContext: {
          summary: saveGame.summary,
          sceneState: saveGame.sceneState,
          recentTurns: saveGame.chat,
          turnCounter: saveGame.turnCounter
        },
        showSummaryBanner: saveGame.ui?.showSummaryBanner || false,
        lastSummaryTurn: saveGame.ui?.lastSummaryTurn || 0,
        contentFlags: saveGame.contentFlags || { adult_enabled: false, adult_intensity: 'fade', first_time_setup: true },
        playerLocation: saveGame.playerLocation || null
      });

      // Cập nhật chat history và turn counter
      setChatHistory(saveGame.chat);
      setTurnCounter(saveGame.turnCounter);
      
      // Clear action suggestions and backup
      setActionSuggestions([]);
      setBackupSuggestions([]);
      setActionLog([]);
      setSelectedSuggestionId(null);
      setHasLoadedSuggestions(false);
      

      // Cập nhật localStorage để tương thích với hệ thống cũ
      localStorage.setItem('rp_chat', JSON.stringify(saveGame.chat));
      localStorage.setItem('rp_scenario', JSON.stringify(saveGame.scenario));
      localStorage.setItem('game_turn_counter', saveGame.turnCounter.toString());
      localStorage.setItem('world_gen_result', JSON.stringify(saveGame.world));
      localStorage.setItem('currentCharacter', JSON.stringify(saveGame.character));
      
      // Khôi phục quest system nếu có
      if (saveGame.questSystem) {
        localStorage.setItem('quest_system', JSON.stringify(saveGame.questSystem));
      }
      
      // Khôi phục NPC relationship data nếu có
      if (saveGame.npcRelationships) {
        npcRelationshipService.importFromSaveGame(saveGame.npcRelationships);
      }
      
      // Khôi phục player location nếu có
      if (saveGame.playerLocation) {
        locationService.savePlayerLocation(saveGame.playerLocation);
      }
      
      // KHÔNG lưu contentFlags vào localStorage riêng biệt
      // ContentFlags chỉ được lưu trong SaveGame JSON

      // Cập nhật SCC context
      if (gameState.sccContext) {
        sccService.saveSCCContext(gameState.sccContext);
      }

    } catch (error) {
      console.error('❌ Lỗi load game:', error);
      setError('Lỗi tải game');
    }
  };

  // Lấy dữ liệu game hiện tại cho SaveManager
  const getCurrentGameData = () => {
    return {
      worldData: gameState.worldTime ? JSON.parse(localStorage.getItem('world_gen_result') || '{}') : null,
      characterData: JSON.parse(localStorage.getItem('currentCharacter') || '{}'),
      scenarioData: gameState.scenarioSkeleton,
      summaryData: gameState.sccContext?.summary || {
        recap: '',
        timeline: [],
        clues: [],
        openThreads: [],
        relationships: [],
        goals: [],
        risks: []
      },
      sceneStateData: gameState.sceneState,
      chatData: chatHistory,
      turnCounter: turnCounter,
      worldTime: gameState.worldTime,
      uiState: {
        showSummaryBanner: gameState.showSummaryBanner,
        lastSummaryTurn: gameState.lastSummaryTurn
      },
      contentFlags: gameState.contentFlags,
      playerLocation: gameState.playerLocation
    };
  };

  // Handle content flags change
  const handleContentFlagsChange = (newFlags: ContentFlags) => {
    setGameState(prev => ({
      ...prev,
      contentFlags: newFlags
    }));
    
    // Cập nhật vào world_gen_result (dữ liệu chính thức)
    const worldGenResult = localStorage.getItem('world_gen_result');
    if (worldGenResult) {
      try {
        const worldData = JSON.parse(worldGenResult);
        worldData.contentFlags = newFlags;
        localStorage.setItem('world_gen_result', JSON.stringify(worldData));
      } catch (error) {
        console.error('❌ Error updating contentFlags in world_gen_result:', error);
      }
    }
    
    // Cập nhật vào currentWorldData để persist
    const currentWorldData = localStorage.getItem('currentWorldData');
    if (currentWorldData) {
      try {
        const worldData = JSON.parse(currentWorldData);
        worldData.contentFlags = newFlags;
        localStorage.setItem('currentWorldData', JSON.stringify(worldData));
      } catch (error) {
        console.error('❌ Error updating contentFlags in currentWorldData:', error);
      }
    }
  };

  // Toggle adult content
  const toggleAdultContent = () => {
    if (!gameState.contentFlags) return;
    
    const newFlags: ContentFlags = {
      ...gameState.contentFlags,
      adult_enabled: !gameState.contentFlags.adult_enabled,
      adult_intensity: !gameState.contentFlags.adult_enabled ? 'direct_safe' : 'fade'
    };
    
    handleContentFlagsChange(newFlags);
  };

  // Handle item selection from modal
  const handleSelectItems = (selectedItems: InventoryItem[]) => {
    try {
      inventoryService.addSelectedItems(selectedItems);
      
      // Update character in localStorage
      const characterData = localStorage.getItem('currentCharacter');
      if (characterData) {
        const character = JSON.parse(characterData);
        character.inventory = inventoryService.getInventory();
        character.equipment = inventoryService.getEquipment();
        character.equipped_stats_bonuses = inventoryService.getEquippedStatsBonuses();
        localStorage.setItem('currentCharacter', JSON.stringify(character));
        
        // Reload character data from localStorage to update UI
        const reloadedCharacterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
        setGameState(prev => ({
          ...prev,
          character: reloadedCharacterData
        }));
      }
      
      // Close modal and clear items
      setShowItemSelectionModal(false);
      setAvailableItems([]);
    } catch (error) {
      console.error('Lỗi khi thêm items:', error);
    }
  };


  // Toggle adult intensity
  const toggleAdultIntensity = () => {
    if (!gameState.contentFlags || !gameState.contentFlags.adult_enabled) return;
    
    const newIntensity = gameState.contentFlags.adult_intensity === 'direct_safe' ? 'direct' : 'direct_safe';
    const newFlags: ContentFlags = {
      ...gameState.contentFlags,
      adult_intensity: newIntensity
    };
    
    handleContentFlagsChange(newFlags);
  };

  // Handle location travel
  const handleLocationTravel = (locationId: string) => {
    // Nếu đã chọn location này rồi thì hủy chọn
    if (selectedTravelLocationId === locationId && isTravelActionSelected) {
      setIsTravelActionSelected(false);
      setSelectedTravelLocationId(null);
      setCurrentMessage('');
      return;
    }
    
    // Sử dụng locationService.getCurrentLocation() thay vì gameState.playerLocation
    const currentPlayerLocation = locationService.getCurrentLocation();
    
    if (!gameState.worldTime || !currentPlayerLocation) {
      return;
    }
    
    const location = locationService.getLocationById(locationId);
    if (!location) {
      return;
    }
    
    // Generate travel message
    const travelMessage = locationService.generateTravelMessage(locationId);
    
    if (travelMessage) {
      setCurrentMessage(travelMessage);
      setIsTravelActionSelected(true);
      setSelectedTravelLocationId(locationId);
      
      // Clear suggestion selection nếu có
      if (selectedSuggestionId) {
        setSelectedSuggestionId(null);
      }
      
      // Focus vào input box
      setTimeout(() => {
        const inputElement = document.querySelector('textarea[placeholder*="Mô tả hành động"]') as HTMLTextAreaElement;
        if (inputElement) {
          inputElement.focus();
        }
      }, 100);
    }
  };

  // Resend message - copy message content to input box
  const handleResendMessage = (messageContent: string, messageIndex: number) => {
    if (isLoading) return; // Không cho resend khi đang loading
    
    // Haptic feedback for mobile (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration
    }
    
    // Visual feedback
    setResendingMessageIndex(messageIndex);
    setTimeout(() => setResendingMessageIndex(null), 1000);
    
    setCurrentMessage(messageContent);
    
    // Focus vào textarea để người dùng có thể chỉnh sửa nếu cần
    setTimeout(() => {
      textareaRef.current?.focus();
      // Đặt cursor ở cuối text
      if (textareaRef.current) {
        const length = messageContent.length;
        textareaRef.current.setSelectionRange(length, length);
      }
    }, 100);
  };

  // Toggle resend button visibility on mobile
  const handleMessageTap = (messageIndex: number, messageRole: string) => {
    if (messageRole !== 'player') return;
    
    // Only on mobile (no hover capability)
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!isMobile) return;
    
    if (showResendButton === messageIndex) {
      setShowResendButton(null); // Hide if already showing
    } else {
      setShowResendButton(messageIndex); // Show for this message
    }
  };

  // Inventory handlers
  const handleEquipItem = (itemId: string, slot?: string) => {
    const success = inventoryService.equipItem(itemId, slot);
    if (success) {
      // Update character data in localStorage
      const updatedInventory = inventoryService.getInventory();
      const updatedEquipment = inventoryService.getEquipment();
      
      try {
        const characterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
        characterData.inventory = updatedInventory;
        characterData.equipment = updatedEquipment;
        characterData.equipped_stats_bonuses = inventoryService.getEquippedStatsBonuses();
        localStorage.setItem('currentCharacter', JSON.stringify(characterData));
        
        // Reload character data from localStorage to update UI
        const reloadedCharacterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
        setGameState(prev => ({
          ...prev,
          character: reloadedCharacterData
        }));
      } catch (error) {
        console.error('Failed to update character data:', error);
      }
    }
  };

  const handleUnequipItem = (itemId: string) => {
    const success = inventoryService.unequipItem(itemId);
    if (success) {
      // Update character data in localStorage
      const updatedInventory = inventoryService.getInventory();
      const updatedEquipment = inventoryService.getEquipment();
      
      try {
        const characterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
        characterData.inventory = updatedInventory;
        characterData.equipment = updatedEquipment;
        characterData.equipped_stats_bonuses = inventoryService.getEquippedStatsBonuses();
        localStorage.setItem('currentCharacter', JSON.stringify(characterData));
        
        // Reload character data from localStorage to update UI
        const reloadedCharacterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
        setGameState(prev => ({
          ...prev,
          character: reloadedCharacterData
        }));
      } catch (error) {
        console.error('Failed to update character data:', error);
      }
    }
  };

  const handleDropItem = (itemId: string) => {
    // Check if item is equipped
    const item = inventoryService.findItemInInventory(itemId);
    if (!item) return;
    
    let confirmMessage = 'Bạn có chắc chắn muốn vứt bỏ vật phẩm này?';
    if (item.isEquipped) {
      confirmMessage = `Vật phẩm "${item.name}" đang được trang bị. Vứt bỏ sẽ tự động gỡ trang bị. Bạn có chắc chắn muốn tiếp tục?`;
    }
    
    if (confirm(confirmMessage)) {
      const success = inventoryService.removeItem(itemId);
      if (success) {
        // Update character data in localStorage
        const updatedInventory = inventoryService.getInventory();
        const updatedEquipment = inventoryService.getEquipment();
        
        try {
          const characterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
          characterData.inventory = updatedInventory;
          characterData.equipment = updatedEquipment;
          characterData.equipped_stats_bonuses = inventoryService.getEquippedStatsBonuses();
          localStorage.setItem('currentCharacter', JSON.stringify(characterData));
          
          // Reload character data from localStorage to update UI
          const reloadedCharacterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
          setGameState(prev => ({
            ...prev,
            character: reloadedCharacterData
          }));
          
          // Show success message
          if (item.isEquipped) {
          } else {
          }
        } catch (error) {
          console.error('Failed to update character data:', error);
        }
      }
    }
  };

  const handleViewItemDetails = (_item: InventoryItem) => {
    // TODO: Implement item details modal
  };

  // Memoize InfoMenu data để tránh re-parse mỗi lần render
  const infoMenuData = useMemo(() => {
    let worldData = null;
    let characterData: any = {};
    
    if (gameState.worldTime) {
      try {
        worldData = JSON.parse(localStorage.getItem('world_gen_result') || '{}');
      } catch {
        worldData = null;
      }
    }
    
    try {
      characterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
    } catch {
      characterData = {};
    }
    
    return { worldData, characterData };
  }, [gameState.worldTime, characterDataUpdate]); // Re-calculate khi worldTime hoặc character data thay đổi

  if (!gameState.isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <MotionWrapper
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect p-8 rounded-2xl max-w-md w-full text-center"
        >
          <h1 className="text-2xl font-bold-vietnamese text-white mb-4 uppercase">
            BẮT ĐẦU CUỘC PHIÊU LƯU
          </h1>
          <p className="text-gray-300 mb-6">
            AI sẽ tạo kịch bản dựa trên thế giới và nhân vật của bạn
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-800 border border-red-500 rounded-lg">
              <div className="flex items-center space-x-2 text-red-300">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <button
            onClick={initializeGame}
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 border border-blue-500 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang tạo kịch bản...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Bắt Đầu</span>
              </>
            )}
          </button>
        </MotionWrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Fixed Header Section */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black">
        {/* Summary Banner */}
        {gameState.showSummaryBanner && (
          <MotionWrapper
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-600 border-b border-blue-500 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-blue-300">
                <FileText className="w-4 h-4" />
                <span>Đã tóm tắt ngữ cảnh (Lượt {turnCounter})</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleUndoSummary}
                  className="px-2 py-1 bg-yellow-600 border border-yellow-500 text-white rounded text-xs hover:bg-yellow-700 transition-colors duration-200"
                  title="Hoàn tác tóm tắt"
                >
                  <Undo2 className="w-3 h-3" />
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="px-2 py-1 bg-gray-600 border border-gray-500 text-white rounded text-xs hover:bg-gray-700 transition-colors duration-200"
                  title="Đóng"
                >
                  ×
                </button>
              </div>
            </div>
          </MotionWrapper>
        )}

        {/* Icon-only Header Menu */}
        <div className="glass-effect border-b border-gray-800 p-2 mobile-padding">
          <div className="flex items-center justify-between">
            {/* World Time & Turn Counter Display - Only on desktop */}
            {!shouldUseMobileLayout() && (
              <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-300 mobile-text">
              {/* World Time */}
              {gameState.worldTime && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{worldTimeService.formatShortTime(gameState.worldTime)}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">{worldTimeService.getTimeOfDay(gameState.worldTime)}</span>
                </div>
              )}
              
              {/* Turn Counter */}
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Lượt {turnCounter}</span>
              </div>

              {/* Adult Content Status - Clickable */}
              {gameState.contentFlags && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">•</span>
                  <button
                    onClick={gameState.contentFlags.adult_enabled ? toggleAdultIntensity : toggleAdultContent}
                    className="flex items-center space-x-1 hover:bg-gray-900 px-2 py-1 rounded transition-colors"
                    title={gameState.contentFlags.adult_enabled 
                      ? "Click để thay đổi mức độ nội dung" 
                      : "Click để bật nội dung 18+"
                    }
                  >
                    {gameState.contentFlags.adult_enabled ? (
                      gameState.contentFlags.adult_intensity === 'direct' ? (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-orange-400" />
                      )
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={`text-xs font-medium ${
                      gameState.contentFlags.adult_enabled
                        ? gameState.contentFlags.adult_intensity === 'direct' 
                          ? 'text-red-300' 
                          : 'text-orange-300'
                        : 'text-gray-400'
                    }`}>
                      {gameState.contentFlags.adult_enabled 
                        ? `18+ ${gameState.contentFlags.adult_intensity === 'direct' ? 'Tả thực' : 'An toàn'}`
                        : '18+ OFF'
                      }
                    </span>
                  </button>
                  {/* Toggle ON/OFF button */}
                  {gameState.contentFlags.adult_enabled && (
                    <button
                      onClick={toggleAdultContent}
                      className="text-xs text-gray-400 hover:text-gray-300 px-1"
                      title="Tắt nội dung 18+"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
              </div>
            )}
            
            
            {/* Action Buttons */}
            <div className={`flex items-center space-x-1 sm:space-x-2 transition-all duration-300 ${
              isInfoMenuPinned && !shouldUseMobileLayout() ? 'mr-96' : ''
            } ${shouldUseMobileLayout() ? 'flex-1 justify-start' : ''}`}>
              {/* Info Menu Button */}
              <button
                onClick={() => {
                  if (isInfoMenuPinned) {
                    // Nếu đã ghim, bỏ ghim và đóng menu
                    setIsInfoMenuPinned(false);
                    setShowInfoMenu(false);
                  } else {
                    // Nếu chưa ghim, mở menu
                    setShowInfoMenu(true);
                  }
                }}
                className={`p-2 border rounded-lg transition-colors duration-200 mobile-button touch-feedback ${
                  isInfoMenuPinned 
                    ? 'bg-blue-900 border-blue-700 text-blue-100' 
                    : 'bg-blue-800 border-blue-700 text-white hover:bg-blue-900'
                }`}
                title={isInfoMenuPinned ? "Bỏ ghim menu" : "Thông tin game"}
              >
                <Info className="w-4 h-4" />
              </button>
              {/* Action Log Button */}
              <button
                onClick={() => setShowActionLog(true)}
                className="p-2 bg-purple-800 border border-purple-700 text-white rounded-lg hover:bg-purple-900 transition-colors duration-200 mobile-button touch-feedback"
                title="Lịch sử hành động"
              >
                <History className="w-4 h-4" />
              </button>
              {/* Skip Time Button */}
              <button
                onClick={() => setShowSkipTimeModal(true)}
                disabled={isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions}
                className={`p-2 border rounded-lg transition-colors duration-200 mobile-button touch-feedback ${
                  isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions
                    ? 'bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-800 border-purple-700 text-white hover:bg-purple-900'
                }`}
                title={
                  isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions
                    ? "Đang xử lý, không thể skip thời gian"
                    : "Nghỉ ngơi/Skip thời gian (2-8h)"
                }
              >
                <Moon className="w-4 h-4" />
              </button>
              {/* Save Button */}
              <button
                onClick={() => setShowSavePopup(true)}
                disabled={isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions}
                className={`p-2 border rounded-lg transition-colors duration-200 mobile-button touch-feedback ${
                  isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions
                    ? 'bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-green-800 border-green-700 text-white hover:bg-green-900'
                }`}
                title={
                  isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions
                    ? "Đang xử lý, không thể lưu game"
                    : "Lưu game"
                }
              >
                <Save className="w-4 h-4" />
              </button>
              
              {/* Combat Test Button */}
              <button
                onClick={() => navigate('/combat')}
                disabled={isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions}
                className={`p-2 border rounded-lg transition-colors duration-200 mobile-button touch-feedback ${
                  isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions
                    ? 'bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-red-800 border-red-700 text-white hover:bg-red-900'
                }`}
                title={
                  isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions
                    ? "Đang xử lý, không thể vào combat"
                    : "Test Combat System"
                }
              >
                <Sword className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Chat Area */}
      <div className="flex-1 flex flex-col pt-20 pb-32">
        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 transition-all duration-300 mobile-padding smooth-scroll will-change-scroll ${
          isInfoMenuPinned && !shouldUseMobileLayout() ? 'mr-96' : ''
        }`}>
          {chatHistory.map((message, index) => (
            <MotionWrapper
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'player' ? 'justify-end' : 'justify-start'} gpu-accelerated`}
            >
              <div className={`relative group ${message.role === 'player' ? 'flex items-start space-x-2' : ''}`}>
                {/* Resend button for player messages */}
                {message.role === 'player' && (
                  <button
                    onClick={() => handleResendMessage(message.content, index)}
                    disabled={isLoading}
                    className={`mt-1 p-2 md:p-1.5 rounded-md transition-all duration-200 min-w-[40px] min-h-[40px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center ${
                      resendingMessageIndex === index
                        ? 'opacity-100 bg-green-800 text-green-100'
                        : showResendButton === index 
                          ? 'opacity-100' 
                          : 'opacity-70 md:opacity-0 md:group-hover:opacity-100'
                    } ${
                      isLoading 
                        ? 'text-gray-500 cursor-not-allowed' 
                        : 'text-blue-400 hover:text-blue-300 hover:bg-blue-800 active:bg-blue-900'
                    } touch-manipulation`}
                    title={
                      resendingMessageIndex === index 
                        ? 'Đã copy vào ô chat!' 
                        : isLoading 
                          ? 'Đang xử lý...' 
                          : 'Gửi lại tin nhắn này'
                    }
                  >
                    <RefreshCw className={`w-4 h-4 ${
                      isLoading ? 'animate-spin' : 
                      resendingMessageIndex === index ? 'text-green-400' : ''
                    }`} />
                  </button>
                )}
                
                <div
                  className={`max-w-3xl px-3 sm:px-4 py-3 rounded-lg cursor-pointer md:cursor-default mobile-padding ${
                    message.role === 'player'
                      ? 'bg-blue-800 border border-blue-700 text-blue-100'
                      : 'bg-gray-900 border border-gray-800 text-gray-100'
                  }`}
                  onClick={() => handleMessageTap(index, message.role)}
                >
                  <div className="leading-relaxed">
                    <DialogueRenderer 
                      content={message.content} 
                      isPlayer={message.role === 'player'} 
                    />
                  </div>
                </div>
              </div>
            </MotionWrapper>
          ))}
          
          {isLoading && !isStreaming && (
            <MotionWrapper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-gray-900 border border-gray-800 text-gray-100 px-4 py-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI đang suy nghĩ...</span>
                </div>
              </div>
            </MotionWrapper>
          )}

          {/* Streaming narrative display */}
          {isStreaming && streamingNarrative && (
            <MotionWrapper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-gray-900 border border-gray-800 text-gray-100 px-4 py-3 rounded-lg max-w-3xl">
                <div className="flex items-center space-x-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-400">AI đang viết...</span>
                </div>
                <div className="leading-relaxed">
                  <DialogueRenderer 
                    content={streamingNarrative} 
                    isPlayer={false} 
                  />
                  <span className="animate-pulse">|</span>
                </div>
              </div>
            </MotionWrapper>
          )}

          {/* NPC Analysis indicator */}
          {isNPCAnalysisProcessing && (
            <MotionWrapper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-yellow-800 border border-yellow-700 text-yellow-100 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-sm">Phân tích quan hệ NPC...</span>
                </div>
              </div>
            </MotionWrapper>
          )}
          
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black">
        {/* Error Display */}
        {error && (
          <div className={`mx-4 mb-2 p-3 bg-red-800 border border-red-500 rounded-lg transition-all duration-300 ${
            isInfoMenuPinned && !shouldUseMobileLayout() ? 'mr-96' : ''
          }`}>
            <div className="flex items-center space-x-2 text-red-300">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Save Message Display */}
        {saveMessage && (
          <div className={`mx-4 mb-2 p-3 bg-green-800 border border-green-500 rounded-lg transition-all duration-300 ${
            isInfoMenuPinned && !shouldUseMobileLayout() ? 'mr-96' : ''
          }`}>
            <div className="flex items-center space-x-2 text-green-300">
              <Save className="w-4 h-4" />
              <span className="text-sm">{saveMessage}</span>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className={`glass-effect border-t border-gray-800 p-3 sm:p-4 mobile-padding transition-all duration-300 ${
          isInfoMenuPinned && !shouldUseMobileLayout() ? 'mr-96' : ''
        }`}>
          {/* Action Suggestions */}
          <Suspense fallback={<div className="mb-4 h-20 bg-gray-900 rounded-lg animate-pulse"></div>}>
            <ActionSuggestions
              suggestions={actionSuggestions}
              onPick={handleSuggestionPick}
              isLoading={isGeneratingSuggestions}
              isMobile={shouldUseMobileLayout()}
              isCollapsed={isSuggestionsCollapsed}
              onToggleCollapse={toggleSuggestionsCollapse}
              selectedSuggestionId={selectedSuggestionId}
              isRetrying={isRetrying}
              retryCount={retryCount}
              lastRetryError={lastRetryError}
              onRetry={lastRetryError ? handleRetrySuggestions : undefined}
            />
          </Suspense>
          

          {/* Resend indicator */}
          {resendingMessageIndex !== null && (
            <div className="mb-1.5 text-xs text-green-400 flex items-center space-x-1">
              <RefreshCw className="w-3 h-3" />
              <span>Đã copy tin nhắn vào ô chat - bạn có thể chỉnh sửa trước khi gửi</span>
            </div>
          )}
          
          {/* Travel action indicator */}
          {isTravelActionSelected && (
            <div className="mb-1.5 text-xs text-green-400 flex items-center space-x-1">
              <Send className="w-3 h-3" />
              <span>Đã chọn địa điểm di chuyển - nhấn gửi để thực hiện hành động</span>
            </div>
          )}
          
          <div className={`${shouldUseMobileLayout() ? 'flex space-x-2' : 'flex space-x-2 sm:space-x-3'} transition-all duration-300`}>
            <textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                selectedSuggestionId 
                  ? "Đã chọn hành động gợi ý - nhấn gửi để thực hiện" 
                  : isTravelActionSelected
                    ? "Đã chọn địa điểm di chuyển - nhấn gửi để thực hiện"
                    : isAIProcessing || isNPCAnalysisProcessing 
                      ? "AI đang xử lý - bạn có thể gõ sẵn hành động..." 
                      : "Mô tả hành động của bạn..."
              }
              className={`flex-1 px-3 sm:px-4 py-2.5 bg-gray-900 border rounded-lg text-white placeholder-gray-400 focus:outline-none resize-none transition-colors ${
                shouldUseMobileLayout() ? 'text-sm' : 'text-base'
              } ${
                selectedSuggestionId
                  ? 'border-blue-700 focus:border-blue-700 opacity-75'
                  : isTravelActionSelected
                    ? 'border-green-600 focus:border-green-600 opacity-75'
                    : resendingMessageIndex !== null 
                      ? 'border-green-700 focus:border-green-700' 
                      : (isAIProcessing || isNPCAnalysisProcessing)
                        ? 'border-yellow-700 focus:border-yellow-700'
                        : 'border-gray-800 focus:border-blue-700'
              }`}
              rows={2}
              disabled={!!selectedSuggestionId || isTravelActionSelected}
            />
            
            {/* NPC Dialogue Selector Button */}
            {availableNPCs.length > 0 && (
              <div className="relative npc-dropdown-container">
                <button
                  onClick={() => setShowNPCDropdown(!showNPCDropdown)}
                  className={`px-3 sm:px-4 py-3 border rounded-lg transition-colors duration-200 flex items-center justify-center ${
                    shouldUseMobileLayout() ? 'min-h-[48px] min-w-[48px]' : 'mobile-button'
                  } touch-feedback ${
                    selectedNPCForDialogue
                      ? 'bg-purple-800 border-purple-700 text-purple-100 hover:bg-purple-900'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}
                  title={
                    selectedNPCForDialogue
                      ? `Đang đối thoại với ${availableNPCs.find(npc => npc.id === selectedNPCForDialogue)?.name || 'NPC'} - Click để chọn`
                      : 'Tất cả NPCs - Click để chọn NPC cụ thể'
                  }
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                
                {/* Dropdown Menu - Hiển thị phía trên, căn phải */}
                {showNPCDropdown && (
                  <div className="absolute bottom-full right-0 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleNPCSelection(null);
                          setShowNPCDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                          !selectedNPCForDialogue ? 'text-purple-300 bg-purple-900/30' : 'text-gray-300'
                        }`}
                      >
                        Tất cả NPCs
                      </button>
                      {availableNPCs.map((npc) => (
                        <button
                          key={npc.id}
                          onClick={() => {
                            handleNPCSelection(npc.id);
                            setShowNPCDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                            selectedNPCForDialogue === npc.id ? 'text-purple-300 bg-purple-900/30' : 'text-gray-300'
                          }`}
                        >
                          {npc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={sendMessage}
              disabled={!currentMessage.trim() || isLoading || isAIProcessing || isNPCAnalysisProcessing}
              className={`px-3 sm:px-4 py-3 border rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${shouldUseMobileLayout() ? 'min-h-[48px] min-w-[48px]' : 'mobile-button'} touch-feedback ${
                isAIProcessing || isNPCAnalysisProcessing
                  ? 'bg-yellow-800 border-yellow-700 text-white'
                  : 'bg-blue-800 border-blue-700 text-white hover:bg-blue-900'
              }`}
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Save Popup */}
      <Suspense fallback={null}>
        <SavePopup
          isOpen={showSavePopup}
          onClose={() => setShowSavePopup(false)}
          onSaveGame={handleSaveGame}
          isProcessing={isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions}
        />
      </Suspense>

      {/* Save Manager */}
      <Suspense fallback={null}>
        <SaveManager
          isOpen={showSaveManager}
          onClose={() => setShowSaveManager(false)}
          onLoadGame={handleLoadGame}
          currentGameData={getCurrentGameData()}
          isProcessing={isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions}
        />
      </Suspense>

      {/* Info Menu - Only render when needed */}
      {(showInfoMenu || isInfoMenuPinned) && (
        <Suspense fallback={
          <div className="fixed top-0 right-0 h-screen bg-gray-900 border-l border-gray-600 z-50 flex items-center justify-center w-96">
            <div className="glass-effect p-8 rounded-2xl text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-white text-sm">Đang tải menu...</p>
            </div>
          </div>
        }>
          <InfoMenu
            key={npcRelationshipsUpdated} // Force re-render when NPC relationships update
            isOpen={showInfoMenu || isInfoMenuPinned}
            onClose={() => setShowInfoMenu(false)}
            worldData={infoMenuData.worldData}
            characterData={infoMenuData.characterData}
            worldTime={gameState.worldTime}
            isPinned={isInfoMenuPinned}
            onTogglePin={() => setIsInfoMenuPinned(!isInfoMenuPinned)}
            questSystem={questSystem}
            onQuestUpdate={completeObjective}
            onQuestAccept={acceptQuest}
            onQuestDecline={declineQuest}
            onQuestDeclineActive={declineActiveQuest}
            onClaimReward={claimReward}
            onRemoveDeclinedQuests={removeDeclinedQuests}
            onCreateFactionQuest={createFactionQuestFromAI}
            isAIProcessing={isAIProcessing}
            isNPCAnalysisProcessing={isNPCAnalysisProcessing}
            contentFlags={gameState.contentFlags || undefined}
            turnCounter={turnCounter}
            onToggleAdultContent={toggleAdultContent}
            onToggleAdultIntensity={toggleAdultIntensity}
            onLocationTravel={handleLocationTravel}
            selectedTravelLocationId={selectedTravelLocationId}
            onEquipItem={handleEquipItem}
            onUnequipItem={handleUnequipItem}
            onDropItem={handleDropItem}
            onViewItemDetails={handleViewItemDetails}
            selectedNPCForDialogue={selectedNPCForDialogue}
          />
        </Suspense>
      )}

      {/* Quest Offer Modal */}
      <Suspense fallback={null}>
        <QuestOfferModal
          isOpen={showQuestOfferModal}
          onClose={() => {
            setShowQuestOfferModal(false);
            setPendingQuestOffer(null);
          }}
          onAccept={handleAcceptQuestOffer}
          onDecline={handleDeclineQuestOffer}
          questOffer={pendingQuestOffer}
        />
      </Suspense>

      {/* Action Log Modal */}
      <Suspense fallback={null}>
        <ActionLog
          isOpen={showActionLog}
          onClose={() => setShowActionLog(false)}
          entries={actionLog}
        />
      </Suspense>

      {/* Item Selection Modal */}
      <ItemSelectionModal
        isOpen={showItemSelectionModal}
        onClose={() => {
          setShowItemSelectionModal(false);
          setAvailableItems([]);
        }}
        items={availableItems}
        onSelectItems={handleSelectItems}
      />

      {/* Skip Time Modal */}
      {showSkipTimeModal && (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
          <div className="glass-effect p-6 rounded-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Moon className="w-5 h-5 mr-2" />
                Nghỉ ngơi / Skip thời gian
              </h3>
              <button
                onClick={() => setShowSkipTimeModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Chọn số giờ bạn muốn nghỉ ngơi (tối thiểu 2 giờ, tối đa 8 giờ):
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <span>Thời gian nghỉ:</span>
                  <span className="font-semibold text-white">{skipHours} giờ</span>
                </div>
                
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={skipHours}
                  onChange={(e) => setSkipHours(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((skipHours - 2) / 6) * 100}%, #374151 ${((skipHours - 2) / 6) * 100}%, #374151 100%)`
                  }}
                />
                
                <div className="flex justify-between text-xs text-gray-400">
                  <span>2h</span>
                  <span>3h</span>
                  <span>4h</span>
                  <span>5h</span>
                  <span>6h</span>
                  <span>7h</span>
                  <span>8h</span>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-sm text-gray-300">
                  <strong>Thời gian hiện tại:</strong> {gameState.worldTime ? `${gameState.worldTime.hour}:${gameState.worldTime.minute.toString().padStart(2, '0')}` : 'N/A'}
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  <strong>Sau khi nghỉ:</strong> {gameState.worldTime ? (() => {
                    const newTime = worldTimeService.advanceTime(gameState.worldTime!, skipHours);
                    return `${newTime.hour}:${newTime.minute.toString().padStart(2, '0')}`;
                  })() : 'N/A'}
                </p>
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowSkipTimeModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSkipTime}
                  className="flex-1 px-4 py-2 bg-purple-600 border border-purple-500 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
