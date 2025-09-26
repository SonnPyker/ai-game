import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, AlertCircle, Play, RotateCcw, Clock, MessageSquare, FileText, Undo2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { worldTimeService } from '../services/worldTimeService';
import { sccService } from '../services/sccService';
import { WorldTime, SCCContext, ChatMessage } from '../types';
import { buildContextForAI } from '../lib/context';

interface GameState {
  scenarioSkeleton: any;
  sceneState: any;
  storyProgress: any;
  isInitialized: boolean;
  worldTime: WorldTime | null;
  sccContext: SCCContext | null;
  showSummaryBanner: boolean;
  lastSummaryTurn: number;
}

export function GamePage() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnCounter, setTurnCounter] = useState(0);
  const [gameState, setGameState] = useState<GameState>({
    scenarioSkeleton: null,
    sceneState: {},
    storyProgress: null,
    isInitialized: false,
    worldTime: null,
    sccContext: null,
    showSummaryBanner: false,
    lastSummaryTurn: 0
  });
  
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

      // Add opening message to chat
      const openingMessage: ChatMessage = {
        role: 'ai',
        content: openingNarrative,
        timestamp: new Date()
      };

      // Load or initialize SCC context
      const sccContext = sccService.loadSCCContext();
      const updatedSccContext = sccService.addTurn(sccContext, openingMessage);

      // Load turn counter from localStorage
      const savedTurnCounter = parseInt(localStorage.getItem('game_turn_counter') || '0', 10);
      
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
        lastSummaryTurn: 0
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
        updatedSccContext = sccService.addTurn(updatedSccContext, playerMessage);
      }

      // Check if we need to summarize
      let shouldSummarize = false;
      if (updatedSccContext && sccService.shouldSummarize(updatedSccContext)) {
        shouldSummarize = true;
        console.log(`🔄 Summarizing at turn ${updatedSccContext.turnCounter}`);
      }

      // Build delta context for AI
      const deltaContext = buildContextForAI(turnCounter + 1, 4); // +1 because we're about to add the current turn
      
      
      // Generate AI response using delta context
      const response = await geminiService.generateTurnResponseWithDelta(
        worldData,
        characterData,
        scenarioData,
        deltaContext.summary,
        deltaContext.sceneState,
        deltaContext.recentTurns.map(msg => ({ role: msg.role, content: msg.content, turn: msg.turn || 0 })),
        currentMessage.trim()
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

      // Update SCC context with AI message
      if (updatedSccContext) {
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
      const summaryTurn = Math.floor(updatedContext.turnCounter / 20) * 20; // Round down to nearest 20
      sccService.saveIndexedSummary(summaryTurn, summaryResult.summary, summaryResult.sceneState);
      
      // Clean up old chat history to save memory
      sccService.cleanupOldChatHistory(updatedContext.turnCounter);
      
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
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
      lastSummaryTurn: 0
    });
    localStorage.removeItem('rp_chat');
    localStorage.removeItem('rp_scenario');
    localStorage.removeItem('game_turn_counter');
    localStorage.removeItem('rp_summary_indexed');
    sccService.clearSCCData();
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
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={clearChat}
                className="p-2 bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-600/30 transition-colors duration-200"
                title="Bắt đầu lại"
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          <div className="mx-4 mb-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="flex items-center space-x-2 text-red-300">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="glass-effect border-t border-gray-700/50 p-4">
          <div className="flex space-x-3">
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
    </div>
  );
}
