import { Clock, Zap, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';
import { SuggestedAction } from '../../services/actionSuggestionService';

interface ActionSuggestionsProps {
  suggestions: SuggestedAction[];
  onPick: (suggestion: SuggestedAction) => void;
  isLoading?: boolean;
  isMobile?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  selectedSuggestionId?: string | null;
  isRetrying?: boolean;
  retryCount?: number;
  lastRetryError?: string | null;
  onRetry?: () => void;
}

export function ActionSuggestions({ 
  suggestions, 
  onPick, 
  isLoading = false,
  isMobile = false,
  isCollapsed = false,
  onToggleCollapse,
  selectedSuggestionId = null,
  isRetrying = false,
  retryCount = 0,
  lastRetryError = null,
  onRetry
}: ActionSuggestionsProps) {
  if (isLoading) {
    return (
      <div className={isCollapsed ? "mb-1" : "mb-3"}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300 flex items-center">
            <Zap className="w-4 h-4 mr-1" />
            Gợi ý hành động
          </h3>
          <div className="flex items-center space-x-2">
            {isRetrying ? (
              <div className="flex items-center space-x-1">
                <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />
                <span className="text-xs text-yellow-400">
                  Đang thử lại... ({retryCount})
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-500">Đang tải...</span>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                title={isCollapsed ? "Mở rộng gợi ý" : "Thu gọn gợi ý"}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>
        
        {!isCollapsed && (
          <div className={`grid gap-1.5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="glass-effect border border-gray-600/50 rounded-lg px-3 py-2 animate-pulse"
              >
                <div className="h-3 bg-gray-700/50 rounded mb-1"></div>
                <div className="h-3 bg-gray-700/30 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  // Hiển thị error message nếu có lỗi retry
  if (lastRetryError && !isLoading) {
    return (
      <div className={isCollapsed ? "mb-1" : "mb-3"}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300 flex items-center">
            <Zap className="w-4 h-4 mr-1" />
            Gợi ý hành động
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {suggestions.length} đề xuất
            </span>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                title={isCollapsed ? "Mở rộng gợi ý" : "Thu gọn gợi ý"}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>
        
        {!isCollapsed && (
          <div className="space-y-2">
            {/* Error message */}
            <div className="glass-effect border border-red-500/50 bg-red-500/10 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-300 font-medium mb-1">
                    Lỗi khi tải gợi ý hành động
                  </p>
                  <p className="text-xs text-red-400 mb-2">
                    {lastRetryError}
                  </p>
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="flex items-center space-x-1 text-xs text-red-300 hover:text-red-200 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Thử lại</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Fallback suggestions */}
            <div className={`grid gap-1.5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {suggestions.map((suggestion) => {
                const isSelected = selectedSuggestionId === suggestion.id;
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => onPick(suggestion)}
                    className={`glass-effect border rounded-lg px-3 py-2 text-left transition-all duration-200 group min-h-[50px] touch-feedback active:scale-95 ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20' 
                        : 'border-gray-600/50 hover:border-blue-500/50 hover:bg-blue-500/10'
                    }`}
                    title={`Thời gian: ${formatDuration(suggestion.durationMinutes)}${isSelected ? ' - Nhấn để hủy chọn' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1">
                        {getImpactIcon(suggestion.impactTags)}
                        <span className="text-xs text-gray-400">
                          {formatDuration(suggestion.durationMinutes)}
                        </span>
                        <span className={`text-xs ${getSourceColor(suggestion.source)}`}>
                          {suggestion.source === 'ai' ? 'AI' : suggestion.source === 'quest' ? 'Quest' : 'Heuristic'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`text-sm transition-colors leading-tight ${
                      isSelected ? 'text-blue-100' : 'text-white group-hover:text-blue-100'
                    }`}>
                      {suggestion.summary}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}p`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}p` : `${hours}h`;
  };

  const getImpactIcon = (tags: string[]) => {
    if (tags.includes('risk')) return <AlertTriangle className="w-3 h-3 text-red-400" />;
    if (tags.includes('story')) return <CheckCircle className="w-3 h-3 text-blue-400" />;
    if (tags.includes('relationship')) return <Zap className="w-3 h-3 text-purple-400" />;
    return <Clock className="w-3 h-3 text-gray-400" />;
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'ai': return 'text-blue-300';
      case 'quest': return 'text-green-300';
      case 'heuristic': return 'text-yellow-300';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className={isCollapsed ? "mb-1" : "mb-3"}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-300 flex items-center">
          <Zap className="w-4 h-4 mr-1" />
          Gợi ý hành động
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {suggestions.length} đề xuất
          </span>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-gray-700/50 rounded transition-colors"
              title={isCollapsed ? "Mở rộng gợi ý" : "Thu gọn gợi ý"}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {!isCollapsed && (
        <div className={`grid gap-1.5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {suggestions.map((suggestion) => {
            const isSelected = selectedSuggestionId === suggestion.id;
            return (
              <button
                key={suggestion.id}
                onClick={() => onPick(suggestion)}
                className={`glass-effect border rounded-lg px-3 py-2 text-left transition-all duration-200 group min-h-[50px] touch-feedback active:scale-95 ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20' 
                    : 'border-gray-600/50 hover:border-blue-500/50 hover:bg-blue-500/10'
                }`}
                title={`Thời gian: ${formatDuration(suggestion.durationMinutes)}${isSelected ? ' - Nhấn để hủy chọn' : ''}`}
              >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1">
                  {getImpactIcon(suggestion.impactTags)}
                  <span className="text-xs text-gray-400">
                    {formatDuration(suggestion.durationMinutes)}
                  </span>
                  <span className={`text-xs ${getSourceColor(suggestion.source)}`}>
                    {suggestion.source === 'ai' ? 'AI' : suggestion.source === 'quest' ? 'Quest' : 'Heuristic'}
                  </span>
                </div>
              </div>
              
                <div className={`text-sm transition-colors leading-tight ${
                  isSelected ? 'text-blue-100' : 'text-white group-hover:text-blue-100'
                }`}>
                  {suggestion.summary}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
