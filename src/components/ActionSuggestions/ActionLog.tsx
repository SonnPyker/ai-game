import React, { useState, useEffect } from 'react';
import { Clock, Zap, AlertTriangle, CheckCircle, Filter, ChevronDown, ChevronUp, ShoppingCart, DollarSign, TrendingUp, TrendingDown, Package, Store, User } from 'lucide-react';
import { ActionLogEntry } from '../../services/actionSuggestionService';
import { tradingHistoryService, TradingLogEntry } from '../../services/tradingHistoryService';
import { useModalMinimize } from '../../hooks/useModalMinimize';
import { ModalHeader } from '../ModalHeader';

interface ActionLogProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ActionLogEntry[];
}

export function ActionLog({ isOpen, onClose, entries }: ActionLogProps) {
  const [filter, setFilter] = useState<'all' | 'story' | 'risk' | 'relationship' | 'trading' | 'attack' | 'dcCheck'>('all');
  const [collapsedEntries, setCollapsedEntries] = useState<Set<string>>(new Set());
  const [tradingHistory, setTradingHistory] = useState<TradingLogEntry[]>([]);
  const [tradingStats, setTradingStats] = useState<any>(null);
  const [tradingFilter, setTradingFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const { isMinimized, minimize, updateData } = useModalMinimize({
    modalId: 'action-log-modal',
    title: 'Lịch sử hành động',
    subtitle: 'Đang tải...',
    icon: <Clock className="w-5 h-5 text-blue-400" />
  });

  // Initialize all entries as collapsed when entries change
  React.useEffect(() => {
    if (entries.length > 0) {
      setCollapsedEntries(new Set(entries.map(entry => entry.id)));
    }
  }, [entries]);

  // Load trading history when modal opens
  useEffect(() => {
    if (isOpen) {
      const history = tradingHistoryService.getTradingHistory();
      const stats = tradingHistoryService.getTradingStats();
      setTradingHistory(history);
      setTradingStats(stats);
    }
  }, [isOpen]);

  // Filter out trading entries from action log
  const filteredEntries = entries.filter(entry => {
    // Remove trading entries from action log
    if (entry.summary.includes('Mua item:') || entry.summary.includes('Bán item:')) {
      return false;
    }
    
    if (filter === 'all') return true;
    if (filter === 'attack') {
      return entry.impactTags.some(tag => tag.includes('Attack') || tag === 'attack');
    }
    if (filter === 'dcCheck') {
      return entry.impactTags.some(tag => tag.includes('DCCheck')) || entry.dcCheckResult;
    }
    return entry.impactTags.includes(filter);
  });

  // Update subtitle when data changes
  useEffect(() => {
    if (isMinimized) {
      const subtitle = `${filter === 'trading' ? tradingHistory.length : filteredEntries.length} ${filter === 'trading' ? 'giao dịch' : 'hành động'}`;
      updateData({ subtitle });
    }
  }, [isMinimized, filter, tradingHistory.length, filteredEntries.length, updateData]);

  if (!isOpen) return null;

  if (isMinimized) {
    return null; // MinimizedModal is now handled by MinimizedModalContainer
  }

  const getImpactIcon = (tags: string[]) => {
    if (tags.some(tag => tag.includes('Attack') || tag === 'attack')) return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (tags.some(tag => tag.includes('DCCheck'))) return <CheckCircle className="w-4 h-4 text-blue-400" />;
    if (tags.includes('risk')) return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    if (tags.includes('story')) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (tags.includes('relationship')) return <Zap className="w-4 h-4 text-purple-400" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getFilterCount = (filterType: string) => {
    if (filterType === 'all') return entries.length;
    if (filterType === 'trading') return tradingHistory.length;
    if (filterType === 'attack') {
      return entries.filter(entry => entry.impactTags.some(tag => tag.includes('Attack') || tag === 'attack')).length;
    }
    if (filterType === 'dcCheck') {
      return entries.filter(entry => entry.impactTags.some(tag => tag.includes('DCCheck')) || entry.dcCheckResult).length;
    }
    return entries.filter(entry => entry.impactTags.includes(filterType)).length;
  };

  // Trading history helper functions
  const filteredTradingHistory = tradingHistory.filter(entry => {
    if (tradingFilter !== 'all' && entry.type !== tradingFilter) return false;
    if (itemTypeFilter !== 'all' && entry.itemType !== itemTypeFilter) return false;
    return true;
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

  const getItemTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'weapon': return '⚔️';
      case 'armor': return '🛡️';
      case 'consumable': return '🧪';
      case 'misc': return '📦';
      default: return '📦';
    }
  };

  const getTypeIcon = (type: 'buy' | 'sell') => {
    return type === 'buy' ? <TrendingDown className="w-4 h-4 text-red-400" /> : <TrendingUp className="w-4 h-4 text-green-400" />;
  };

  const getTypeColor = (type: 'buy' | 'sell') => {
    return type === 'buy' ? 'text-red-400' : 'text-green-400';
  };

  const getTypeBgColor = (type: 'buy' | 'sell') => {
    return type === 'buy' ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20';
  };

  const getItemTypes = () => {
    const types = [...new Set(tradingHistory.map(entry => entry.itemType))];
    return types;
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
        <ModalHeader
          title="Lịch sử hành động"
          subtitle={`${filter === 'trading' ? tradingHistory.length : filteredEntries.length} ${filter === 'trading' ? 'giao dịch' : 'hành động'}`}
          icon={<Clock className="w-5 h-5 text-blue-400" />}
          onMinimize={minimize}
          onClose={onClose}
        />

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
                { key: 'relationship', label: 'Mối quan hệ', count: getFilterCount('relationship') },
                { key: 'attack', label: 'Tấn công', count: getFilterCount('attack') },
                { key: 'dcCheck', label: 'DC Check', count: getFilterCount('dcCheck') },
                { key: 'trading', label: 'Mua bán', count: getFilterCount('trading') }
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
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filter === 'trading' ? (
            // Trading History Content
            <div className="space-y-4">
              {/* Trading Stats */}
              {tradingStats && (
                <div className="p-4 border border-gray-700/50 rounded-lg bg-gray-800/30">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">{tradingStats.totalBuy}</div>
                      <div className="text-sm text-gray-400">Giao dịch mua</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{tradingStats.totalSell}</div>
                      <div className="text-sm text-gray-400">Giao dịch bán</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">{tradingStats.totalSpent.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">Gold đã chi</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{tradingStats.totalEarned.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">Gold đã kiếm</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trading Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Loại giao dịch:</span>
                </div>
                {[
                  { key: 'all', label: 'Tất cả', count: tradingHistory.length },
                  { key: 'buy', label: 'Mua', count: tradingHistory.filter(e => e.type === 'buy').length },
                  { key: 'sell', label: 'Bán', count: tradingHistory.filter(e => e.type === 'sell').length }
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setTradingFilter(key as any)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      tradingFilter === key
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                        : 'bg-gray-700/30 text-gray-300 hover:bg-gray-600/30'
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Loại item:</span>
                </div>
                <button
                  onClick={() => setItemTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    itemTypeFilter === 'all'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                      : 'bg-gray-700/30 text-gray-300 hover:bg-gray-600/30'
                  }`}
                >
                  Tất cả
                </button>
                {getItemTypes().map(itemType => (
                  <button
                    key={itemType}
                    onClick={() => setItemTypeFilter(itemType)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      itemTypeFilter === itemType
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                        : 'bg-gray-700/30 text-gray-300 hover:bg-gray-600/30'
                    }`}
                  >
                    {getItemTypeIcon(itemType)} {itemType}
                  </button>
                ))}
              </div>

              {/* Trading Entries */}
              {filteredTradingHistory.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">
                    {tradingFilter === 'all' ? 'Chưa có giao dịch nào' : `Không có giao dịch loại "${tradingFilter}"`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTradingHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className={`glass-effect border rounded-lg p-4 transition-colors ${getTypeBgColor(entry.type)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {getTypeIcon(entry.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-white truncate">
                                {entry.type === 'buy' ? 'Mua' : 'Bán'} {entry.itemName}
                              </span>
                              <span className="text-sm text-gray-400">
                                {getItemTypeIcon(entry.itemType)} {entry.itemType}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mb-2">
                              <div className="flex items-center space-x-1">
                                <Package className="w-3 h-3" />
                                <span>Số lượng: {entry.quantity}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <DollarSign className="w-3 h-3" />
                                <span>Giá: {entry.unitPrice.toLocaleString()} gold/cái</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Store className="w-3 h-3" />
                                <span>{entry.location}</span>
                              </div>
                              {entry.merchantName && (
                                <div className="flex items-center space-x-1">
                                  <User className="w-3 h-3" />
                                  <span>{entry.merchantName}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">Lượt {entry.turn}</span>
                                <span>•</span>
                                <span className="text-sm text-gray-500">{formatDate(entry.timestamp)}</span>
                                <span>•</span>
                                <span className="text-sm text-gray-500">{formatTime(entry.timestamp)}</span>
                              </div>
                              <div className={`text-lg font-bold ${getTypeColor(entry.type)}`}>
                                {entry.type === 'buy' ? '-' : '+'}{entry.totalPrice.toLocaleString()} gold
                              </div>
                            </div>

                            {entry.notes && (
                              <div className="mt-2 text-sm text-gray-400 italic">
                                Ghi chú: {entry.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : filteredEntries.length === 0 ? (
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

                          {/* DC Check Result */}
                          {entry.dcCheckResult && (
                            <div className="text-sm text-gray-300">
                              <span className="text-gray-500">DC Check:</span>
                              <div className="ml-2 mt-1 p-2 bg-blue-900/20 border border-blue-700/30 rounded">
                                <div className="flex items-center space-x-4 text-xs">
                                  <span className="text-blue-300">
                                    <strong>{entry.dcCheckResult.stat.charAt(0).toUpperCase() + entry.dcCheckResult.stat.slice(1)}</strong>
                                  </span>
                                  <span className="text-gray-400">
                                    {entry.dcCheckResult.roll} + {entry.dcCheckResult.modifier} = {entry.dcCheckResult.total}
                                  </span>
                                  <span className="text-gray-400">vs DC {entry.dcCheckResult.dc}</span>
                                  <span className={`font-medium ${entry.dcCheckResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                    {entry.dcCheckResult.success ? 'SUCCESS' : 'FAILURE'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Attack Action Result */}
                          {entry.attackAction && (
                            <div className="text-sm text-gray-300">
                              <span className="text-gray-500">Attack Action:</span>
                              <div className="ml-2 mt-1 p-2 bg-red-900/20 border border-red-700/30 rounded">
                                <div className="text-xs">
                                  <span className="text-red-300">
                                    Target: <strong>{entry.attackAction.targetNPC}</strong>
                                  </span>
                                  <span className="ml-2 text-gray-400">
                                    Status: {entry.attackAction.accepted ? 'Accepted' : 'Declined'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

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
