import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  User, 
  Bot, 
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { geminiService } from '../../services/geminiService';

interface ChatMessage {
  id: string;
  type: 'ai' | 'player';
  content: string;
  timestamp: string;
  isInitial?: boolean;
}

interface GameState {
  currentScene: string;
  inventory: string[];
  relationships: Record<string, number>;
  flags: Record<string, boolean>;
  ended: boolean;
}

interface GameChatAdvancedProps {
  onGameStateChange?: (isStarted: boolean) => void;
}

export function GameChatAdvanced({ onGameStateChange }: GameChatAdvancedProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGameData();
  }, []);

  useEffect(() => {
    onGameStateChange?.(isGameStarted);
  }, [isGameStarted, onGameStateChange]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadGameData = () => {
    // Khởi tạo game mới không cần load save
    initializeGame();
  };

  const initializeGame = async () => {
    try {
      setIsLoading(true);
      
      // Tạo đoạn văn mở đầu giống tiểu thuyết
      const openingStory = await generateOpeningStory();
      
      const initialMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: openingStory,
        timestamp: new Date().toISOString(),
        isInitial: true
      };
      
      setMessages([initialMessage]);
      setIsGameStarted(true);
      
      // Generate initial suggestions
      await generateSuggestions(initialMessage.content);
      
    } catch (error) {
      console.error('Error initializing game:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateOpeningStory = async (): Promise<string> => {
    try {
      // Lấy mô tả thế giới từ localStorage
      const worldDescription = localStorage.getItem('currentWorldDescription');
      const worldDataStr = localStorage.getItem('currentWorldData');
      
      let worldContext = '';
      let worldData = null;
      if (worldDescription && worldDataStr) {
        worldData = JSON.parse(worldDataStr);
        worldContext = `
Thế giới: ${worldData.genre} - ${worldData.setting}
Tông truyện: ${worldData.storyTone}
Ngôi kể: ${worldData.narration}
Mô tả thế giới: ${worldDescription}`;
      }

      const prompt = `
Tạo một đoạn văn mở đầu cho game roleplay giống tiểu thuyết nhập vai dựa trên thông tin thế giới sau:

${worldContext}

Yêu cầu:
1. Viết thành một đoạn văn xuôi dài (150-300 từ), không dùng bullet, số, ký hiệu đặc biệt
2. Miêu tả bối cảnh, thời gian, không gian, và cảm xúc của nhân vật chính khi họ bước vào thế giới này
3. Có thể thêm một chi tiết kỳ lạ hoặc một sự kiện chấn động làm điểm nhấn, mở ra hướng đi cho cốt truyện
4. Tránh dùng câu dẫn kiểu "Dưới đây là..." hoặc ghi chú ngoài chuyện
5. Viết giống tiểu thuyết roleplay, để người chơi cảm giác như bước vào câu chuyện
6. KHÔNG đặt câu hỏi trực tiếp kiểu "Bạn muốn làm gì tiếp theo?" hay tương tự ở cuối
7. Kết thúc bằng một tình huống mở, để người chơi tự nhiên muốn phản hồi
8. Sử dụng ngôi kể đã chọn (${worldData?.narration || 'ngôi thứ hai'})

Tạo một câu chuyện mở đầu hấp dẫn và bí ẩn dựa trên thông tin thế giới trên.`;

      const response = await geminiService.generateGameScenario(
        { name: 'Phiêu lưu gia', class: { name: 'chiến binh' } },
        worldDescription || 'Thế giới bí ẩn',
        prompt
      );
      return response;
    } catch (error) {
      console.error('Error generating opening story:', error);
      // Fallback story nếu AI không hoạt động
      return `Bóng tối bao trùm lên những ngọn đồi xa xa khi bạn đứng trước cổng thành cổ kính. Gió lạnh thổi qua, mang theo tiếng thì thầm của những câu chuyện cổ xưa. Ánh sáng từ những ngọn đuốc trong thành phố tạo ra những bóng đen nhảy múa trên tường đá, như thể chúng đang kể những bí mật mà chỉ những người dũng cảm mới có thể nghe thấy.

Bạn cảm nhận được sự hồi hộp trong lồng ngực khi bước chân đầu tiên vào thế giới này. Có điều gì đó kỳ lạ đang chờ đợi ở phía trước, một sự kiện sẽ thay đổi mãi mãi cuộc đời của bạn. Tiếng chuông từ tháp canh vang lên, báo hiệu một ngày mới bắt đầu, nhưng cũng có thể là sự khởi đầu của một cuộc phiêu lưu vĩ đại.

Cánh cổng thành mở ra trước mặt bạn, dẫn vào một thế giới đầy bí ẩn và cơ hội.`;
    }
  };

  const generateSuggestions = async (context: string) => {
    try {
      const prompt = `
Game Master RPG. Tạo 4 hành động gợi ý ngắn gọn:

Context: ${context.substring(0, 200)}...

Trả về 4 hành động, mỗi dòng 1 hành động (không dùng số thứ tự):
Hành động 1
Hành động 2
Hành động 3
Hành động 4
      `;
      
      const response = await geminiService.generateContent(prompt);
      const suggestions = response.split('\n')
        .filter((line: string) => line.trim() && !line.trim().startsWith('#'))
        .map((line: string) => line.trim())
        .slice(0, 4);
      
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fallback suggestions
      setSuggestions([
        'Khám phá xung quanh',
        'Tìm nhiệm vụ',
        'Gặp gỡ người khác',
        'Kiểm tra túi đồ'
      ]);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const playerMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'player',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, playerMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Generate AI response
      const aiResponse = await generateAIResponse(message.trim());
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse.narration,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Update game state
      if (aiResponse.state) {
        // Game state không cần thiết nữa
      }
      
      // Generate new suggestions
      await generateSuggestions(aiResponse.narration);
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Fallback response
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Thú vị! Hành động "${message.trim()}" của bạn tạo ra thay đổi thú vị. Hãy tiếp tục khám phá!`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = async (playerAction: string): Promise<{narration: string, state?: Partial<GameState>}> => {
    try {
      const charName = 'Phiêu lưu gia';
      const charClass = 'chiến binh';
      
      const prompt = `
Game Master RPG. Phản hồi hành động: "${playerAction}"

Nhân vật: ${charName} (${charClass})

Viết dưới dạng văn xuôi tự nhiên như một đoạn tiểu thuyết. Quan trọng:
- Kể ở ngôi thứ hai (dùng "bạn" thay vì tên nhân vật)
- Không có lời chào
- Không có câu hỏi người chơi làm gì
- Không sử dụng icon, gạch đầu dòng, số thứ tự, tiêu đề
- Viết thành các đoạn văn liền mạch, văn phong miêu tả, giống tiểu thuyết
- Nếu cần tách ý, chỉ xuống dòng tạo đoạn văn mới

Trả về JSON:
{
  "narration": "Kết quả hành động, bối cảnh mới (150-200 từ) - viết như tiểu thuyết, ngôi thứ 2",
  "state": {
    "currentScene": "Tên cảnh",
    "inventory": ["item1"],
    "relationships": {"npc1": 50},
    "flags": {"flag1": true},
    "ended": false
  }
}
      `;
      
      const response = await geminiService.generateContent(prompt);
      
      try {
        // Try to parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            narration: parsed.narration || response,
            state: parsed.state
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON response, using raw response');
      }
      
      return { narration: response };
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };


  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  const getMessageIcon = (type: 'ai' | 'player') => {
    if (type === 'ai') {
      return <Bot className="w-5 h-5 text-primary-400" />;
    }
    return <User className="w-5 h-5 text-secondary-400" />;
  };

  const getMessageIconBg = (type: 'ai' | 'player') => {
    if (type === 'ai') {
      return 'bg-primary-500/20 border-primary-500/50';
    }
    return 'bg-secondary-500/20 border-secondary-500/50';
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`flex ${message.type === 'player' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-3 max-w-[80%] ${
              message.type === 'player' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              {/* Avatar */}
                <div className={`p-2 rounded-lg border-4 ${getMessageIconBg(message.type)}`}>
                {getMessageIcon(message.type)}
              </div>
              
              {/* Message Content */}
              <div className={`glass-effect p-4 rounded-lg border-2 ${
                message.type === 'player' 
                  ? 'bg-secondary-500/10 border-secondary-500/40' 
                  : 'bg-primary-500/10 border-primary-500/40'
              }`}>
                {message.isInitial && (
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-yellow-400 font-medium">Cốt truyện mở đầu</span>
                  </div>
                )}
                
                <div 
                  className="text-white prose prose-invert max-w-none whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: formatMessage(message.content) 
                  }}
                />
                
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>{message.type === 'ai' ? 'AI Game Master' : 'Bạn'}</span>
                  <span>{new Date(message.timestamp).toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        
        {/* Loading Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary-500/20 border border-primary-500/50 rounded-lg">
                <Bot className="w-5 h-5 text-primary-400" />
              </div>
              <div className="glass-effect p-4 rounded-lg bg-primary-500/10 border-primary-500/20">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-400">AI đang suy nghĩ...</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
        
      </div>

      {/* Action Suggestions */}
      <div className="border-t border-white/20 flex-shrink-0">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 transition-colors"
        >
          <span className="text-sm font-medium text-gray-300">Gợi ý hành động</span>
          {showSuggestions ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 grid grid-cols-2 gap-3">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isLoading}
                     className="p-3 text-sm text-left bg-white/5 border-2 border-white/40 rounded-lg hover:bg-white/10 hover:border-primary-400/70 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
       <div className="p-4 border-t-2 border-white/40 flex-shrink-0">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập hành động của bạn... (Enter để gửi, Shift+Enter xuống dòng)"
              disabled={isLoading}
              rows={2}
               className="w-full px-4 py-3 bg-white/10 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-primary-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>
          
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
             className="p-3 bg-primary-500/20 border-2 border-primary-500/70 rounded-lg text-primary-300 hover:bg-primary-500/30 hover:border-primary-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
