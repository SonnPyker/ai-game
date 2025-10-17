import { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, AlertCircle, Play, Clock, MessageSquare, FileText, Undo2, Save, Shield, AlertTriangle, Info, EyeOff, RefreshCw, History, Moon, Sword } from 'lucide-react';
import { worldTimeService } from '../services/worldTimeService';
import { sccService } from '../services/sccService';
import { WorldTime, SCCContext, ChatMessage as ChatMessageType, ContentFlags, PlayerLocation, InventoryItem } from '../types';
import { buildContextForAI } from '../lib/context';
import { SaveGame } from '../types/saveGame';
import { useQuestSystem } from '../hooks/useQuestSystem';
import { QuestSystem } from '../types';
import { useMinimizedModalContext } from '../contexts/MinimizedModalContext';
import { DialogueRenderer } from '../components/DialogueRenderer';
import { detectPlayerDialogue, enhanceDialogueForAI } from '../utils/dialogueProcessor';
import { useResponsiveContext } from '../contexts/ResponsiveContext';
import { actionSuggestionService, SuggestedAction, ActionLogEntry } from '../services/actionSuggestionService';
import { tradingHistoryService } from '../services/tradingHistoryService';
import { locationService } from '../services/locationService';
import { locationSyncService } from '../services/locationSyncService';
import { inventoryService } from '../services/inventoryService';
import { DiceRoller } from '../utils/diceRoller';
import { combatPreparationService } from '../services/combatPreparationService';
import { ItemSelectionModal } from '../components/ItemSelectionModal/ItemSelectionModal';
import { MotionWrapper } from '../components/MotionWrapper';
import { questCompletionService } from '../services/questCompletionService';
import { combatDataService } from '../services/combatDataService';
import { questCombatService } from '../services/questCombatService';
// REMOVED: combatLevelService and levelSystemService imports
// Experience is now handled in CombatPage.tsx only
import { npcHealthUpdateService } from '../services/npcHealthUpdateService';
import { RandomCombatModal } from '../components/CombatPage/RandomCombatModal';
import { QuestCombatDebug } from '../components/Debug/QuestCombatDebug';
import { DiscardItemModal } from '../components/DiscardItemModal';
import { comfyUIService } from '../services/comfyUIService';
import { imageStorageService } from '../services/imageStorageService';
import { promptExtractionService } from '../services/promptExtractionService';
import { ImageGenerationButton } from '../components/ImageGenerationButton';
import { merchantService } from '../services/merchantService';
import { tradingService } from '../services/tradingService';
import { skillBookService } from '../services/skillBookService';
import { MerchantShopModal } from '../components/Shop/MerchantShopModal';
import { SkillBookPreview } from '../components/Shop/SkillBookPreview';
import { NegotiationPanel } from '../components/Shop/NegotiationPanel';
import { MerchantShop, SkillBook } from '../types';
import { enemyFromContextService } from '../services/enemyFromContextService';

// ImageDisplay component for handling base64 images
const ImageDisplay = ({ filepath, prompt }: { filepath: string; prompt?: string }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        const url = await imageStorageService.getImageUrl(filepath);
        if (url) {
          setImageUrl(url);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to load image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [filepath]);

  if (loading) {
    return (
      <div className="mb-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          <span className="text-sm text-gray-400">Loading image...</span>
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="mb-3 p-4 bg-red-900 rounded-lg border border-red-700">
        <span className="text-sm text-red-300">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <img 
        src={imageUrl} 
        alt="Scene visualization"
        className="w-full rounded-lg border border-gray-300 max-h-96 object-cover"
        onError={() => setError(true)}
      />
      {prompt && (
        <details className="mt-2 text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-300">
            Prompt used for image generation
          </summary>
          <p className="mt-1 p-2 bg-gray-800 rounded text-gray-300 break-words">
            {prompt}
          </p>
        </details>
      )}
    </div>
  );
};

// Lazy load các services lớn để giảm kích thước bundle chính
let geminiService: any;
let localSaveService: any;
let cloudSyncService: any;
let npcRelationshipService: any;
let npcChallengeService: any;

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
  if (!npcChallengeService) {
    const challengeModule = await import('../services/npcChallengeService');
    npcChallengeService = challengeModule.npcChallengeService;
  }
};

// Lazy load các components lớn để giảm kích thước bundle chính
const InfoMenu = lazy(() => import('../components/InfoMenu/InfoMenu').then(module => ({ default: module.InfoMenu })));
const SaveManager = lazy(() => import('../components/SaveManager/SaveManager').then(module => ({ default: module.SaveManager })));
const SavePopup = lazy(() => import('../components/SaveManager/SavePopup').then(module => ({ default: module.SavePopup })));
const NPCChallengeModal = lazy(() => import('../components/CombatPage/NPCChallengeModal').then(module => ({ default: module.NPCChallengeModal })));
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
  const { hasMinimizedModals } = useMinimizedModalContext();
  const [chatHistory, setChatHistory] = useState<ChatMessageType[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingOpeningImage, setIsGeneratingOpeningImage] = useState(false);

  // Handler for manual image generation
  const handleImageGenerated = useCallback((messageId: string, imageUrl: string, imagePrompt: string) => {
    setChatHistory(prev => prev.map(msg => 
      msg.timestamp.toString() === messageId 
        ? { ...msg, imageUrl, imagePrompt, isGeneratingImage: false, hasImageGenerationFailed: false }
        : msg
    ));
  }, []);

  const handleImageGenerationStart = useCallback((messageId: string) => {
    setChatHistory(prev => prev.map(msg => 
      msg.timestamp.toString() === messageId 
        ? { ...msg, isGeneratingImage: true, hasImageGenerationFailed: false }
        : msg
    ));
  }, []);

  const handleImageGenerationError = useCallback((messageId: string) => {
    setChatHistory(prev => prev.map(msg => 
      msg.timestamp.toString() === messageId 
        ? { ...msg, isGeneratingImage: false, hasImageGenerationFailed: true }
        : msg
    ));
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [turnCounter, setTurnCounter] = useState(0);
  const [showSaveManager, setShowSaveManager] = useState(false);
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [isInfoMenuPinned, setIsInfoMenuPinned] = useState(false);
  // Removed saveLoading state as it's handled in SavePopup
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [characterDataUpdate, setCharacterDataUpdate] = useState(0);

  // Check and heal allies every turn
  useEffect(() => {
    const checkAndHealAllies = async (currentTurn: number) => {
      try {
        const { allyManagementService } = await import('../services/allyManagementService');
        allyManagementService.checkAndHealAllies(currentTurn);
      } catch (error) {
        console.error('Error checking ally injuries:', error);
      }
    };
    
    if (turnCounter > 0) {
      checkAndHealAllies(turnCounter);
    }
  }, [turnCounter]);
  
  
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
  
  // DC Check result state
  const [, setDcCheckResult] = useState<{
    stat: string;
    roll: number;
    modifier: number;
    total: number;
    dc: number;
    success: boolean;
  } | null>(null);
  
  // Combat result auto-paste state
  const [combatResultText, setCombatResultText] = useState<string>('');
  const [hasCombatResult, setHasCombatResult] = useState(false);
  
  // Skip time modal state
  const [showSkipTimeModal, setShowSkipTimeModal] = useState(false);
  const [skipHours, setSkipHours] = useState(2);
  
  // Item selection modal state
  const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  
  // Random combat modal state
  const [showRandomCombatModal, setShowRandomCombatModal] = useState(false);
  const [randomCombatData, setRandomCombatData] = useState<{
    enemy: any;
    location: string;
    reason: string;
  } | null>(null);
  const [showQuestCombatDebug, setShowQuestCombatDebug] = useState(false);
  
  // Discard item modal state
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [itemToDiscard, setItemToDiscard] = useState<InventoryItem | null>(null);
  
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
  
  // NPC Challenge state
  const [showNPCChallengeModal, setShowNPCChallengeModal] = useState(false);
  const [npcChallengeData, setNpcChallengeData] = useState<any>(null);

  // Merchant Shop state
  const [showMerchantShop, setShowMerchantShop] = useState(false);
  const [currentShop, setCurrentShop] = useState<MerchantShop | null>(null);
  const [showSkillBookPreview, setShowSkillBookPreview] = useState(false);
  const [selectedSkillBook, setSelectedSkillBook] = useState<SkillBook | null>(null);
  const [showNegotiationPanel, setShowNegotiationPanel] = useState(false);
  const [negotiationData, setNegotiationData] = useState<{
    item: InventoryItem | SkillBook;
    basePrice: number;
    type: 'buy' | 'sell';
  } | null>(null);

  // Debouncing and throttling refs
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestTimeRef = useRef<number>(0);
  
  // Helper function to generate random duration for suggestions (10-120 minutes)
  const generateSuggestionDuration = (): number => {
    return Math.floor(Math.random() * 111) + 10; // 10-120 phút
  };

  // Input handler - tắt debounce để loại bỏ lag
  const handleInputChange = useCallback((value: string) => {
    // If we have combat result text, prevent editing it
    if (hasCombatResult && combatResultText) {
      // Only allow adding text after combat result text
      if (value.startsWith(combatResultText)) {
        setCurrentMessage(value);
      } else {
        // Restore combat result text if user tries to delete it
        setCurrentMessage(combatResultText);
      }
    } else {
      setCurrentMessage(value);
    }
  }, [hasCombatResult, combatResultText]);

  
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  // Memoized expensive calculations
  const memoizedChatHistory = useMemo(() => chatHistory, [chatHistory]);
  
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
        
        // ƯU TIÊN: Xử lý sceneState.npcs ngay lập tức nếu có
        if (enhancedContext.sceneState && enhancedContext.sceneState.npcs && Array.isArray(enhancedContext.sceneState.npcs)) {
          npcRelationshipService.parseNPCsFromAIResponse({ sceneState: enhancedContext.sceneState }, location);
        }
        
        await npcRelationshipService.updateRelationshipsFromNarrative(
          narrative, 
          location, 
          enhancedContext,
          selectedNPCForDialogue
        );
        
        // Check if any NPCs were mentioned in the narrative using service method
        // If no NPCs were mentioned, clear any existing selection
        const allRelationships = npcRelationshipService.getAllRelationships();
        const mentionedNPCs = allRelationships.filter((npc: any) => 
          npcRelationshipService.isNPCMentionedInContext(npc.name, narrative, enhancedContext)
        );
        
        // If no NPCs were mentioned, clear any existing selection
        if (mentionedNPCs.length === 0 && selectedNPCForDialogue) {
          setSelectedNPCForDialogue(null);
          localStorage.removeItem('selectedNPCForDialogue');
        }
        
        // Check for NPC challenges after successful analysis
        await checkForNPCChallenges(narrative, enhancedContext);
        
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

  // Check for NPC challenges
  const checkForNPCChallenges = async (narrative: string, enhancedContext: any) => {
    try {
      await loadServices();
      
      // Get all NPCs mentioned in the narrative
      const allRelationships = npcRelationshipService.getAllRelationships();
      const mentionedNPCs = allRelationships.filter((npc: any) => 
        narrative.toLowerCase().includes(npc.name.toLowerCase()) ||
        enhancedContext?.playerAction?.toLowerCase().includes(npc.name.toLowerCase())
      );
      
      // Check each mentioned NPC for challenge
      for (const npc of mentionedNPCs) {
        const isInDialogue = selectedNPCForDialogue === npc.id;
        const challengeData = npcChallengeService.shouldChallengePlayer(
          npc.name,
          gameState.sceneState,
          isInDialogue
        );
        
        if (challengeData) {
          setNpcChallengeData(challengeData);
          setShowNPCChallengeModal(true);
          break; // Only show one challenge at a time
        }
      }
    } catch (error) {
      console.error('Error checking NPC challenges:', error);
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

  // Initialize combat_history if not exists and validate quests
  useEffect(() => {
    const combatHistory = localStorage.getItem('combat_history');
    if (!combatHistory) {
      localStorage.setItem('combat_history', JSON.stringify({ defeatedEnemies: [] }));
    }
    
    // Validate all quests to limit requiredKills to maximum 3
    questCombatService.validateAllQuests();
  }, []); // Empty dependency array - only run once on mount

  // Check for combat result and auto-paste message
  useEffect(() => {
    const combatResultData = combatDataService.getPendingCombatResult();
    if (combatResultData) {
      try {
        // Generate message based on combat result
        let message = '';
        if (combatResultData.playerFled) {
          // Player fled from combat
          const enemyList = combatResultData.enemyNames?.join(', ') || 'kẻ thù';
          message = `Bạn đã bỏ chạy khỏi trận chiến với ${enemyList}. `;
        } else if (combatResultData.victory) {
          // Player won
          const enemyList = combatResultData.enemyNames?.join(', ') || 'kẻ thù';
          message = `Bạn đã đánh bại ${enemyList}. `;
        } else {
          // Player lost (defeated)
          const enemyList = combatResultData.enemyNames?.join(', ') || 'kẻ thù';
          message = `Bạn đã bị đánh bại bởi ${enemyList}. `;
          
          // ADDED: Save defeat information to combat_history for encounter rate reset
          try {
            const currentTurn = parseInt(localStorage.getItem('game_turn_counter') || '0');
            
            // Create a CombatResultData for defeat
            const defeatCombatData = {
              combatId: `defeat_${Date.now()}`,
              duration: 0,
              victory: false,
              playerFled: false,
              enemyNames: combatResultData.enemyNames || ['Unknown Enemy'],
              enemiesDefeated: [],
              characterUpdates: {
                healthBefore: 0,
                healthAfter: 0,
                healthLost: 0,
                experienceGained: 0,
                combatLevelBefore: 0,
                combatLevelAfter: 0,
                leveledUp: false,
                totalDamageDealt: 0,
                totalDamageTaken: 0,
                turnsPlayed: 0,
                attacksLanded: 0,
                attacksMissed: 0
              },
              rewards: {
                experience: 0,
                items: []
              },
              metadata: {
                gameTurn: currentTurn
              }
            };
            
            combatDataService.addToCombatHistory(defeatCombatData);
          } catch (error) {
            console.error('Error updating combat_history with defeat:', error);
          }
        }
        
        // Set combat result text and flag
        setCombatResultText(message);
        setHasCombatResult(true);
        setCurrentMessage(message);
        
        // Clear combat result after processing to prevent continuous reset
        combatDataService.clearPendingCombatResult();
        
      } catch (error) {
        console.error('Error parsing combat result:', error);
        // Clear invalid data
        combatDataService.clearPendingCombatResult();
      }
    }
  }, []); // Run once on mount

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
        const chatWithTimestamps = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setChatHistory(chatWithTimestamps);
        
        // Note: Opening image generation is now handled only in initializeGame
        // to ensure it runs only once during scenario creation
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
            
            // 🚨 CRITICAL: Validate and sync world data to ensure locationType consistency
            const syncedWorld = locationSyncService.validateAndSyncAllLocations(world);
            if (JSON.stringify(syncedWorld) !== JSON.stringify(world)) {
              localStorage.setItem('world_gen_result', JSON.stringify(syncedWorld));
            }
            
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

  // Watch for combat initiation in sceneState - CHỈ hiển thị modal khi tất cả tiến trình xử lý hoàn tất
  useEffect(() => {
    if (gameState.sceneState?.combatInitiation) {
      
      // KIỂM TRA: Chỉ hiển thị modal khi KHÔNG có tiến trình xử lý nào đang chạy
      const isAnyProcessing = isLoading || isAIProcessing || isNPCAnalysisProcessing || isGeneratingSuggestions;
      
      if (isAnyProcessing) {
        return; // Chờ tất cả tiến trình xử lý hoàn tất
      }
      
      
      const combatInitiation = gameState.sceneState.combatInitiation;
      
      // Check if it's a random encounter
      if (combatInitiation.type === 'random_encounter' && combatInitiation.enemies && combatInitiation.enemies.length > 0) {
        // Show random combat modal
        setRandomCombatData({
          enemy: combatInitiation.enemies[0],
          location: typeof combatInitiation.location === 'string' 
            ? combatInitiation.location 
            : (combatInitiation.location?.name || 'Unknown Location'),
          reason: combatInitiation.reason || 'Cuộc đối đầu bất ngờ'
        });
        setShowRandomCombatModal(true);
      } else {
        // For other types (like NPC challenge), navigate directly
        const combatData = {
          type: combatInitiation.type,
          enemies: combatInitiation.enemies,
          location: combatInitiation.location,
          reason: combatInitiation.reason,
          turn: combatInitiation.turn
        };
        
        // Store combat data in localStorage for CombatPage to read
        localStorage.setItem('pending_combat', JSON.stringify(combatData));
        
        // Navigate to combat page
        navigate('/combat');
      }
      
      // Clear combatInitiation from sceneState to prevent re-triggering
      // Only clear after modal is shown or combat is started
      if (combatInitiation.type !== 'random_encounter') {
        setGameState(prev => ({
          ...prev,
          sceneState: {
            ...prev.sceneState,
            combatInitiation: undefined
          }
        }));
      }
    }
  }, [gameState.sceneState?.combatInitiation, navigate, isLoading, isAIProcessing, isNPCAnalysisProcessing, isGeneratingSuggestions]);

  // Apply combat results on mount
  useEffect(() => {
    const applyCombatResults = () => {
      const combatResult = combatDataService.getPendingCombatResult();
      
      if (combatResult) {
        try {
          const characterData = localStorage.getItem('currentCharacter');
          if (characterData) {
            const character = JSON.parse(characterData);
            
            // Update health
            if (character.health) {
              character.health.current = combatResult.characterUpdates.healthAfter;
            }
            
            // REMOVED: Double experience application
            // Experience is already applied in CombatPage.tsx
            // Just update the combat result data with current values
            combatResult.characterUpdates.combatLevelAfter = character.combatLevel;
            combatResult.characterUpdates.leveledUp = false; // Will be updated by CombatPage
            
            // Update inventory (items already added by CombatPage)
            character.inventory = inventoryService.getInventory();
            character.equipment = inventoryService.getEquipment();
            
            // Save updated character
            localStorage.setItem('currentCharacter', JSON.stringify(character));
            
            // Update quest combat objectives if player won
            if (combatResult.victory && combatResult.enemiesDefeated.length > 0) {
              combatResult.enemiesDefeated.forEach(enemy => {
                const questUpdated = questCombatService.updateCombatObjectiveProgress(enemy.name);
                if (questUpdated) {
                }
              });
            }
            
            // Update NPC health after combat
            npcHealthUpdateService.updateNPCHealthAfterCombat(combatResult);
            
            // Add to combat history
            combatDataService.addToCombatHistory(combatResult);
            
            // Clear flee data when combat ends (victory or defeat)
            localStorage.removeItem('player_fled_random_combat');
            
            // Clear pending result
            combatDataService.clearPendingCombatResult();
            
            // REMOVED: Level up notifications
            // Level up notifications are now handled in CombatPage.tsx
            
            // Reload character in game state
            setGameState(prev => ({
              ...prev,
              character: character
            }));
          }
        } catch (error) {
          console.error('Error applying combat results:', error);
          combatDataService.clearPendingCombatResult();
        }
      }
    };

    // Delay applyCombatResults to ensure auto-paste useEffect runs first
    const timeoutId = setTimeout(() => {
      applyCombatResults();
    }, 50); // Small delay to ensure auto-paste runs first

    return () => clearTimeout(timeoutId);
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
  const handleSuggestionPick = async (suggestion: SuggestedAction) => {
    setUserInteractedWithSuggestions(true);
    
    // Nếu đã chọn suggestion này rồi thì hủy chọn
    if (selectedSuggestionId === suggestion.id) {
      setSelectedSuggestionId(null);
      setCurrentMessage('');
      setDcCheckResult(null);
    } else {
      // Clear previous DC check result
      setDcCheckResult(null);
      
      // DC Check Actions - just paste text, will be processed on send
      
      // Regular suggestion handling (including attack actions)
      setCurrentMessage(suggestion.text);
      setSelectedSuggestionId(suggestion.id);
      
      // Clear travel selection khi chọn suggestion
      if (isTravelActionSelected) {
        setIsTravelActionSelected(false);
        setSelectedTravelLocationId(null);
      }
    }
  };

  // Handle DC Check Action
  const handleDCCheckAction = async (suggestion: SuggestedAction) => {
    if (!suggestion.dcCheck) return null;
    
    try {
      // Get character data
      const characterData = localStorage.getItem('currentCharacter');
      if (!characterData) {
        console.error('No character data found');
        return null;
      }
      
      const character = JSON.parse(characterData);
      const stat = suggestion.dcCheck.stat;
      const dc = suggestion.dcCheck.dc;
      
      // Get stat modifier
      const modifier = character.coreStats?.modifiers?.[stat] || 0;
      
      // Roll d20 + modifier
      const roll = DiceRoller.roll(`d20+${modifier}`, `${stat} Check`);
      const total = roll.total;
      const success = total >= dc;
      
      // Save DC check result
      const dcResult = {
        stat: stat,
        roll: roll.rolls[0], // The actual d20 roll
        modifier: modifier,
        total: total,
        dc: dc,
        success: success
      };
      
      setDcCheckResult(dcResult);
      
      // Show result to user
      // Don't show DC check result to player - only send to AI
      // const resultText = `🎲 ${stat.charAt(0).toUpperCase() + stat.slice(1)} Check: ${roll.rolls[0]}+${modifier}=${total} vs DC ${dc} → ${success ? 'SUCCESS' : 'FAILURE'}`;
      // setSaveMessage(resultText);
      // setTimeout(() => setSaveMessage(null), 5000);
      
      // Set the message with DC check result
      setCurrentMessage(suggestion.text);
      setSelectedSuggestionId(suggestion.id);
      
      return dcResult;
      
    } catch (error) {
      console.error('Error handling DC check action:', error);
      setSaveMessage('Lỗi khi thực hiện DC check');
      setTimeout(() => setSaveMessage(null), 3000);
      return null;
    }
  };
  
  // Handle Attack Action
  const handleAttackAction = async (suggestion: SuggestedAction) => {
    try {
      // Load services first
      await loadServices();
      
      // Get NPC name from attackTarget or try to find from scene
      let npcName = suggestion.attackTarget?.npcName;
      
      if (!npcName) {
        // Try to find NPC from scene state
        const sceneState = gameState.sceneState;
        if (sceneState?.npcs && sceneState.npcs.length > 0) {
          npcName = sceneState.npcs[0].name;
        } else {
          console.error('No NPC found for attack action');
          setSaveMessage('Không tìm thấy mục tiêu để tấn công');
          setTimeout(() => setSaveMessage(null), 3000);
          return;
        }
      }
      
      // Get NPC relationship data using the loaded service
      let npc = npcRelationshipService.getRelationship(npcName);
      
      if (!npc) {
        // Try fuzzy matching if exact match fails
        const allRelationships = npcRelationshipService.getAllRelationships();
        const fuzzyMatch = allRelationships.find((n: any) => 
          n.name.includes(npcName || '') || (npcName || '').includes(n.name)
        );
        
        if (fuzzyMatch) {
          npc = fuzzyMatch;
        } else {
          // ✨ MỚI: Tạo enemy từ context
          
          // Get character data for level
          const characterData = localStorage.getItem('currentCharacter');
          const character = characterData ? JSON.parse(characterData) : { level: 1 };
          
          const { enemy, shouldSaveToRelationships } = await enemyFromContextService.createEnemyFromContext(
            npcName || 'Unknown Enemy',
            gameState.sceneState,
            character.level || 1
          );
          
          if (!enemy) {
            setSaveMessage(`Không thể tạo thông tin cho ${npcName}`);
            setTimeout(() => setSaveMessage(null), 3000);
            return;
          }
          
          // Lưu vào relationships nếu cần
          if (shouldSaveToRelationships) {
            npcRelationshipService.addOrUpdateRelationship(enemy);
          } else {
          }
          
          npc = enemy;
        }
      }
      
      // Player chọn attack action - không cần kiểm tra relationship level
      // Chỉ cần có NPC là có thể tấn công
      
      // Prepare NPC for combat
      const preparation = await combatPreparationService.prepareNPCForCombat(npc.id);
      if (!preparation.status.hasCombatStats) {
        setSaveMessage(`Không thể chuẩn bị ${npcName} cho chiến đấu`);
        setTimeout(() => setSaveMessage(null), 3000);
        return;
      }
      
      // Create challenge data for player-initiated attack
      const challengeReasons = [
        `Bạn quyết định tấn công ${npc.name}!`,
        `Bạn thách đấu ${npc.name}!`,
        `Bạn sẵn sàng chiến đấu với ${npc.name}!`,
        `Bạn chọn đối đầu trực tiếp với ${npc.name}!`
      ];
      
      const challengeData = {
        npcId: npc.id,
        npcName: npc.name,
        challengeReason: challengeReasons[Math.floor(Math.random() * challengeReasons.length)],
        combatStats: preparation.npc.combatStats,
        difficulty: npc.relationshipLevel < -70 ? 'hard' : npc.relationshipLevel < -50 ? 'medium' : 'easy'
      };
      
      // Show NPC Challenge Modal
      setNpcChallengeData(challengeData);
      setShowNPCChallengeModal(true);
      
    } catch (error) {
      console.error('Error handling attack action:', error);
      setSaveMessage('Lỗi khi xử lý hành động tấn công');
      setTimeout(() => setSaveMessage(null), 3000);
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
      
      // Validate and sync location classifications
      const validatedWorldData = locationSyncService.validateAndSyncAllLocations(worldDataParsed);
      
      // Log validation results
      const validationReport = locationSyncService.validateLocationClassification(validatedWorldData);
      if (validationReport.misclassifiedShops.length > 0) {
        console.warn(`⚠️ [LocationSync] Found ${validationReport.misclassifiedShops.length} misclassified shop locations:`, 
          validationReport.misclassifiedShops.map(loc => `${loc.name} (${loc.type})`));
      }
      console.log(`✅ [LocationSync] Location validation complete: ${validationReport.validShops.length} valid shops, ${validationReport.misclassifiedShops.length} misclassified`);
      
      const currentTime = validatedWorldData.currentTime || worldTimeService.initializeWorldTime(validatedWorldData.startYear || 1);

      // Generate scenario skeleton
      const scenarioSkeleton = await geminiService.generateScenarioSkeleton(JSON.stringify(validatedWorldData), characterData);
      
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
        JSON.stringify(validatedWorldData), 
        characterData, 
        JSON.stringify(scenarioSkeleton),
        questInfo
      );

      // Save scenario to localStorage
      localStorage.setItem('rp_scenario', JSON.stringify(scenarioSkeleton));

       // Bỏ refresh quest system từ world data - chỉ nhận side quest từ chat
       // Sidequest chỉ được tạo khi người chơi accept từ game chat, không load từ world data

      // Add opening message to chat
      const openingMessage: ChatMessageType = {
        role: 'ai',
        content: openingNarrative,
        timestamp: new Date()
      };

      // Generate image for opening message if ComfyUI is enabled
      // This runs synchronously and game waits for completion
      const comfyUISettings = comfyUIService.loadSettings();
      if (comfyUISettings.enabled && !openingMessage.imageUrl) {
        try {
          setIsGeneratingOpeningImage(true);
          openingMessage.isGeneratingImage = true;
          
          // Extract visual prompt from opening narrative
          const { prompt, negativePrompt } = await promptExtractionService.extractVisualPrompt(
            openingNarrative,
            { 
              location: { name: validatedWorldData.name, description: validatedWorldData.description },
              npcs: [],
              items: [],
              atmosphere: scenarioSkeleton.tone?.join(', ') || 'mysterious'
            },
            comfyUISettings.style,
            comfyUISettings.customStyle,
            comfyUISettings.qualityLevel,
            comfyUISettings.enableCharacterConsistency
          );
          
          // Generate image - game waits for this to complete
          const imageBase64 = await comfyUIService.generateImage(prompt, negativePrompt, comfyUISettings.resolution);
          
          // Save image to storage
          const filename = `opening_${Date.now()}.png`;
          const filepath = await imageStorageService.saveImage(imageBase64, filename);
          
          // Attach image to opening message
          openingMessage.imageUrl = filepath;
          openingMessage.imagePrompt = prompt;
          openingMessage.isGeneratingImage = false;
          openingMessage.hasImageGenerationFailed = false;
          
        } catch (error) {
          console.error('❌ Failed to generate opening image:', error);
          // Mark as failed
          openingMessage.isGeneratingImage = false;
          openingMessage.hasImageGenerationFailed = true;
          // Continue without image if generation fails
        } finally {
          setIsGeneratingOpeningImage(false);
        }
      }

      // Load turn counter from localStorage
      const savedTurnCounter = parseInt(localStorage.getItem('game_turn_counter') || '0', 10);
      
      // Load or initialize SCC context
      const sccContext = sccService.loadSCCContext();
      // Sync SCC turnCounter with game turnCounter
      sccContext.turnCounter = savedTurnCounter;
      const updatedSccContext = sccService.addTurn(sccContext, openingMessage);
      
      // Initialize player location
      const initialLocationId = locationService.initializePlayerLocation(
        validatedWorldData,
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
    
    // Check if this is an attack action from suggestion - mark for later processing
    let isAttackAction = false;
    let isDCCheckAction = false;
    let currentDcCheckResult = null;
    if (selectedSuggestionId) {
      const selectedSuggestion = actionSuggestions.find(s => s.id === selectedSuggestionId);
      if (selectedSuggestion) {
        if (selectedSuggestion.attackTarget || selectedSuggestion.impactTags.some(tag => 
          tag === 'attack' || tag.includes('Attack')
        )) {
          isAttackAction = true;
          // Store attack suggestion for later processing after AI response
          localStorage.setItem('pending_attack_action', JSON.stringify(selectedSuggestion));
        } else if (selectedSuggestion.dcCheck) {
          isDCCheckAction = true;
          // Process DC check now, before AI response
          const dcResult = await handleDCCheckAction(selectedSuggestion);
          if (dcResult) {
            currentDcCheckResult = dcResult;
            setDcCheckResult(dcResult);
          }
        }
      }
    }

    // Inject DC check result if available
    if (currentDcCheckResult) {
      const dcCheckText = `[DC CHECK RESULT]
- Stat: ${currentDcCheckResult.stat.charAt(0).toUpperCase() + currentDcCheckResult.stat.slice(1)}
- Roll: ${currentDcCheckResult.roll} + ${currentDcCheckResult.modifier} = ${currentDcCheckResult.total}
- DC: ${currentDcCheckResult.dc}
- Result: ${currentDcCheckResult.success ? 'SUCCESS' : 'FAILURE'}

${enhancedMessage}`;
      enhancedMessage = dcCheckText;
    }

    const playerMessage: ChatMessageType = {
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
    
    // Store selectedSuggestionId before clearing for later use
    const currentSelectedSuggestionId = selectedSuggestionId;
    
    // Clear selection states
    setIsTravelActionSelected(false);
    setSelectedTravelLocationId(null);
    setSelectedSuggestionId(null);
    setDcCheckResult(null);

    // Clear combat result after sending
    if (hasCombatResult) {
      setHasCombatResult(false);
      setCombatResultText('');
    }

    // Backup current suggestions trước khi gửi tin nhắn
    setBackupSuggestions([...actionSuggestions]);

    // Flag để đánh dấu AI response thành công
    // LOGIC: 
    // - Khởi tạo = false (an toàn, không update gì)
    // - Chỉ set = true khi AI response thực sự thành công và hợp lệ
    // - Set = false khi có lỗi (trong catch block)
    let aiResponseSuccess = false;

    try {
      // Load data - prioritize world_gen_result (complete data) over currentWorldData
      let worldData = localStorage.getItem('world_gen_result');
      if (!worldData) {
        worldData = localStorage.getItem('currentWorldData');
      }
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
        const aiMessage: ChatMessageType = {
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

          // Parse combat history with validation
          let combatHistory;
          try {
            const combatHistoryData = localStorage.getItem('combat_history');
            combatHistory = combatHistoryData ? JSON.parse(combatHistoryData) : { defeatedEnemies: [] };
            
            // Ensure defeatedEnemies is an array
            if (!Array.isArray(combatHistory.defeatedEnemies)) {
              combatHistory.defeatedEnemies = [];
            }
          } catch (error) {
            console.error('Error parsing combat history:', error);
            combatHistory = { defeatedEnemies: [] };
          }

          const questCompletionContext = {
            inventory: inventoryService.getInventory(),
            npcRelationships: npcRelationshipService.getAllRelationships(),
            combatHistory: combatHistory,
            playerLocation: response.sceneState?.locationId,
            playerPosition: response.sceneState?.gridPosition
          };

          await questCompletionService.checkAllActiveQuests(questCompletionContext, activeQuests);
          
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
          
          // Xử lý completed objectives - TẠM THỜI TẮT để debug
          // if (questAnalysis.completedObjectives.length > 0) {
          //   for (const { questId, objectiveId } of questAnalysis.completedObjectives) {
          //     completeObjective(questId, objectiveId, true);
          //   }
          // }
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

        // Determine action duration - Initialize with default values
        let durationMinutes = 5; // Default for manual actions
        let isTravelAction = false; // Flag to identify travel actions
        let durationEstimationTask: Promise<{ duration: number; message: string }> | null = null;
        
        // Check if this is a travel action
        if (currentMessage.trim().startsWith('Bạn di chuyển đến')) {
          isTravelAction = true;
        } else if (selectedSuggestionId) {
          const selectedSuggestion = actionSuggestions.find(s => s.id === selectedSuggestionId);
          if (selectedSuggestion) {
            durationMinutes = selectedSuggestion.durationMinutes;
          }
        } else {
          // Prepare duration estimation task for parallel processing
          const context = actionSuggestionService.buildContextFromStorage();
          durationEstimationTask = actionSuggestionService.estimateActionDurationAsync(
            currentMessage.trim(), 
            context, 
            gameState.contentFlags || { adult_enabled: false, adult_intensity: 'fade' }
          );
        }

        // Initialize world time - will be updated after parallel tasks complete
        let newTime = gameState.worldTime;
        const originalWorldTime = gameState.worldTime; // Store original time for Action Log

        // Increment turn counter after AI response
        setTurnCounter(prev => {
          const newCounter = prev + 1;
          localStorage.setItem('game_turn_counter', newCounter.toString());
          return newCounter;
        });

        // Removed automatic faction quest checking - now manual only

        // Ensure sceneState exists and is an object
        const aiSceneState = response.sceneState || {};
        
        // Filter player inventory khỏi available items (tối ưu hiệu năng)
        const filterPlayerInventory = (sceneItems: InventoryItem[], playerInventory: InventoryItem[]) => {
          if (!sceneItems?.length || !playerInventory?.length) return sceneItems || [];
          
          const playerItemIds = new Set(playerInventory.map(item => item.id));
          return sceneItems.filter(item => !playerItemIds.has(item.id));
        };

        // Filter available items trước khi merge
        const currentCharacterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
        let filteredAvailableItems = filterPlayerInventory(
          aiSceneState.availableItems || [], 
          currentCharacterData.inventory || []
        );
        
        // Lọc bỏ quest reward items khỏi sceneState.availableItems
        // Quest reward items có tags chứa 'reward' hoặc 'quest'
        filteredAvailableItems = filteredAvailableItems.filter(item => {
          const tags = item.tags || [];
          const isQuestReward = tags.some(tag => 
            tag.toLowerCase().includes('reward') || 
            tag.toLowerCase().includes('quest')
          );
          return !isQuestReward;
        });
        
        // CRITICAL: Reset availableItems when starting a new turn
        // This ensures items don't persist across turns unless explicitly added by AI
        const shouldResetAvailableItems = !aiSceneState.availableItems || aiSceneState.availableItems.length === 0;
        
        
        // Update game state - đảm bảo availableItems chỉ chứa items có thể lấy được
        const newSceneState = { 
          ...gameState.sceneState, 
          ...aiSceneState, 
          worldTime: newTime, // This will be updated after time calculation
          // Reset availableItems nếu AI không cung cấp items mới, hoặc sử dụng filtered items từ AI
          availableItems: shouldResetAvailableItems ? [] : filteredAvailableItems
        };
        
        // Loại bỏ mainQuests khỏi sceneState nếu có
        if (newSceneState.mainQuests) {
          delete newSceneState.mainQuests;
        }
        
        // Note: setGameState moved to after time calculation to ensure correct worldTime

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
              // ❌ REMOVED: Don't update location here - it will be updated after travel time calculation
              // This was causing the bug where currentPlayerLocation was already updated to target location
              // when calculating travel time, resulting in 0 distance and 0 travel time
              
              // Clear selected NPC when traveling to new location
              setSelectedNPCForDialogue(null);
              localStorage.removeItem('selectedNPCForDialogue');

              // Note: Location and time will be saved later in the main flow after travel time calculation
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
          
          // 🚨 CRITICAL: Validate and restore locationType consistency using LocationSyncService
          if (newSceneState.location) {
            // Sync location object if it exists
            if (typeof newSceneState.location === 'object') {
              newSceneState.location = locationSyncService.syncLocationFromWorldData(newSceneState.location.id || newSceneState.location, newSceneState.location);
            }
            
            // Also sync locationType at sceneState level
            const originalLocation = locationService.getLocationById(newSceneState.location);
            if (originalLocation && originalLocation.locationType) {
              if (!newSceneState.locationType || newSceneState.locationType !== originalLocation.locationType) {
                newSceneState.locationType = originalLocation.locationType;
              }
            }
          }
          
          // Process all independent tasks in parallel for better performance
          const parallelTasks = [];
          
          // Task 1: Location signature NPC processing
          if (newSceneState.location) {
            parallelTasks.push(
              (async () => {
                try {
                  const currentLocation = locationService.getLocationById(newSceneState.location);
                  if (currentLocation) {
                    // Process location signature NPC for secondary locations (not shop locations)
                    if (currentLocation.type === 'secondary') {
                      if (!npcRelationshipService.hasSignatureNPCForLocation(currentLocation.id)) {
                        // Could create signature NPC here if needed
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
                    
                    // Process merchant signature NPC for shop locations
                    if (currentLocation.type === 'shop' || currentLocation.locationType === 'shop' || currentLocation.id.startsWith('loc_shop')) {
                      // Auto-update existing merchant NPCs to merchant signature NPCs
                      npcRelationshipService.autoUpdateMerchantSignatureNPCs(currentLocation.id);
                      
                      if (!npcRelationshipService.hasMerchantSignatureNPCForLocation(currentLocation.id)) {
                        // Could create merchant signature NPC here if needed
                      } else {
                        // Update location with merchant signature NPC info
                        const merchantSignatureNPC = npcRelationshipService.getMerchantSignatureNPCForLocation(currentLocation.id);
                        if (merchantSignatureNPC) {
                          // Validate signature exclusivity
                          if (!npcRelationshipService.validateNPCSignatureExclusivity(merchantSignatureNPC)) {
                            console.error('Merchant signature NPC has conflicting signature types:', merchantSignatureNPC.id);
                          }
                          
                          // Link merchant NPC with merchant shop
                          const merchantShop = merchantService.getMerchantShopByLocation(currentLocation.id);
                          if (merchantShop) {
                            merchantService.linkMerchantShopWithNPC(currentLocation.id, merchantSignatureNPC.id);
                            merchantSignatureNPC.merchantShopId = merchantShop.locationId;
                          }
                        }
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error processing location signature NPC:', error);
                }
              })()
            );
          }
          
          // Task 2: Link signature NPC with signature quest
          if (response.sideQuestOffer && response.sideQuestOffer.isLocationSignature && response.sideQuestOffer.signatureLocationId) {
            parallelTasks.push(
              (async () => {
                try {
                  const signatureNPC = npcRelationshipService.getSignatureNPCForLocation(response.sideQuestOffer.signatureLocationId);
                  if (signatureNPC) {
                    // Update NPC with quest ID
                    signatureNPC.signatureQuestId = response.sideQuestOffer.id || response.sideQuestOffer.title;
                    npcRelationshipService.addOrUpdateRelationship(signatureNPC);
                  }
                } catch (error) {
                  console.error('Error linking signature NPC with quest:', error);
                }
              })()
            );
          }
          
          // Task 3: Parse character status from AI response
          parallelTasks.push(
            (async () => {
              try {
                npcRelationshipService.parseCharacterStatusFromAIResponse(response, newSceneState.location);
              } catch (error) {
                console.error('Error parsing character status:', error);
              }
            })()
          );
          
          // Task 4: NPC Analysis (if narrative exists)
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

          // Task 5: Action Suggestions
          parallelTasks.push(
            loadActionSuggestions().catch(error => {
              console.error('Error loading action suggestions:', error);
            })
          );

          // Task 6: Duration Estimation - PRIORITY: Must complete before time update
          if (durationEstimationTask) {
            try {
              const durationResult = await durationEstimationTask;
              durationMinutes = durationResult.duration;
            } catch (error) {
              console.error('Error estimating action duration:', error);
              // Keep default durationMinutes = 5
              durationMinutes = 5;
            }
          }

          // Task 7: ComfyUI Image Generation (parallel)
          const comfyUISettings = comfyUIService.getSettings();
          if (comfyUISettings.enabled) {
            parallelTasks.push(
              generateImageForResponse(response, newSceneState, aiMessage).catch(error => {
                console.error('Error generating image:', error);
              })
            );
          }

          // Run remaining tasks in parallel for maximum performance
          await Promise.all(parallelTasks);

          // Advance world time by minutes after duration estimation is complete
          if (isTravelAction) {
            // Handle travel actions - get travel time from locationService
            const currentPlayerLocation = locationService.getCurrentLocation();
            
            if (currentPlayerLocation) {
              const locationName = currentMessage.trim().replace('Bạn di chuyển đến ', '').trim();
              
              const worldDataParsed = JSON.parse(worldData);
              const targetLocation = worldDataParsed.locations?.find((loc: any) => 
                loc.name === locationName
              );
              
              if (targetLocation) {
                const travelInfo = locationService.getTravelInfo(currentPlayerLocation.currentLocationId, targetLocation.id);
                durationMinutes = travelInfo.travelMinutes;
                
                if (gameState.worldTime) {
                  newTime = worldTimeService.advanceMinutes(gameState.worldTime, durationMinutes);
                  
                  // ✅ Update player location AFTER travel time calculation
                  const newPlayerLocation = {
                    currentLocationId: targetLocation.id,
                    locationHistory: [
                      ...(currentPlayerLocation.locationHistory || []),
                      {
                        locationId: targetLocation.id,
                        arrivedAt: newTime,
                        turn: turnCounter + 1
                      }
                    ]
                  };
                  locationService.savePlayerLocation(newPlayerLocation);
                  
                  // ✅ Update sceneState.location from player_location after travel
                  newSceneState.location = targetLocation.id;
                  newSceneState.worldTime = newTime; // ✅ Also update sceneState.worldTime
                } else {
                  console.error(`❌ [Travel Time] gameState.worldTime is null! Cannot advance time.`);
                  newTime = gameState.worldTime;
                }
              } else {
                console.error(`❌ [Travel Time] Target location "${locationName}" not found! Available locations:`, worldDataParsed.locations?.map((loc: any) => loc.name));
                newTime = gameState.worldTime;
              }
            } else {
              console.error(`❌ [Travel Time] Current player location not found!`);
              newTime = gameState.worldTime;
            }
          } else {
            // Handle non-travel actions
            if (gameState.worldTime) {
              newTime = worldTimeService.advanceMinutes(gameState.worldTime, durationMinutes);
            } else {
              console.error(`❌ [Time Update] gameState.worldTime is null! Cannot advance time.`);
              newTime = gameState.worldTime; // Keep original time
            }
          }

          // Update game state with correct worldTime after time calculation
          
          // ✅ Update sceneState.worldTime for all cases (not just travel)
          newSceneState.worldTime = newTime;
          
          setGameState(prev => ({
            ...prev,
            sceneState: newSceneState, // This now includes updated location and worldTime
            storyProgress: response.storyProgress,
            worldTime: newTime,
            sccContext: updatedSccContext,
            playerLocation: locationService.getCurrentLocation() // Update player location after travel
          }));

          // Save updated time to localStorage
          if (newTime) {
            // Load complete world data first to preserve all fields including locations
            const completeWorldData = localStorage.getItem('world_gen_result');
            if (completeWorldData) {
              const worldDataParsed = JSON.parse(completeWorldData);
              worldDataParsed.currentTime = newTime;
              worldDataParsed.worldTime = newTime; // ✅ Also update worldTime field
              localStorage.setItem('world_gen_result', JSON.stringify(worldDataParsed));
            }
          }

          // Save sceneState to localStorage
          localStorage.setItem('rp_scene_state', JSON.stringify(newSceneState));

          // Task 8: Check and restock merchant shops
          if (newTime) {
            try {
              await locationService.checkAndRestockAllShops(newTime);
            } catch (error) {
              console.error('Error checking merchant shops:', error);
            }
          }

          // Task 9: Create Action Log Entry (after time calculation is complete)
          // Skip action log for attack actions and DC check actions - will be created after AI response
          if (newTime && !isAttackAction && !isDCCheckAction) {
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
                  startedAt: originalWorldTime!,
                  endedAt: newTime,
                  turn: turnCounter + 1,
                  impactTags: selectedSuggestion.impactTags,
                  source: 'suggestion',
                  dcCheckResult: currentDcCheckResult || undefined,
                  attackAction: (selectedSuggestion.attackTarget || selectedSuggestion.impactTags.some(tag => 
                    tag === 'attack' || tag.endsWith('Attack')
                  )) ? {
                    targetNPC: selectedSuggestion.attackTarget?.npcName || 'Unknown NPC',
                    accepted: false // Will be updated when user accepts/declines
                  } : undefined
                };
              }
            } else {
              // Manual action - generate summary and estimate impact
              const actionSummary = await generateActionSummary(currentMessage.trim(), gameState);
              const impactTags = estimateImpactTags(currentMessage.trim());
              
              // For travel actions, durationMinutes is already set correctly above
              let finalDurationMinutes = durationMinutes;
              let finalEndedAt = newTime;
              
              actionLogEntry = {
                id: `action_${Date.now()}`,
                actionId: undefined,
                text: currentMessage.trim(),
                summary: actionSummary,
                durationMinutes: finalDurationMinutes,
                startedAt: originalWorldTime!,
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
        
        // Process pending attack action after AI response
        if (isAttackAction) {
          try {
            const pendingAttackAction = localStorage.getItem('pending_attack_action');
            if (pendingAttackAction) {
              const attackSuggestion = JSON.parse(pendingAttackAction);
              // Clear the pending attack action
              localStorage.removeItem('pending_attack_action');
              
              // Create action log entry for attack action
              if (gameState.worldTime && newTime) {
                const actionLogEntry: ActionLogEntry = {
                  id: `action_${Date.now()}`,
                  actionId: currentSelectedSuggestionId || undefined,
                  text: currentMessage.trim(),
                  summary: attackSuggestion.summary,
                  durationMinutes: durationMinutes,
                  startedAt: gameState.worldTime,
                  endedAt: newTime,
                  turn: turnCounter + 1,
                  impactTags: attackSuggestion.impactTags,
                  source: 'suggestion',
                  attackAction: {
                    targetNPC: attackSuggestion.attackTarget?.npcName || 'Unknown NPC',
                    accepted: false // Will be updated when user accepts/declines
                  }
                };
                
                // Save action log
                actionSuggestionService.saveActionLog(actionLogEntry);
                setActionLog(prev => [actionLogEntry, ...prev]);
              }
              
              // Show NPCChallengeModal
              await handleAttackAction(attackSuggestion);
            }
          } catch (error) {
            console.error('Error processing pending attack action:', error);
          }
        }
        
        // Process DC check action after AI response
        if (isDCCheckAction && currentDcCheckResult) {
          try {
            const selectedSuggestion = actionSuggestions.find(s => s.id === currentSelectedSuggestionId);
            if (selectedSuggestion && gameState.worldTime && newTime) {
              const actionLogEntry: ActionLogEntry = {
                id: `action_${Date.now()}`,
                actionId: currentSelectedSuggestionId || undefined,
                text: currentMessage.trim(),
                summary: selectedSuggestion.summary,
                durationMinutes: durationMinutes,
                startedAt: gameState.worldTime,
                endedAt: newTime,
                turn: turnCounter + 1,
                impactTags: selectedSuggestion.impactTags,
                source: 'suggestion',
                dcCheckResult: currentDcCheckResult
              };
              
              // Save action log
              actionSuggestionService.saveActionLog(actionLogEntry);
              setActionLog(prev => [actionLogEntry, ...prev]);
            }
          } catch (error) {
            console.error('Error processing DC check action:', error);
          }
        }
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
      
      // Hiển thị thông báo lỗi cụ thể từ Google SDK thay vì thông báo chung chung
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      
      // Kiểm tra nếu đây là lỗi từ thông báo lỗi cụ thể (legacy check)
      if (errorMessage.includes('PHÁT HIỆN THÔNG BÁO LỖI CỤ THỂ')) {
        // Nếu là lỗi legacy, vẫn hiển thị thông báo chung chung để tránh break
        setError('Xin lỗi, có lỗi xảy ra khi xử lý phản hồi từ AI. Vui lòng thử lại.');
      } else {
        // Hiển thị thông báo lỗi cụ thể từ Google SDK
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

  // Throttled sendMessage to prevent spam
  const throttledSendMessage = useCallback(async () => {
    // Check if there are any minimized modals
    if (hasMinimizedModals) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    const minInterval = 2000; // Minimum 2 seconds between requests
    
    if (timeSinceLastRequest < minInterval) {
      return;
    }
    
    lastRequestTimeRef.current = now;
    await sendMessage();
  }, [hasMinimizedModals, currentMessage, isLoading, isAIProcessing, isNPCAnalysisProcessing, turnCounter, gameState, questSystem, actionSuggestions, selectedSuggestionId, backupSuggestions, processedQuests, chatHistory, worldTimeService, sccService, geminiService, actionSuggestionService, inventoryService, npcRelationshipService, questCompletionService, locationService, loadServices, retryNPCAnalysis, loadActionSuggestions, generateActionSummary, estimateImpactTags, validateAIResponse]);

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
      setTimeout(() => setSaveMessage(null), 3000); // Tắt timeout
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

      // Get current merchant shops data
      const merchantShopsData = merchantService.exportForSaveGame();

      // Get combat history from localStorage
      const combatHistory = JSON.parse(localStorage.getItem('combat_history') || '{"defeatedEnemies":[]}');

      // Get player fled random combat data from localStorage
      const playerFledRandomCombatData = (() => {
        try {
          const fledData = localStorage.getItem('player_fled_random_combat');
          return fledData ? JSON.parse(fledData) : null;
        } catch (error) {
          console.error('Error parsing player_fled_random_combat data:', error);
          return null;
        }
      })();

      const saveGame: SaveGame = {
        version: '2.6.1',
        meta: {
          slotId,
          updatedAt: Date.now(),
          source: 'local' as const,
          pendingSync: true
        },
        world: worldParsed,
        character: characterParsed,
        scenario: JSON.parse(scenarioData),
        summary: sccData ? JSON.parse(sccData) : { content: '', sceneState: {} },
        sceneState: sceneState ? (() => {
          const parsedSceneState = JSON.parse(sceneState);
          // Loại bỏ mainQuests khỏi sceneState nếu có
          if (parsedSceneState.mainQuests) {
            delete parsedSceneState.mainQuests;
          }
          return parsedSceneState;
        })() : {},
        chat: chatHistory,
        turnCounter: savedTurnCounter,
        worldTime: gameState.worldTime || { day: 1, hour: 12, minute: 0, month: 1, year: 1, dayOfWeek: 1 },
        questSystem: questSystemData ? JSON.parse(questSystemData) : undefined,
        npcRelationships: npcRelationshipData,
        ui: { showSummaryBanner: gameState.showSummaryBanner, lastSummaryTurn: gameState.lastSummaryTurn },
        contentFlags: gameState.contentFlags || { adult_enabled: false, adult_intensity: 'fade', first_time_setup: true },
        actionSuggestions: actionSuggestions,
        actionLog: actionLog,
        playerLocation: playerLocationData ? JSON.parse(playerLocationData) : undefined,
        combatHistory: combatHistory,
        playerFledRandomCombat: playerFledRandomCombatData,
        merchantShops: merchantShopsData.shops
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
          updatedSaveGame.playerLocation,
          updatedSaveGame.combatHistory
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
        setTimeout(() => setSaveMessage(null), 3000); // Tắt timeout
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
      throttledSendMessage();
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

  // Merchant Shop handlers
  const handleOpenShop = async (locationId: string) => {
    
    try {
      // Import merchantService dynamically
      const { merchantService } = await import('../services/merchantService');
      
      // Get or create shop for this location
      let shop = merchantService.getMerchantShopByLocation(locationId);
      if (!shop) {
        shop = await merchantService.ensureMerchantShopExists(locationId);
      }
      
      if (shop) {
        setCurrentShop(shop);
        setShowMerchantShop(true);
      } else {
        console.error('Failed to get or create shop for location:', locationId);
      }
    } catch (error) {
      console.error('Error in handleOpenShop:', error);
    }
  };

  const handleBuyItem = async (item: InventoryItem, shop: MerchantShop) => {
    try {
      const characterData = localStorage.getItem('currentCharacter');
      if (!characterData) return;

      const character = JSON.parse(characterData);
      const merchant = tradingService.getMerchantRelationship(shop.locationId);
      
      const result = tradingService.processBuyTransaction(character, item, merchant);
      
      if (result.success) {
        // Update character data
        localStorage.setItem('currentCharacter', JSON.stringify(character));
        
        // Decrease item quantity in shop
        const { merchantService } = await import('../services/merchantService');
        merchantService.decreaseItemQuantity(shop.locationId, item.id);
        
        // Refresh current shop data
        const updatedShop = merchantService.getMerchantShopByLocation(shop.locationId);
        if (updatedShop) {
          setCurrentShop(updatedShop);
        }
        
        // Update character state
        setCharacterDataUpdate(prev => prev + 1);
        
        // Add to trading history
        tradingHistoryService.saveBuyTransaction(
          item.name,
          item.type || 'misc',
          1, // quantity
          result.finalPrice,
          result.finalPrice,
          shop.locationId,
          undefined, // merchantName
          gameState.worldTime || undefined,
          turnCounter + 1
        );
        
        // Update action log display (without trading entries)
        // Trading entries are now handled by tradingHistoryService
        
        // Update relationship
        tradingService.updateRelationshipAfterTrade(character, merchant, 'buy', result.finalPrice);
      }
    } catch (error) {
      console.error('Error buying item:', error);
    }
  };

  const handleSellItem = async (item: InventoryItem, shop: MerchantShop) => {
    try {
      const characterData = localStorage.getItem('currentCharacter');
      if (!characterData) return;

      const character = JSON.parse(characterData);
      const merchant = tradingService.getMerchantRelationship(shop.locationId);
      
      const result = tradingService.processSellTransaction(character, item, merchant);
      
      if (result.success) {
        // Update character data
        localStorage.setItem('currentCharacter', JSON.stringify(character));
        
        // Update character state
        setCharacterDataUpdate(prev => prev + 1);
        
        // Add to trading history
        tradingHistoryService.saveSellTransaction(
          item.name,
          item.type || 'misc',
          item.quantity || 1,
          result.finalPrice / (item.quantity || 1), // unit price
          result.finalPrice, // total price
          shop.locationId,
          undefined, // merchantName
          gameState.worldTime || undefined,
          turnCounter + 1
        );
        
        // Update action log display (without trading entries)
        // Trading entries are now handled by tradingHistoryService
        
        // Update relationship
        tradingService.updateRelationshipAfterTrade(character, merchant, 'sell', result.finalPrice);
      }
    } catch (error) {
      console.error('Error selling item:', error);
    }
  };

  const handleUseSkillBook = async (skillBook: SkillBook) => {
    try {
      const characterData = localStorage.getItem('currentCharacter');
      if (!characterData) return;

      const character = JSON.parse(characterData);
      const result = skillBookService.useSkillBook(character, skillBook);
      
      if (result.success) {
        // Update character data
        localStorage.setItem('currentCharacter', JSON.stringify(character));
        
        // Update character state
        setCharacterDataUpdate(prev => prev + 1);
        
        // Add to action log (skill book usage is not trading)
        actionSuggestionService.saveActionLog({
          id: `action_${Date.now()}`,
          actionId: undefined,
          text: `Sử dụng skill book: ${skillBook.name}`,
          summary: `Học skill: ${result.skill?.name || 'Unknown'}`,
          durationMinutes: 0,
          startedAt: gameState.worldTime!,
          endedAt: gameState.worldTime!,
          turn: turnCounter + 1,
          impactTags: ['skill', 'learning'],
          source: 'manual'
        });
        
        // Update action log display
        setActionLog(prev => [{
          id: `action_${Date.now()}`,
          actionId: undefined,
          text: `Sử dụng skill book: ${skillBook.name}`,
          summary: `Học skill: ${result.skill?.name || 'Unknown'}`,
          durationMinutes: 0,
          startedAt: gameState.worldTime!,
          endedAt: gameState.worldTime!,
          turn: turnCounter + 1,
          impactTags: ['skill', 'learning'],
          source: 'manual'
        }, ...prev.slice(0, 99)]);
        
        // Close skill book preview
        setShowSkillBookPreview(false);
        setSelectedSkillBook(null);
      }
    } catch (error) {
      console.error('Error using skill book:', error);
    }
  };


  const handleNegotiationComplete = (_newPrice: number) => {
    setShowNegotiationPanel(false);
    setNegotiationData(null);
  };

  // Handle skip time
  const handleSkipTime = () => {
    if (!gameState.worldTime) return;
    
    // Add hours to current time
    const newTime = worldTimeService.advanceTime(gameState.worldTime, skipHours);
    
    // Calculate health recovery based on rest duration
    let healthRecoveryPercent = 0;
    if (skipHours >= 2 && skipHours < 4) {
      healthRecoveryPercent = 0.25; // 25% for 2-4 hours
    } else if (skipHours >= 4 && skipHours < 6) {
      healthRecoveryPercent = 0.50; // 50% for 4-6 hours
    } else if (skipHours >= 6) {
      healthRecoveryPercent = 0.75; // 75% for 6+ hours
    }
    
    // Apply health recovery to character
    if (healthRecoveryPercent > 0) {
      try {
        const characterData = localStorage.getItem('currentCharacter');
        if (characterData) {
          const character = JSON.parse(characterData);
          
          if (character.health && character.health.max) {
            const maxHealth = character.health.max;
            const currentHealth = character.health.current;
            const healthToRecover = Math.floor(maxHealth * healthRecoveryPercent);
            const newHealth = Math.min(maxHealth, currentHealth + healthToRecover);
            
            character.health.current = newHealth;
            
            // Save updated character
            localStorage.setItem('currentCharacter', JSON.stringify(character));
            
            // Update character in game state
            setGameState(prev => ({
              ...prev,
              character: character
            }));
            
          }
        }
      } catch (error) {
        console.error('Error applying health recovery:', error);
      }
    }
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      worldTime: newTime
    }));
    
    // Close modal and reset
    setShowSkipTimeModal(false);
    setSkipHours(2);
    
    // Show success message with health recovery info
    let message = `Đã nghỉ ngơi ${skipHours} giờ. Thời gian hiện tại: ${newTime.hour}:${newTime.minute.toString().padStart(2, '0')}`;
    if (healthRecoveryPercent > 0) {
      message += ` (+${Math.round(healthRecoveryPercent * 100)}% máu)`;
    }
    
    setSaveMessage(message);
    setTimeout(() => setSaveMessage(null), 3000); // Tắt timeout
  };

  // NPC Challenge handlers
  const handleAcceptChallenge = async () => {
    if (!npcChallengeData) return;
    
    try {
      // Add player message to chat
      const playerMessage: ChatMessageType = {
        role: 'player',
        content: currentMessage.trim(),
        timestamp: new Date(),
        turn: turnCounter + 1
      };
      setChatHistory(prev => [...prev, playerMessage]);
      
      // Update attack action in action log
      if (selectedSuggestionId) {
        const actionLog = actionSuggestionService.getActionLog();
        const updatedLog = actionLog.map(entry => {
          if (entry.actionId === selectedSuggestionId && entry.attackAction) {
            return {
              ...entry,
              attackAction: {
                ...entry.attackAction,
                accepted: true
              }
            };
          }
          return entry;
        });
        actionSuggestionService.saveActionLog(updatedLog[0]); // Save the updated entry
        setActionLog(updatedLog);
      }
      
      // Navigate to combat with NPC challenge data
      const enemy = {
        id: npcChallengeData.npcId,
        name: npcChallengeData.npcName,
        description: `Một ${npcChallengeData.npcName} đang tức giận vì bị tấn công.`,
        type: 'humanoid',
        level: npcChallengeData.combatStats.level || npcChallengeData.combatStats.combatLevel || 1,
        combatLevel: npcChallengeData.combatStats.combatLevel || npcChallengeData.combatStats.level || 1,
        characterLevel: npcChallengeData.combatStats.characterLevel,
        stats: npcChallengeData.combatStats.stats || {
          strength: 10,
          agility: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
          modifiers: {
            strength: 0,
            agility: 0,
            constitution: 0,
            intelligence: 0,
            wisdom: 0,
            charisma: 0
          }
        },
        health: npcChallengeData.combatStats.health || { current: 20, max: 20 },
        armorClass: npcChallengeData.combatStats.armorClass || 10,
        attacks: npcChallengeData.combatStats.attacks || [],
        abilities: npcChallengeData.combatStats.abilities,
        experienceReward: (npcChallengeData.combatStats.combatLevel || npcChallengeData.combatStats.level || 1) * 10,
        npcId: npcChallengeData.npcId
      };
      
      const combatData = {
        type: 'npc_challenge',
        enemies: [enemy],
        worldDifficulty: 'medium'
      };
      
      // Store combat data for CombatPage
      localStorage.setItem('pending_combat', JSON.stringify(combatData));
      
      // Close modal and navigate
      setShowNPCChallengeModal(false);
      setNpcChallengeData(null);
      
      // Navigate to combat
      window.location.href = '/combat';
    } catch (error) {
      console.error('Error starting NPC challenge combat:', error);
    }
  };

  const handleDeclineChallenge = () => {
    // Update attack action in action log
    if (selectedSuggestionId) {
      const actionLog = actionSuggestionService.getActionLog();
      const updatedLog = actionLog.map(entry => {
        if (entry.actionId === selectedSuggestionId && entry.attackAction) {
          return {
            ...entry,
            attackAction: {
              ...entry.attackAction,
              accepted: false
            }
          };
        }
        return entry;
      });
      actionSuggestionService.saveActionLog(updatedLog[0]); // Save the updated entry
      setActionLog(updatedLog);
    }
    
    // Close modal
    setShowNPCChallengeModal(false);
    setNpcChallengeData(null);
    
    // Clear current message and selection
    setCurrentMessage('');
    setSelectedSuggestionId(null);
  };

  // Generate image for AI response
  const generateImageForResponse = async (
    response: any, 
    sceneState: any, 
    aiMessage: ChatMessageType
  ): Promise<void> => {
    try {
      const settings = comfyUIService.getSettings();
      if (!settings.enabled) return;
      
      // Check if this message already has an image or is already generating
      if (aiMessage.imageUrl || aiMessage.isGeneratingImage || aiMessage.hasImageGenerationFailed) {
        return;
      }
      
      // Mark as generating
      aiMessage.isGeneratingImage = true;
      
      // Check if server is available
      const isHealthy = await comfyUIService.checkHealth();
      if (!isHealthy) {
        console.warn('ComfyUI server not available, skipping image generation');
        aiMessage.isGeneratingImage = false;
        aiMessage.hasImageGenerationFailed = true;
        return;
      }
      
      // Extract prompt from AI response
      const { prompt, negativePrompt } = await promptExtractionService.extractVisualPrompt(
        response.narrative,
        { 
          location: sceneState.location, 
          npcs: sceneState.npcs, 
          items: sceneState.availableItems 
        },
        settings.style,
        settings.customStyle,
        settings.qualityLevel,
        settings.enableCharacterConsistency
      );
      
      // Generate image
      const imageBase64 = await comfyUIService.generateImage(prompt, negativePrompt, settings.resolution);
      
      // Save image to local storage
      const filename = `game_${Date.now()}.png`;
      const filepath = await imageStorageService.saveImage(imageBase64, filename);
      
      // Attach image to AI message
      aiMessage.imageUrl = filepath;
      aiMessage.imagePrompt = prompt;
      aiMessage.isGeneratingImage = false;
      aiMessage.hasImageGenerationFailed = false;
      
      // Update chat history with image
      setChatHistory(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (updated[lastIndex].role === 'ai') {
          updated[lastIndex] = aiMessage;
        }
        return updated;
      });
      
      // Save to localStorage
      const currentChat = JSON.parse(localStorage.getItem('rp_chat') || '[]');
      const updatedChat = currentChat.map((msg: any, index: number) => {
        if (index === currentChat.length - 1 && msg.role === 'ai') {
          return { 
            ...msg, 
            imageUrl: filepath, 
            imagePrompt: prompt,
            isGeneratingImage: false,
            hasImageGenerationFailed: false
          };
        }
        return msg;
      });
      localStorage.setItem('rp_chat', JSON.stringify(updatedChat));
      
    } catch (error) {
      console.error('Error generating image for response:', error);
      // Mark as failed
      aiMessage.isGeneratingImage = false;
      aiMessage.hasImageGenerationFailed = true;
      
      // Update chat history with failed state
      setChatHistory(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (updated[lastIndex].role === 'ai') {
          updated[lastIndex] = aiMessage;
        }
        return updated;
      });
      
      // Don't throw error - image generation is optional
    }
  };


  // Xử lý load game từ SaveManager
  const handleLoadGame = async (saveGame: SaveGame) => {
    try {
      // Load services trước khi sử dụng
      await loadServices();
      
      // Clear existing NPC data before loading save
      npcRelationshipService.clearAllData();
      
      // Clear existing merchant shops before loading save
      merchantService.clearAllMerchantShops();
      
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
      
      // Restore ComfyUI settings
      if (saveGame.comfyUISettings) {
        comfyUIService.saveSettings(saveGame.comfyUISettings);
      }

      // Restore player fled random combat data
      if (saveGame.playerFledRandomCombat) {
        localStorage.setItem('player_fled_random_combat', JSON.stringify(saveGame.playerFledRandomCombat));
      } else {
        // Clear if not present in save game
        localStorage.removeItem('player_fled_random_combat');
      }

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
      
      // Khôi phục merchant shops data nếu có
      if (saveGame.merchantShops) {
        merchantService.loadFromSaveGame({ shops: saveGame.merchantShops });
      }
      
      // Khôi phục player location nếu có
      if (saveGame.playerLocation) {
        locationService.savePlayerLocation(saveGame.playerLocation);
      }
      
      // Khôi phục combat history nếu có
      if (saveGame.combatHistory) {
        localStorage.setItem('combat_history', JSON.stringify(saveGame.combatHistory));
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
    const combatHistory = JSON.parse(localStorage.getItem('combat_history') || '{"defeatedEnemies":[]}');
    const merchantShopsData = merchantService.exportForSaveGame();
    
    const gameData = {
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
      playerLocation: gameState.playerLocation,
      combatHistory: combatHistory,
      merchantShopsData: merchantShopsData
    };
    
    return gameData;
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
    
    // Kiểm tra loại hành động của tin nhắn này
    const messageTurn = chatHistory[messageIndex]?.turn;
    if (messageTurn) {
      // Tìm action log entry tương ứng với turn này
      const actionEntry = actionLog.find(entry => entry.turn === messageTurn);
      
      if (actionEntry) {
        // Nếu là hành động từ gợi ý hoặc di chuyển, không cho phép resend
        if (actionEntry.source === 'suggestion' || actionEntry.source === 'travel') {
          // Hiển thị thông báo yêu cầu chọn lại từ UI
          if (actionEntry.source === 'suggestion') {
            alert('Hành động này từ gợi ý. Vui lòng chọn lại từ danh sách gợi ý hành động bên trái.');
          } else if (actionEntry.source === 'travel') {
            alert('Hành động di chuyển này. Vui lòng chọn lại địa điểm trên bản đồ để di chuyển.');
          }
          return;
        }
      }
    }
    
    // Haptic feedback for mobile (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration
    }
    
    // Visual feedback - tắt timeout
    setResendingMessageIndex(messageIndex);
    setTimeout(() => setResendingMessageIndex(null), 1000); // Tắt timeout
    
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

  // Kiểm tra xem có nên hiển thị nút gửi lại cho tin nhắn này không
  const shouldShowResendButton = (messageIndex: number): boolean => {
    const message = chatHistory[messageIndex];
    if (!message || message.role !== 'player') return false;
    
    // Kiểm tra loại hành động của tin nhắn này
    const messageTurn = message.turn;
    if (messageTurn) {
      // Tìm action log entry tương ứng với turn này
      const actionEntry = actionLog.find(entry => entry.turn === messageTurn);
      
      if (actionEntry) {
        // Chỉ hiển thị nút gửi lại cho hành động manual (thủ công/chat)
        return actionEntry.source === 'manual';
      }
    }
    
    // Mặc định hiển thị nút gửi lại cho tin nhắn player (backward compatibility)
    return true;
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
        
        // Update coreStats with recalculated values from inventoryService
        if (characterData.coreStats) {
          // Get the updated character from inventoryService to sync coreStats
          const updatedCharacter = inventoryService.getCharacter();
          if (updatedCharacter && updatedCharacter.coreStats) {
            characterData.coreStats.armorClass = updatedCharacter.coreStats.armorClass;
            characterData.coreStats.modifiers = updatedCharacter.coreStats.modifiers;
          }
        }
        
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
        
        // Update coreStats with recalculated values from inventoryService
        if (characterData.coreStats) {
          // Get the updated character from inventoryService to sync coreStats
          const updatedCharacter = inventoryService.getCharacter();
          if (updatedCharacter && updatedCharacter.coreStats) {
            characterData.coreStats.armorClass = updatedCharacter.coreStats.armorClass;
            characterData.coreStats.modifiers = updatedCharacter.coreStats.modifiers;
          }
        }
        
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
    // Check if item exists
    const item = inventoryService.findItemInInventory(itemId);
    if (!item) return;
    
    // Show custom modal instead of browser dialog
    setItemToDiscard(item);
    setShowDiscardModal(true);
  };

  const handleDiscard = (quantity: number) => {
    if (!itemToDiscard) return;
    
    const success = inventoryService.removeItem(itemToDiscard.id, quantity);
    if (success) {
      updateCharacterDataAfterInventoryChange();
    }
  };

  const updateCharacterDataAfterInventoryChange = () => {
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
  };

  const handleViewItemDetails = (_item: InventoryItem) => {
    // TODO: Implement item details modal
  };

  // Random combat modal handlers
  const handleFightRandomCombat = () => {
    if (!randomCombatData) return;
    
    // Clear flee data when starting combat (player chose to fight)
    localStorage.removeItem('player_fled_random_combat');
    
    // Store combat data in localStorage for CombatPage to read
    const combatData = {
      type: 'random_encounter',
      enemies: [randomCombatData.enemy],
      location: randomCombatData.location,
      reason: randomCombatData.reason,
      turn: turnCounter || 0
    };
    
    localStorage.setItem('pending_combat', JSON.stringify(combatData));
    
    // Close modal and navigate to combat
    setShowRandomCombatModal(false);
    setRandomCombatData(null);
    navigate('/combat');
  };

  const handleFleeRandomCombat = () => {
    if (!randomCombatData) return;
    
    // Close modal without starting combat
    setShowRandomCombatModal(false);
    
    // Get enemy name for the flee message
    const enemyName = randomCombatData.enemy?.name || 'kẻ thù';
    
    // Create flee message that cannot be edited
    const fleeMessage = `Bạn tránh né cuộc tấn công của ${enemyName}`;
    
    // Set the flee message as combat result text (non-editable)
    setCombatResultText(fleeMessage);
    setHasCombatResult(true);
    setCurrentMessage(fleeMessage);
    
    // Mark that player fled from random combat to reset encounter chance
    localStorage.setItem('player_fled_random_combat', JSON.stringify({
      timestamp: Date.now(),
      turn: turnCounter || 0,
      enemyName: enemyName
    }));
    
    // ADDED: Save flee information to combat_history for encounter rate reset
    try {
      const currentTurn = parseInt(localStorage.getItem('game_turn_counter') || '0');
      
      // Create a CombatResultData for random encounter flee
      const fleeCombatData = {
        combatId: `flee_random_${Date.now()}`,
        duration: 0,
        victory: false,
        playerFled: true,
        enemyNames: [enemyName],
        enemiesDefeated: [],
        characterUpdates: {
          healthBefore: 0,
          healthAfter: 0,
          healthLost: 0,
          experienceGained: 0,
          combatLevelBefore: 0,
          combatLevelAfter: 0,
          leveledUp: false,
          totalDamageDealt: 0,
          totalDamageTaken: 0,
          turnsPlayed: 0,
          attacksLanded: 0,
          attacksMissed: 0
        },
        rewards: {
          experience: 0,
          items: []
        },
        metadata: {
          gameTurn: currentTurn
        }
      };
      
      combatDataService.addToCombatHistory(fleeCombatData);
    } catch (error) {
      console.error('Error updating combat_history with random encounter flee:', error);
    }
    
    // Clear random combat data
    setRandomCombatData(null);
    
    // Clear combatInitiation from sceneState
    setGameState(prev => ({
      ...prev,
      sceneState: {
        ...prev.sceneState,
        combatInitiation: undefined
      }
    }));
    
  };

  const handleCloseRandomCombatModal = () => {
    // Close modal without starting combat
    setShowRandomCombatModal(false);
    setRandomCombatData(null);
    
    // Clear combatInitiation from sceneState
    setGameState(prev => ({
      ...prev,
      sceneState: {
        ...prev.sceneState,
        combatInitiation: undefined
      }
    }));
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
                <span>
                  {isGeneratingOpeningImage ? 'Đang tạo ảnh mở đầu...' : 'Đang tạo kịch bản...'}
                </span>
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
              {/* Quest Combat Debug Button */}
              <button
                onClick={() => setShowQuestCombatDebug(true)}
                className="p-2 bg-orange-800 border border-orange-700 text-white rounded-lg hover:bg-orange-900 transition-colors duration-200 mobile-button touch-feedback"
                title="Quest Combat Debug"
              >
                <Sword className="w-4 h-4" />
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
          {memoizedChatHistory.map((message, index) => (
            <MotionWrapper
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'player' ? 'justify-end' : 'justify-start'} gpu-accelerated`}
            >
              <div className={`relative group ${message.role === 'player' ? 'flex items-start space-x-2' : ''}`}>
                {/* Resend button for player messages - chỉ hiển thị cho hành động manual */}
                {message.role === 'player' && shouldShowResendButton(index) && (
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
                  
                  {/* Image display for AI messages - moved below content */}
                  {message.role === 'ai' && message.imageUrl && (
                    <ImageDisplay 
                      filepath={message.imageUrl} 
                      prompt={message.imagePrompt} 
                    />
                  )}

                  {/* Manual image generation button for AI messages */}
                  {message.role === 'ai' && (
                    <div className="mt-3 flex justify-end">
                      <ImageGenerationButton
                        message={message}
                        onImageGenerated={handleImageGenerated}
                        onImageGenerationStart={handleImageGenerationStart}
                        onImageGenerationError={handleImageGenerationError}
                        sceneState={{
                          location: gameState.sceneState?.location || null,
                          npcs: gameState.sceneState?.npcs || [],
                          items: availableItems || []
                        }}
                        className="text-xs"
                      />
                    </div>
                  )}
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
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                hasMinimizedModals
                  ? "Có modal đang minimize - hãy khôi phục trước khi tiếp tục"
                  : selectedSuggestionId 
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
                hasMinimizedModals
                  ? 'border-red-700 focus:border-red-700 opacity-75'
                  : selectedSuggestionId
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
              disabled={!!selectedSuggestionId || isTravelActionSelected || hasMinimizedModals}
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
              onClick={throttledSendMessage}
              disabled={!currentMessage.trim() || isLoading || isAIProcessing || isNPCAnalysisProcessing || hasMinimizedModals}
              className={`px-3 sm:px-4 py-3 border rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${shouldUseMobileLayout() ? 'min-h-[48px] min-w-[48px]' : 'mobile-button'} touch-feedback ${
                hasMinimizedModals
                  ? 'bg-red-800 border-red-700 text-white'
                  : isAIProcessing || isNPCAnalysisProcessing
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
            onOpenShop={handleOpenShop}
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

      {/* NPC Challenge Modal */}
      <Suspense fallback={null}>
        <NPCChallengeModal
          isOpen={showNPCChallengeModal}
          onClose={() => {
            setShowNPCChallengeModal(false);
            setNpcChallengeData(null);
          }}
          onAcceptChallenge={handleAcceptChallenge}
          onDeclineChallenge={handleDeclineChallenge}
          challengeData={npcChallengeData}
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

      {/* Random Combat Modal */}
      {showRandomCombatModal && randomCombatData && (
        <RandomCombatModal
          isOpen={showRandomCombatModal}
          onClose={handleCloseRandomCombatModal}
          onFight={handleFightRandomCombat}
          onFlee={handleFleeRandomCombat}
          enemy={randomCombatData.enemy}
          location={randomCombatData.location}
          reason={randomCombatData.reason}
        />
      )}

      {/* Quest Combat Debug Modal */}
      {showQuestCombatDebug && (
        <QuestCombatDebug
          onClose={() => setShowQuestCombatDebug(false)}
        />
      )}

      {/* Discard Item Modal */}
      <DiscardItemModal
        isOpen={showDiscardModal}
        onClose={() => {
          setShowDiscardModal(false);
          setItemToDiscard(null);
        }}
        item={itemToDiscard}
        onDiscard={handleDiscard}
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
                
                {/* Health Recovery Info */}
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-400">Hồi máu khi nghỉ ngơi</span>
                  </div>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div className="flex justify-between">
                      <span>2-4 giờ:</span>
                      <span className="text-green-400">+25% máu</span>
                    </div>
                    <div className="flex justify-between">
                      <span>4-6 giờ:</span>
                      <span className="text-green-400">+50% máu</span>
                    </div>
                    <div className="flex justify-between">
                      <span>6+ giờ:</span>
                      <span className="text-green-400">+75% máu</span>
                    </div>
                  </div>
                  
                  {/* Current selection preview */}
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Hồi máu dự kiến:</span>
                      <span className="text-green-400 font-medium">
                        {skipHours >= 2 && skipHours < 4 ? '+25%' : 
                         skipHours >= 4 && skipHours < 6 ? '+50%' : 
                         skipHours >= 6 ? '+75%' : 'Không hồi máu'}
                      </span>
                    </div>
                  </div>
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

      {/* Merchant Shop Modal */}
      <MerchantShopModal
        isOpen={showMerchantShop}
        onClose={() => setShowMerchantShop(false)}
        shop={currentShop}
        character={(() => {
          try {
            const characterData = localStorage.getItem('currentCharacter');
            return characterData ? JSON.parse(characterData) : null;
          } catch {
            return null;
          }
        })()}
        locationId={gameState.sceneState?.location || ''}
        onBuyItem={handleBuyItem}
        onSellItem={handleSellItem}
        onUseSkillBook={handleUseSkillBook}
      />

      {/* Skill Book Preview Modal */}
      {showSkillBookPreview && selectedSkillBook && (
        <SkillBookPreview
          skillBook={selectedSkillBook}
          onClose={() => {
            setShowSkillBookPreview(false);
            setSelectedSkillBook(null);
          }}
          onConfirm={() => {
            if (selectedSkillBook) {
              handleUseSkillBook(selectedSkillBook);
            }
          }}
          isBuying={true}
          price={selectedSkillBook.price}
          canAfford={(() => {
            try {
              const characterData = localStorage.getItem('currentCharacter');
              const character = characterData ? JSON.parse(characterData) : null;
              return character && character.currency >= selectedSkillBook.price;
            } catch {
              return false;
            }
          })()}
        />
      )}

      {/* Negotiation Panel Modal */}
      {showNegotiationPanel && negotiationData && (
        <NegotiationPanel
          isOpen={showNegotiationPanel}
          onClose={() => setShowNegotiationPanel(false)}
          character={(() => {
            try {
              const characterData = localStorage.getItem('currentCharacter');
              return characterData ? JSON.parse(characterData) : null;
            } catch {
              return null;
            }
          })()}
          merchant={tradingService.getMerchantRelationship(currentShop?.locationId || '')}
          basePrice={negotiationData.basePrice}
          type={negotiationData.type}
          onPriceChange={handleNegotiationComplete}
        />
      )}
    </div>
  );
}




