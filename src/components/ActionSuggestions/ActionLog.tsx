import React, { useState } from 'react';
import { X, Clock, Zap, AlertTriangle, CheckCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { ActionLogEntry } from '../../services/actionSuggestionService';

interface ActionLogProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ActionLogEntry[];
}

export function ActionLog({ isOpen, onClose, entries }: ActionLogProps) {
  const [filter, setFilter] = useState<'all' | 'story' | 'risk' | 'relationship'>('all');
  const [collapsedEntries, setCollapsedEntries] = useState<Set<string>>(new Set());

  // Initialize all entries as collapsed when entries change
  React.useEffect(() => {
    if (entries.length > 0) {
      setCollapsedEntries(new Set(entries.map(entry => entry.id)));
    }
  }, [entries]);


  if (!isOpen) return null;

  const filteredEntries = entries.filter(entry => {
    if (filter === 'all') return true;
    return entry.impactTags.includes(filter);
  });

  const formatTime = (time: any) => {
    if (!time) return 'N/A';
    const hour = time.hour?.toString().padStart(2, '0') || '00';
    const minute = time.minute?.toString().padStart(2, '0') || '00';
    return `${hour}:${minute}`;
  };

  const formatDate = (time: any) => {
    if (!time) return 'N/A';
    return `Ngày ${time.day}/${time.month}/${time.year}`;
  };

  const getImpactIcon = (tags: string[]) => {
    if (tags.includes('risk')) return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (tags.includes('story')) return <CheckCircle className="w-4 h-4 text-blue-400" />;
    if (tags.includes('relationship')) return <Zap className="w-4 h-4 text-purple-400" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getFilterCount = (filterType: string) => {
    if (filterType === 'all') return entries.length;
    return entries.filter(entry => entry.impactTags.includes(filterType)).length;
  };

  const toggleEntryCollapse = (entryId: string) => {
    setCollapsedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const isEntryCollapsed = (entryId: string) => {
    return collapsedEntries.has(entryId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-effect border border-gray-700/50 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Lịch sử hành động</h2>
            <span className="text-sm text-gray-400">({entries.length} hành động)</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Filters and Controls */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Lọc theo:</span>
              {[
                { key: 'all', label: 'Tất cả', count: getFilterCount('all') },
                { key: 'story', label: 'Cốt truyện', count: getFilterCount('story') },
                { key: 'risk', label: 'Rủi ro', count: getFilterCount('risk') },
                { key: 'relationship', label: 'Mối quan hệ', count: getFilterCount('relationship') }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    filter === key
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                      : 'bg-gray-700/30 text-gray-300 hover:bg-gray-600/30'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            
            {/* Collapse/Expand All */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (collapsedEntries.size === filteredEntries.length) {
                    // All collapsed, expand all
                    setCollapsedEntries(new Set());
                  } else {
                    // Some or none collapsed, collapse all
                    setCollapsedEntries(new Set(filteredEntries.map(entry => entry.id)));
                  }
                }}
                className="px-3 py-1 rounded-lg text-sm bg-gray-700/30 text-gray-300 hover:bg-gray-600/30 transition-colors"
              >
                {collapsedEntries.size === filteredEntries.length ? 'Mở tất cả' : 'Thu tất cả'}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {filter === 'all' ? 'Chưa có hành động nào' : `Không có hành động loại "${filter}"`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => {
                const isCollapsed = isEntryCollapsed(entry.id);
                return (
                  <div
                    key={entry.id}
                    className="glass-effect border border-gray-700/30 rounded-lg hover:border-gray-600/50 transition-colors"
                  >
                    {/* Header - Always visible */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-700/20 transition-colors"
                      onClick={() => toggleEntryCollapse(entry.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {getImpactIcon(entry.impactTags)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white truncate">{entry.summary}</h3>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 mt-1">
                              <span>Lượt {entry.turn}</span>
                              <span>•</span>
                              <span>{entry.durationMinutes}p</span>
                              <span>•</span>
                              <span>{formatDate(entry.startedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                          <div className="text-right text-sm text-gray-400">
                            <div className="whitespace-nowrap">
                              {formatTime(entry.startedAt)} - {formatTime(entry.endedAt)}
                            </div>
                          </div>
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {!isCollapsed && (
                      <div className="px-4 pb-4 border-t border-gray-700/30">
                        <div className="pt-3 space-y-3">
                          {/* Action Text */}
                          <div className="text-sm text-gray-300">
                            <span className="text-gray-500">Hành động:</span> "{entry.text}"
                          </div>

                          {/* Impact Tags */}
                          <div className="flex flex-wrap gap-1">
                            {entry.impactTags.map((tag, index) => (
                              <span
                                key={index}
                                className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Pros and Cons */}
                          {(entry.pros.length > 0 || entry.cons.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {entry.pros.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-medium text-green-400 mb-1">Lợi ích:</h4>
                                  <ul className="text-xs text-green-300 space-y-1">
                                    {entry.pros.map((pro, index) => (
                                      <li key={index} className="flex items-start">
                                        <span className="text-green-400 mr-1">+</span>
                                        {pro}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {entry.cons.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-medium text-red-400 mb-1">Rủi ro:</h4>
                                  <ul className="text-xs text-red-300 space-y-1">
                                    {entry.cons.map((con, index) => (
                                      <li key={index} className="flex items-start">
                                        <span className="text-red-400 mr-1">-</span>
                                        {con}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
