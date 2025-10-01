import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, AlertCircle, Play, RotateCcw, Clock, MessageSquare, FileText, Undo2, Save, Shield, AlertTriangle, Info } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { worldTimeService } from '../services/worldTimeService';
import { sccService } from '../services/sccService';
import { WorldTime, SCCContext, ChatMessage, ContentFlags } from '../types';
import { buildContextForAI } from '../lib/context';
import { SaveManager } from '../components/SaveManager/SaveManager';
import { SavePopup } from '../components/SaveManager/SavePopup';
import { InfoMenu } from '../components/InfoMenu/InfoMenu';
import { SaveGame } from '../types/saveGame';
import { localSaveService } from '../services/saveStorage/localSaveService';
import { cloudSyncService } from '../services/saveStorage/cloudSyncService';
import { useQuestSystem } from '../hooks/useQuestSystem';
import { QuestOfferModal } from '../components/QuestOfferModal/QuestOfferModal';

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
}

export function GamePage() {
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
  
  // Quest offer modal state
  const [showQuestOfferModal, setShowQuestOfferModal] = useState(false);
  const [pendingQuestOffer, setPendingQuestOffer] = useState<any>(null);
  const [processedQuests, setProcessedQuests] = useState<Set<string>>(new Set());
  const [gameState, setGameState] = useState<GameState>({
    scenarioSkeleton: null,
    sceneState: {},
    storyProgress: null,
    isInitialized: false,
    worldTime: null,
    sccContext: null,
    showSummaryBanner: false,
    lastSummaryTurn: 0,
    contentFlags: null
  });

  // Quest system hook
  const {
    questSystem,
    acceptQuest,
    declineQuest,
    declineActiveQuest,
    completeObjective,
    claimReward,
    analyzeChatInput,
    generateSideQuestFromAI
  } = useQuestSystem();
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

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
          
          // Load content flags from SaveGame (không từ localStorage riêng)
          let contentFlags: ContentFlags | null = null;
          // Kiểm tra nếu có save game đã load trước đó
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
          
          console.log('✅ Đã load game data từ localStorage');
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

  const initializeGame = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load world and character data
      const worldData = localStorage.getItem('world_gen_result');
      const characterData = localStorage.getItem('currentCharacter');

      if (!worldData || !characterData) {
        throw new Error('Không tìm thấy dữ liệu thế giới hoặc nhân vật. Vui lòng tạo lại.');
      }

      // Load content flags từ world_gen_result (từ AI generation)
      let contentFlags: ContentFlags = { adult_enabled: false, adult_intensity: 'fade', first_time_setup: true };
      if (worldData) {
        try {
          const worldDataParsed = JSON.parse(worldData);
          if (worldDataParsed.contentFlags) {
            contentFlags = worldDataParsed.contentFlags;
            console.log('✅ Loaded content flags from world_gen_result:', contentFlags);
          }
        } catch (error) {
          console.error('Lỗi parse world_gen_result:', error);
        }
      }

      // Parse world data and get current time
      const worldDataParsed = JSON.parse(worldData);
      const currentTime = worldDataParsed.currentTime || worldTimeService.initializeWorldTime(worldDataParsed.startYear || 1);

      // Generate scenario skeleton
      const scenarioSkeleton = await geminiService.generateScenarioSkeleton(worldData, characterData);
      
      // Generate opening narrative
      const openingNarrative = await geminiService.generateOpeningNarrative(
        worldData, 
        characterData, 
        JSON.stringify(scenarioSkeleton)
      );

      // Save scenario to localStorage
      localStorage.setItem('rp_scenario', JSON.stringify(scenarioSkeleton));

       // Bỏ refresh quest system từ world data - chỉ nhận side quest từ chat
       // Không cần gọi refreshQuestsFromWorld() nữa

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
        contentFlags: contentFlags
      });

      // Save SCC context
      sccService.saveSCCContext(updatedSccContext);

    } catch (error) {
      console.error('Lỗi khởi tạo game:', error);
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const playerMessage: ChatMessage = {
      role: 'player',
      content: currentMessage.trim(),
      timestamp: new Date(),
      turn: turnCounter + 1
    };

    const newChatHistory = [...chatHistory, playerMessage];
    setChatHistory(newChatHistory);
    setCurrentMessage('');
    setIsLoading(true);
    setError(null);

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
        console.log(`🔄 Summarizing at turn ${updatedSccContext.turnCounter}`);
      }

      // Build delta context for AI
      const deltaContext = buildContextForAI(turnCounter + 1); // +1 because we're about to add the current turn
      
      
      // Generate AI response using delta context
      const response = await geminiService.generateTurnResponseWithDelta(
        worldData,
        characterData,
        scenarioData,
        deltaContext.summary,
        deltaContext.sceneState,
        deltaContext.recentTurns.map(msg => ({ role: msg.role, content: msg.content, turn: msg.turn || 0 })),
        currentMessage.trim(),
        gameState.contentFlags || undefined,
        questSystem
      );

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
        // Phân tích chat input để detect quest completion
        const questAnalysis = await analyzeChatInput(currentMessage.trim());
        
        // Xử lý side quest offer từ AI response
        if (response.sideQuestOffer) {
          // Kiểm tra quest đã được xử lý chưa
          const questId = response.sideQuestOffer.id || response.sideQuestOffer.title;
          if (!processedQuests.has(questId)) {
            // Hiển thị modal để người chơi chọn nhận/từ chối
            setPendingQuestOffer(response.sideQuestOffer);
            setShowQuestOfferModal(true);
            console.log('🎯 Side quest offer từ AI:', response.sideQuestOffer.title);
          } else {
            console.log('⚠️ Quest đã được xử lý trước đó:', response.sideQuestOffer.title);
          }
        }
        
        if (questAnalysis.completedObjectives.length > 0) {
          console.log('✅ Quest objectives hoàn thành:', questAnalysis.completedObjectives);
        }
      } catch (questError) {
        console.error('Lỗi quest system:', questError);
      }

      // Update SCC context with AI message
      if (updatedSccContext) {
        // Sync SCC turnCounter with game turnCounter before adding AI message
        updatedSccContext.turnCounter = turnCounter;
        updatedSccContext = sccService.addTurn(updatedSccContext, aiMessage);
      }

      // Advance world time (1-3 hours per action)
      const timeAdvancement = Math.floor(Math.random() * 3) + 1; // 1-3 hours
      const newTime = gameState.worldTime ? 
        worldTimeService.advanceTime(gameState.worldTime, timeAdvancement) : 
        null;

      // Increment turn counter after AI response
      setTurnCounter(prev => {
        const newCounter = prev + 1;
        localStorage.setItem('game_turn_counter', newCounter.toString());
        return newCounter;
      });

      // Update game state
      setGameState(prev => ({
        ...prev,
        sceneState: { ...prev.sceneState, ...response.sceneState },
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

      // Save SCC context
      if (updatedSccContext) {
        sccService.saveSCCContext(updatedSccContext);
      }

      // Handle summarization if needed
      if (shouldSummarize && updatedSccContext) {
        await handleSummarization(updatedSccContext, worldData, characterData, scenarioData);
      }

    } catch (error) {
      console.error('Lỗi gửi tin nhắn:', error);
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarization = async (
    sccContext: SCCContext, 
    worldData: string, 
    characterData: string, 
    scenarioData: string
  ) => {
    try {
      console.log('🔄 Starting summarization...');
      
      // Create backup before summarizing
      sccService.createSummaryBackup(sccContext.summary);
      
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
        sccContext: updatedContext,
        showSummaryBanner: true,
        lastSummaryTurn: updatedContext.turnCounter
      }));
      
      // Save updated context
      sccService.saveSCCContext(updatedContext);
      
      // Save indexed summary for delta context system
      // Lưu summary với turn hiện tại (turnCounter) thay vì làm tròn xuống 20
      sccService.saveIndexedSummary(turnCounter, summaryResult.summary, summaryResult.sceneState);
      
      // Clean up old chat history to save memory
      sccService.cleanupOldChatHistory(turnCounter);
      
      console.log('✅ Summarization completed');
      
    } catch (error) {
      console.error('❌ Error during summarization:', error);
      // Don't throw error to avoid breaking the game flow
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
    try {
      setSaveMessage(null);

      // Get current game data
      const worldData = localStorage.getItem('world_gen_result');
      const characterData = localStorage.getItem('currentCharacter');
      const scenarioData = localStorage.getItem('rp_scenario');
      const sccData = localStorage.getItem('rp_summary_indexed');
      const sceneState = localStorage.getItem('rp_scene_state');
      const questSystemData = localStorage.getItem('quest_system');
      const savedTurnCounter = parseInt(localStorage.getItem('game_turn_counter') || '0', 10);

      if (!worldData || !characterData || !scenarioData) {
        setSaveMessage('Không có dữ liệu game để lưu');
        return;
      }

      // Create SaveGame object
      const worldParsed = JSON.parse(worldData);
      const characterParsed = JSON.parse(characterData);
      
      // Debug log để kiểm tra data
      console.log('World data:', worldParsed);
      console.log('Character data:', characterParsed);
      
      const saveGame: SaveGame = {
        version: '1.0.0',
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
        worldTime: gameState.worldTime || { day: 1, hour: 12, month: 1, year: 1, dayOfWeek: 1 },
        questSystem: questSystemData ? JSON.parse(questSystemData) : undefined,
        ui: { showSummaryBanner: gameState.showSummaryBanner, lastSummaryTurn: gameState.lastSummaryTurn },
        contentFlags: gameState.contentFlags || { adult_enabled: false, adult_intensity: 'fade', first_time_setup: true }
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
          updatedSaveGame.contentFlags
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
        });
        
        if (newSideQuest) {
          console.log('✅ Side quest được chấp nhận:', newSideQuest.title);
          
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
    
    console.log('❌ Side quest bị từ chối:', pendingQuestOffer.title);
    
    // Đánh dấu quest đã được xử lý
    const questId = pendingQuestOffer.id || pendingQuestOffer.title;
    setProcessedQuests(prev => new Set([...prev, questId]));
    
    // Tự động điền chat input
    setCurrentMessage(`Tôi từ chối nhiệm vụ "${pendingQuestOffer.title}".`);
    
    setShowQuestOfferModal(false);
    setPendingQuestOffer(null);
  };

  const resetGameData = () => {
    // Reset game state
    setChatHistory([]);
    setTurnCounter(0);
    setGameState({
      scenarioSkeleton: null,
      sceneState: {},
      storyProgress: null,
      isInitialized: false,
      worldTime: null,
      sccContext: null,
      showSummaryBanner: false,
      lastSummaryTurn: 0,
      contentFlags: null
    });
    
    // Clear game-related localStorage but keep save slots and API keys
    const keysToRemove = [
      'rp_chat',
      'rp_scenario', 
      'game_turn_counter',
      'rp_summary_indexed',
      'rp_scene_state',
      'world_gen_result',
      'currentCharacter',
      'scc_context',
      'rp_summary_backup', // Sửa từ scc_summary_backup thành rp_summary_backup
      'contentFlags', // Xóa contentFlags khi reset game
      'quest_system', // Xóa quest system khi reset game
      // World Builder keys
      'completeWorldData',
      'currentWorldData',
      'currentWorldDescription',
      'worldTitle',
      'rp_summary'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear SCC data
    sccService.clearSCCData();
    
    console.log('✅ Đã reset game data, giữ lại save slots và API keys');
  };


  // Xử lý load game từ SaveManager
  const handleLoadGame = (saveGame: SaveGame) => {
    try {
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
        contentFlags: saveGame.contentFlags || { adult_enabled: false, adult_intensity: 'fade', first_time_setup: true }
      });

      // Cập nhật chat history và turn counter
      setChatHistory(saveGame.chat);
      setTurnCounter(saveGame.turnCounter);

      // Cập nhật localStorage để tương thích với hệ thống cũ
      localStorage.setItem('rp_chat', JSON.stringify(saveGame.chat));
      localStorage.setItem('rp_scenario', JSON.stringify(saveGame.scenario));
      localStorage.setItem('game_turn_counter', saveGame.turnCounter.toString());
      localStorage.setItem('world_gen_result', JSON.stringify(saveGame.world));
      localStorage.setItem('currentCharacter', JSON.stringify(saveGame.character));
      
      // Khôi phục quest system nếu có
      if (saveGame.questSystem) {
        localStorage.setItem('quest_system', JSON.stringify(saveGame.questSystem));
        console.log('✅ Đã khôi phục quest system từ save file');
      }
      
      // KHÔNG lưu contentFlags vào localStorage riêng biệt
      // ContentFlags chỉ được lưu trong SaveGame JSON

      // Cập nhật SCC context
      if (gameState.sccContext) {
        sccService.saveSCCContext(gameState.sccContext);
      }

      console.log('✅ Đã load game từ SaveGame');
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
      }
    };
  };

  if (!gameState.isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
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
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <div className="flex items-center space-x-2 text-red-300">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <button
            onClick={initializeGame}
            disabled={isLoading}
            className="w-full py-3 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Fixed Header Section */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black">
        {/* Summary Banner */}
        {gameState.showSummaryBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-500/20 border-b border-blue-500/30 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-blue-300">
                <FileText className="w-4 h-4" />
                <span>Đã tóm tắt ngữ cảnh (Lượt {turnCounter})</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleUndoSummary}
                  className="px-2 py-1 bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 rounded text-xs hover:bg-yellow-600/30 transition-colors duration-200"
                  title="Hoàn tác tóm tắt"
                >
                  <Undo2 className="w-3 h-3" />
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="px-2 py-1 bg-gray-600/20 border border-gray-500/30 text-gray-300 rounded text-xs hover:bg-gray-600/30 transition-colors duration-200"
                  title="Đóng"
                >
                  ×
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Icon-only Header Menu */}
        <div className="glass-effect border-b border-gray-700/50 p-2">
          <div className="flex items-center justify-between">
            {/* World Time & Turn Counter Display */}
            <div className="flex items-center space-x-4 text-sm text-gray-300">
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

              {/* Adult Content Status */}
              {gameState.contentFlags?.adult_enabled && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">•</span>
                  <div className="flex items-center space-x-1">
                    {gameState.contentFlags.adult_intensity === 'direct' ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : (
                      <Shield className="w-4 h-4 text-orange-400" />
                    )}
                    <span className={`text-xs font-medium ${
                      gameState.contentFlags.adult_intensity === 'direct' 
                        ? 'text-red-300' 
                        : 'text-orange-300'
                    }`}>
                      18+ {gameState.contentFlags.adult_intensity === 'direct' ? 'Tả thực' : 'An toàn'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className={`flex items-center space-x-2 transition-all duration-300 ${
              isInfoMenuPinned ? 'mr-96' : ''
            }`}>
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
                className={`p-2 border rounded-lg transition-colors duration-200 ${
                  isInfoMenuPinned 
                    ? 'bg-blue-600/30 border-blue-500/50 text-blue-200' 
                    : 'bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30'
                }`}
                title={isInfoMenuPinned ? "Bỏ ghim menu" : "Thông tin game"}
              >
                <Info className="w-4 h-4" />
              </button>
              {/* Save Button */}
              <button
                onClick={() => setShowSavePopup(true)}
                className="p-2 bg-green-600/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-600/30 transition-colors duration-200"
                title="Lưu game"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={resetGameData}
                className="p-2 bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors duration-200"
                title="Chơi mới (giữ save slots)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Chat Area */}
      <div className="flex-1 flex flex-col pt-20 pb-32">
        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 transition-all duration-300 ${
          isInfoMenuPinned ? 'mr-96' : ''
        }`}>
          {chatHistory.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'player' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl px-4 py-3 rounded-lg ${
                  message.role === 'player'
                    ? 'bg-blue-500/20 border border-blue-500/50 text-blue-100'
                    : 'bg-gray-800/50 border border-gray-700/50 text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
                <div className="text-xs opacity-60 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-gray-800/50 border border-gray-700/50 text-gray-100 px-4 py-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI đang suy nghĩ...</span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black">
        {/* Error Display */}
        {error && (
          <div className={`mx-4 mb-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg transition-all duration-300 ${
            isInfoMenuPinned ? 'mr-96' : ''
          }`}>
            <div className="flex items-center space-x-2 text-red-300">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Save Message Display */}
        {saveMessage && (
          <div className={`mx-4 mb-2 p-3 bg-green-500/20 border border-green-500/50 rounded-lg transition-all duration-300 ${
            isInfoMenuPinned ? 'mr-96' : ''
          }`}>
            <div className="flex items-center space-x-2 text-green-300">
              <Save className="w-4 h-4" />
              <span className="text-sm">{saveMessage}</span>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="glass-effect border-t border-gray-700/50 p-4">
          <div className={`flex space-x-3 transition-all duration-300 ${
            isInfoMenuPinned ? 'mr-96' : ''
          }`}>
            <textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mô tả hành động của bạn..."
              className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!currentMessage.trim() || isLoading}
              className="px-4 py-3 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Nhấn Enter để gửi, Shift+Enter để xuống dòng
          </div>
        </div>
      </div>

      {/* Save Popup */}
      <SavePopup
        isOpen={showSavePopup}
        onClose={() => setShowSavePopup(false)}
        onSaveGame={handleSaveGame}
      />

      {/* Save Manager */}
      <SaveManager
        isOpen={showSaveManager}
        onClose={() => setShowSaveManager(false)}
        onLoadGame={handleLoadGame}
        currentGameData={getCurrentGameData()}
      />

      {/* Info Menu - Only render when needed */}
      {(showInfoMenu || isInfoMenuPinned) && (
        <InfoMenu
          isOpen={showInfoMenu || isInfoMenuPinned}
          onClose={() => setShowInfoMenu(false)}
          worldData={gameState.worldTime ? JSON.parse(localStorage.getItem('world_gen_result') || '{}') : null}
          characterData={JSON.parse(localStorage.getItem('currentCharacter') || '{}')}
          worldTime={gameState.worldTime}
          isPinned={isInfoMenuPinned}
          onTogglePin={() => setIsInfoMenuPinned(!isInfoMenuPinned)}
          questSystem={questSystem}
          onQuestUpdate={completeObjective}
          onQuestAccept={acceptQuest}
          onQuestDecline={declineQuest}
          onQuestDeclineActive={declineActiveQuest}
          onClaimReward={claimReward}
        />
      )}

      {/* Quest Offer Modal */}
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
    </div>
  );
}
