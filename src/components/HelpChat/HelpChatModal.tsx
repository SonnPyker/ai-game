import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ArrowLeft } from 'lucide-react';
import { HelpFAQ, HelpCategory } from '../../types/helpChat';
import { gameFAQService } from '../../services/gameFAQService';
import { ConversationView } from './ConversationView';
import { MotionWrapper } from '../MotionWrapper';
import { useResponsiveContext } from '../../contexts/ResponsiveContext';

interface HelpChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpChatModal: React.FC<HelpChatModalProps> = ({ isOpen, onClose }) => {
  const { shouldUseMobileLayout } = useResponsiveContext();
  const [selectedFAQ, setSelectedFAQ] = useState<HelpFAQ | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);

  const categories = gameFAQService.getCategories();
  
  // Get FAQs based on category filter and search
  const faqs = useMemo(() => {
    let result: HelpFAQ[];
    
    // If search query exists, search all FAQs
    if (searchQuery.trim()) {
      result = gameFAQService.searchFAQs(searchQuery);
    } 
    // If category is selected, show only that category
    else if (selectedCategory) {
      result = gameFAQService.getFAQsByCategory(selectedCategory);
    }
    // Otherwise show all FAQs
    else {
      result = categories.flatMap(cat => gameFAQService.getFAQsByCategory(cat.id));
    }
    
    return result;
  }, [categories, searchQuery, selectedCategory]);

  const handleFAQSelect = (faq: HelpFAQ) => {
    setSelectedFAQ(faq);
  };

  const handleBackToList = () => {
    setSelectedFAQ(null);
  };

  const handleCategoryFilter = (categoryId: HelpCategory | null) => {
    setSelectedCategory(categoryId);
    setSelectedFAQ(null);
    setSearchQuery('');
  };

  const handleClose = () => {
    setSelectedFAQ(null);
    setSearchQuery('');
    setSelectedCategory(null);
    onClose();
  };

  const getCurrentCategoryName = () => {
    if (selectedCategory) {
      return categories.find(c => c.id === selectedCategory)?.name || 'Tất cả câu hỏi';
    }
    return 'Tất cả câu hỏi';
  };

  if (!isOpen) return null;

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!portalTarget) return null;

  return createPortal(
    <MotionWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-[999] pt-4 sm:pt-8 pb-4 px-2 sm:px-4"
      style={{ zIndex: 999 }}
      onClick={handleClose}
    >
      <MotionWrapper
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`relative z-[1000] bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col ${
          shouldUseMobileLayout() ? 'h-full max-h-full rounded-none' : ''
        }`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-3 sm:p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              {selectedFAQ && (
                <button
                  onClick={handleBackToList}
                  className="p-1 sm:p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                  title="Quay lại danh sách câu hỏi"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
              <h2 className="text-base sm:text-xl font-bold text-white truncate">
                {selectedFAQ ? 'Trợ giúp' : 'Trợ giúp Game'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 sm:p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700 flex-shrink-0 ml-2"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Desktop only */}
          {!shouldUseMobileLayout() && (
            <div className="w-80 bg-gray-800/50 border-r border-gray-700 flex-shrink-0 flex flex-col">
              {/* Search */}
              <div className="p-4 border-b border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm câu hỏi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 text-sm"
                  />
                </div>
              </div>

              {/* Category Filters */}
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Lọc theo chủ đề
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCategoryFilter(null)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      !selectedCategory
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Tất cả
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryFilter(category.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      title={category.description}
                    >
                      {category.icon} {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQs list */}
              <div className="flex-1 overflow-y-auto pb-20">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">
                    {searchQuery 
                      ? `Kết quả tìm kiếm (${faqs.length})` 
                      : `${getCurrentCategoryName()} (${faqs.length})`
                    }
                  </h3>
                  <div className="space-y-2">
                    {faqs.map((faq) => (
                      <button
                        key={faq.id}
                        onClick={() => handleFAQSelect(faq)}
                        className={`w-full p-3 text-left rounded-lg transition-colors group ${
                          selectedFAQ?.id === faq.id
                            ? 'bg-yellow-600/20 border border-yellow-500/30'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <div className="font-medium text-white group-hover:text-yellow-300 text-sm leading-snug">
                          {faq.question}
                        </div>
                        <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-1.5 py-0.5 bg-gray-600/50 rounded">
                            {categories.find(c => c.id === faq.category)?.icon}
                          </span>
                          {faq.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx}>#{tag}</span>
                          ))}
                        </div>
                      </button>
                    ))}
                    {faqs.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">Không tìm thấy câu hỏi nào</p>
                        <p className="text-xs mt-1">Thử từ khóa khác hoặc chọn chủ đề khác</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Conversation - Show at top when selected */}
            {selectedFAQ && (
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24 sm:pb-20">
                <ConversationView faq={selectedFAQ} />
              </div>
            )}

            {/* Mobile Search and Filters - Only show when no FAQ selected */}
            {shouldUseMobileLayout() && !selectedFAQ && (
              <div className="border-b border-gray-700 flex-shrink-0">
                {/* Search */}
                <div className="p-3 sm:p-4 border-b border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm câu hỏi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 text-sm"
                    />
                  </div>
                </div>

                {/* Category Filters */}
                <div className="p-3 sm:p-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Lọc theo chủ đề
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCategoryFilter(null)}
                      className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                        !selectedCategory
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                      }`}
                    >
                      Tất cả
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryFilter(category.id)}
                        className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                        }`}
                      >
                        {category.icon} {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Content Area - Only show when no FAQ selected */}
            {!selectedFAQ && (
              <div className="flex-1 overflow-y-auto pb-24 sm:pb-20">
                <div className="p-3 sm:p-4">
                  {/* Show FAQs list (mobile) */}
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-gray-300 mb-3">
                      {searchQuery 
                        ? `Kết quả tìm kiếm (${faqs.length})` 
                        : `${getCurrentCategoryName()} (${faqs.length})`
                      }
                    </h3>
                    <div className="space-y-2">
                      {faqs.map((faq) => (
                        <button
                          key={faq.id}
                          onClick={() => handleFAQSelect(faq)}
                          className="w-full p-3 sm:p-4 text-left bg-gray-700 active:bg-gray-600 rounded-lg transition-colors group touch-manipulation"
                        >
                          <div className="font-medium text-white group-active:text-yellow-300 text-sm sm:text-base leading-snug">
                            {faq.question}
                          </div>
                          <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-1.5 py-0.5 bg-gray-600/50 rounded">
                              {categories.find(c => c.id === faq.category)?.icon}
                            </span>
                            {faq.tags.slice(0, 2).map((tag, idx) => (
                              <span key={idx}>#{tag}</span>
                            ))}
                          </div>
                        </button>
                      ))}
                      {faqs.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-sm">Không tìm thấy câu hỏi nào</p>
                          <p className="text-xs mt-1">Thử từ khóa khác hoặc chọn chủ đề khác</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </MotionWrapper>
    </MotionWrapper>,
    portalTarget
  );
};
