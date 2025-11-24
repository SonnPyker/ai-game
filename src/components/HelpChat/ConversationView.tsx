import React from 'react';
import { HelpFAQ } from '../../types/helpChat';
import { MessageSquare, User, Bot } from 'lucide-react';

interface ConversationViewProps {
  faq: HelpFAQ;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ faq }) => {
  // Parse answer to handle markdown-like formatting
  const formatAnswer = (answer: string): React.ReactNode => {
    const lines = answer.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      if (line.trim() === '') {
        elements.push(<br key={`br-${index}`} />);
        return;
      }
      
      // Handle bold text (**text**)
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const formattedParts = parts.map((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={partIndex} className="font-semibold text-gray-200">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });
        elements.push(
          <p key={index} className="mb-2 last:mb-0 break-words">
            {formattedParts}
          </p>
        );
      } else {
        elements.push(
          <p key={index} className="mb-2 last:mb-0 break-words">
            {line}
          </p>
        );
      }
    });
    
    return elements;
  };

  return (
    <div className="flex flex-col space-y-3 sm:space-y-4 h-full">
      {/* Question Bubble */}
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-yellow-500 rounded-full flex items-center justify-center">
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-3 sm:p-4 max-w-2xl">
            <div className="flex items-center space-x-2 mb-2">
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300" />
              <span className="text-xs sm:text-sm font-medium text-gray-200">Bạn hỏi</span>
            </div>
            <p className="text-white leading-relaxed text-sm sm:text-base break-words">
              {faq.question}
            </p>
          </div>
        </div>
      </div>

      {/* Answer Bubble */}
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gray-600 rounded-full flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-3 sm:p-4 max-w-2xl">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300" />
              <span className="text-xs sm:text-sm font-medium text-gray-200">Trợ lý AI</span>
            </div>
            <div className="text-gray-100 leading-relaxed text-sm sm:text-base break-words">
              {formatAnswer(faq.answer)}
            </div>
            
            {/* Tags */}
            {faq.tags && faq.tags.length > 0 && (
              <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-600/30">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {faq.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 sm:py-1 bg-gray-600/50 text-gray-300 text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
