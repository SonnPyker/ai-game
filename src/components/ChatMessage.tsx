import { memo } from 'react';
import { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
  index: number;
  isResending: boolean;
  onResend: (content: string, index: number) => void;
  isLoading: boolean;
  shouldShowResendButton?: boolean;
}

const ChatMessage = memo<ChatMessageProps>(({ 
  message, 
  index, 
  isResending, 
  onResend, 
  isLoading,
  shouldShowResendButton = true
}) => {
  return (
    <div className={`mb-4 ${message.role === 'player' ? 'text-right' : 'text-left'}`}>
      <div className={`inline-block max-w-[85%] p-3 rounded-lg ${
        message.role === 'player' 
          ? 'bg-yellow-600 text-white' 
          : 'bg-gray-700 text-gray-100'
      }`}>
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        
        {/* Resend button for player messages - chỉ hiển thị khi được phép */}
        {message.role === 'player' && shouldShowResendButton && (
          <button
            onClick={() => onResend(message.content, index)}
            disabled={isLoading}
            className={`mt-1 p-2 md:p-1.5 rounded-md transition-all duration-200 min-w-[40px] min-h-[40px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center ${
              isResending
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Gửi lại tin nhắn này"
          >
            {isResending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        )}
        
        <div className="text-xs opacity-70 mt-1">
          Turn {message.turn} • {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
