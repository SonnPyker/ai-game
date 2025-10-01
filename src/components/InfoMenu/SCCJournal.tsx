import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Calendar, Clock, FileText, Eye, EyeOff } from 'lucide-react';
import { SCCSummary } from '../../types';

interface IndexedSummary {
  summary: SCCSummary;
  sceneState: any;
  turn: number;
  createdAt: string;
}

interface SCCJournalProps {
  isVisible: boolean;
}

export function SCCJournal({ isVisible }: SCCJournalProps) {
  const [summaries, setSummaries] = useState<IndexedSummary[]>([]);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Load summaries from localStorage
  useEffect(() => {
    if (isVisible) {
      loadSummaries();
    }
  }, [isVisible]);

  const loadSummaries = () => {
    setIsLoading(true);
    try {
      const indexedSummaries = JSON.parse(localStorage.getItem('rp_summary_indexed') || '{}');
      
      const summaryList: IndexedSummary[] = Object.keys(indexedSummaries)
        .map(Number)
        .sort((a, b) => b - a) // Sort by turn number descending (newest first)
        .filter(turn => {
          const item = indexedSummaries[turn];
          // Chỉ lấy các item có cấu trúc SCC summary hợp lệ
          return item && 
                 item.summary && 
                 typeof item.summary === 'object' &&
                 (item.summary.recap || item.summary.timeline || item.summary.clues);
        })
        .map(turn => ({
          ...indexedSummaries[turn],
          turn
        }));
      
      setSummaries(summaryList);
    } catch (error) {
      console.error('Lỗi load SCC summaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSummary = (turn: number) => {
    const newExpanded = new Set(expandedSummaries);
    if (newExpanded.has(turn)) {
      newExpanded.delete(turn);
    } else {
      newExpanded.add(turn);
    }
    setExpandedSummaries(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Không xác định';
    }
  };

  const getSummaryPreview = (summary: SCCSummary) => {
    if (summary.recap) {
      return summary.recap.length > 100 
        ? summary.recap.substring(0, 100) + '...'
        : summary.recap;
    }
    return 'Không có tóm tắt';
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Nhật ký SCC
        </h3>
        <button
          onClick={loadSummaries}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-gray-400">
          Đang tải nhật ký...
        </div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Chưa có nhật ký nào</p>
          <p className="text-sm mt-1">Nhật ký sẽ xuất hiện sau mỗi 20 lượt chơi</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
          {summaries.map((item) => {
            const isExpanded = expandedSummaries.has(item.turn);
            const preview = getSummaryPreview(item.summary);
            
            return (
              <div
                key={item.turn}
                className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                  onClick={() => toggleSummary(item.turn)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-white">
                          Lượt {item.turn}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {!isExpanded && (
                    <div className="mt-2 text-sm text-gray-300 line-clamp-2">
                      {preview}
                    </div>
                  )}
                </div>

                {/* Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-700">
                    <div className="space-y-4 mt-4">
                      {/* Recap */}
                      {item.summary.recap && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-400 mb-2">Tóm tắt</h4>
                          <div className="text-sm text-gray-300 bg-gray-900 p-3 rounded border">
                            {item.summary.recap}
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      {item.summary.timeline && Array.isArray(item.summary.timeline) && item.summary.timeline.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-400 mb-2">Timeline</h4>
                          <div className="space-y-2">
                            {item.summary.timeline.map((event, index) => (
                              <div key={index} className="text-sm text-gray-300 bg-gray-900 p-2 rounded border">
                                <span className="font-medium text-yellow-400">{event.when}:</span> {event.what}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clues */}
                      {item.summary.clues && Array.isArray(item.summary.clues) && item.summary.clues.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-400 mb-2">Manh mối</h4>
                          <div className="space-y-1">
                            {item.summary.clues.map((clue, index) => (
                              <div key={index} className="text-sm text-gray-300 bg-gray-900 p-2 rounded border">
                                • {typeof clue === 'string' ? clue : JSON.stringify(clue)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Open Threads */}
                      {item.summary.openThreads && Array.isArray(item.summary.openThreads) && item.summary.openThreads.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-400 mb-2">Luồng câu chuyện mở</h4>
                          <div className="space-y-1">
                            {item.summary.openThreads.map((thread, index) => (
                              <div key={index} className="text-sm text-gray-300 bg-gray-900 p-2 rounded border">
                                • {typeof thread === 'string' ? thread : JSON.stringify(thread)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Relationships */}
                      {item.summary.relationships && Array.isArray(item.summary.relationships) && item.summary.relationships.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-400 mb-2">Mối quan hệ</h4>
                          <div className="space-y-1">
                            {item.summary.relationships.map((rel, index) => (
                              <div key={index} className="text-sm text-gray-300 bg-gray-900 p-2 rounded border">
                                <span className="font-medium text-green-400">{rel.npc}:</span> {rel.status}
                                {rel.notes && <span className="text-gray-400"> - {rel.notes}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Goals */}
                      {item.summary.goals && Array.isArray(item.summary.goals) && item.summary.goals.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-400 mb-2">Mục tiêu</h4>
                          <div className="space-y-1">
                            {item.summary.goals.map((goal, index) => (
                              <div key={index} className="text-sm text-gray-300 bg-gray-900 p-2 rounded border">
                                <span className="font-medium text-purple-400">PC:</span> {goal.pcGoal}
                                {goal.actGoal && (
                                  <div className="mt-1">
                                    <span className="font-medium text-orange-400">Act:</span> {goal.actGoal}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Risks */}
                      {item.summary.risks && Array.isArray(item.summary.risks) && item.summary.risks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-400 mb-2">Rủi ro</h4>
                          <div className="space-y-1">
                            {item.summary.risks.map((risk, index) => (
                              <div key={index} className="text-sm text-gray-300 bg-gray-900 p-2 rounded border">
                                • {typeof risk === 'string' ? risk : JSON.stringify(risk)}
                              </div>
                            ))}
                          </div>
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
  );
}
