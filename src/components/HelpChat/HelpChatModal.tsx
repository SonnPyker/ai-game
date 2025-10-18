import React, { useState, useMemo } from 'react';
import { X, Search, ArrowLeft, ChevronDown } from 'lucide-react';
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
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [selectedFAQ, setSelectedFAQ] = useState<HelpFAQ | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileCategoryDropdown, setShowMobileCategoryDropdown] = useState(false);

  const categories = gameFAQService.getCategories();
  
  // Get FAQs based on selected category or search
  const faqs = useMemo(() => {
    if (searchQuery.trim()) {
      return gameFAQService.searchFAQs(searchQuery);
    }
    if (selectedCategory) {
      return gameFAQService.getFAQsByCategory(selectedCategory);
    }
    return [];
  }, [selectedCategory, searchQuery]);

  const handleCategorySelect = (categoryId: HelpCategory) => {
    setSelectedCategory(categoryId);
    setSelectedFAQ(null);
    setSearchQuery('');
    setShowMobileCategoryDropdown(false);
  };

  const handleFAQSelect = (faq: HelpFAQ) => {
    setSelectedFAQ(faq);
  };

  const handleBackToCategories = () => {
    setSelectedFAQ(null);
    if (searchQuery) {
      setSearchQuery('');
    }
  };

  const handleBackToWelcome = () => {
    setSelectedCategory(null);
    setSelectedFAQ(null);
    setSearchQuery('');
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setSelectedFAQ(null);
    setSearchQuery('');
    setShowMobileCategoryDropdown(false);
    onClose();
  };

  // Get current category info
  const currentCategory = selectedCategory ? categories.find(c => c.id === selectedCategory) : null;

  if (!isOpen) return null;

  return (
    <MotionWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <MotionWrapper
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col ${
          shouldUseMobileLayout() ? 'h-full max-h-full' : ''
        }`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedFAQ && (
                <button
                  onClick={handleBackToCategories}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Quay lại danh sách câu hỏi"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              {selectedCategory && !selectedFAQ && (
                <button
                  onClick={handleBackToWelcome}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Quay lại trang chủ"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-xl font-bold text-white">
                {selectedFAQ ? 'Trợ giúp' : selectedCategory ? currentCategory?.name : 'Trợ giúp Game'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
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
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Categories or FAQs */}
                <div className="flex-1 overflow-y-auto pb-8">
                {!selectedCategory && !searchQuery ? (
                  // Welcome screen
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Chọn chủ đề</h3>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategorySelect(category.id)}
                          className="w-full p-3 text-left bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{category.icon}</span>
                            <div className="flex-1">
                              <div className="font-medium text-white group-hover:text-blue-300">
                                {category.name}
                              </div>
                              <div className="text-sm text-gray-400">
                                {category.description}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {category.faqCount} câu hỏi
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  // FAQs list
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      {searchQuery ? `Kết quả tìm kiếm (${faqs.length})` : `${currentCategory?.name} (${faqs.length})`}
                    </h3>
                    <div className="space-y-2">
                      {faqs.map((faq) => (
                        <button
                          key={faq.id}
                          onClick={() => handleFAQSelect(faq)}
                          className={`w-full p-3 text-left rounded-lg transition-colors group ${
                            selectedFAQ?.id === faq.id
                              ? 'bg-blue-600/20 border border-blue-500/30'
                              : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                        >
                          <div className="font-medium text-white group-hover:text-blue-300">
                            {faq.question}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {faq.tags.slice(0, 3).map(tag => `#${tag}`).join(' ')}
                          </div>
                        </button>
                      ))}
                      {faqs.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <p>Không tìm thấy câu hỏi nào</p>
                          <p className="text-sm">Thử từ khóa khác</p>
                        </div>
                      )}
                      {/* Spacer để đảm bảo có thể scroll hết */}
                      <div className="h-8"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Category Dropdown */}
          {shouldUseMobileLayout() && !selectedFAQ && (
            <div className="absolute top-16 left-4 right-4 z-10">
              <div className="relative">
                <button
                  onClick={() => setShowMobileCategoryDropdown(!showMobileCategoryDropdown)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white flex items-center justify-between"
                >
                  <span>
                    {selectedCategory ? currentCategory?.name : 'Chọn chủ đề'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${
                    showMobileCategoryDropdown ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {showMobileCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className="w-full p-3 text-left hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{category.icon}</span>
                          <div>
                            <div className="font-medium text-white">{category.name}</div>
                            <div className="text-sm text-gray-400">{category.faqCount} câu hỏi</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile Search */}
            {shouldUseMobileLayout() && !selectedFAQ && (
              <div className="p-4 border-b border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm câu hỏi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedFAQ ? (
                // Show conversation
                <ConversationView faq={selectedFAQ} />
              ) : selectedCategory || searchQuery ? (
                // Show FAQs list (mobile)
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {searchQuery ? `Kết quả tìm kiếm (${faqs.length})` : `${currentCategory?.name} (${faqs.length})`}
                  </h3>
                  <div className="space-y-2">
                    {faqs.map((faq) => (
                      <button
                        key={faq.id}
                        onClick={() => handleFAQSelect(faq)}
                        className="w-full p-3 text-left bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group"
                      >
                        <div className="font-medium text-white group-hover:text-blue-300">
                          {faq.question}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {faq.tags.slice(0, 3).map(tag => `#${tag}`).join(' ')}
                        </div>
                      </button>
                    ))}
                    {faqs.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <p>Không tìm thấy câu hỏi nào</p>
                        <p className="text-sm">Thử từ khóa khác</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Welcome screen (mobile)
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎮</div>
                  <h3 className="text-2xl font-bold text-white mb-4">Chào mừng đến với Trợ giúp Game</h3>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    Chọn chủ đề bên trên để xem các câu hỏi thường gặp và hướng dẫn chi tiết
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group"
                      >
                        <div className="text-3xl mb-2">{category.icon}</div>
                        <div className="font-medium text-white group-hover:text-blue-300 text-sm">
                          {category.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {category.faqCount} câu hỏi
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </MotionWrapper>
    </MotionWrapper>
  );
};
