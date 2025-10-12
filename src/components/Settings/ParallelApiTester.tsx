import { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Zap
} from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { MotionWrapper } from '../MotionWrapper';

interface TestResult {
  id: string;
  prompt: string;
  keyName: string;
  accountName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: string;
  response?: string;
}

export function ParallelApiTester() {
  const [isRunning, setIsRunning] = useState(false);
  const [testCount, setTestCount] = useState(5);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [stats, setStats] = useState({
    completed: 0,
    errors: 0,
    averageTime: 0,
    totalTime: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning) {
        updateStats();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, testResults]);

  const updateStats = () => {
    const completed = testResults.filter(r => r.status === 'completed').length;
    const errors = testResults.filter(r => r.status === 'error').length;
    const completedResults = testResults.filter(r => r.status === 'completed' && r.duration);
    const averageTime = completedResults.length > 0 
      ? Math.round(completedResults.reduce((sum, r) => sum + (r.duration || 0), 0) / completedResults.length)
      : 0;
    const totalTime = testResults.length > 0 
      ? Math.round((Date.now() - testResults[0].startTime) / 1000)
      : 0;

    setStats({ completed, errors, averageTime, totalTime });
  };

  const generateTestPrompts = (count: number): string[] => {
    const prompts = [
      "Hãy tạo một câu chuyện ngắn về một hiệp sĩ dũng cảm.",
      "Mô tả một thế giới phép thuật với những sinh vật kỳ lạ.",
      "Viết một cuộc đối thoại giữa hai nhân vật trong một quán rượu.",
      "Tạo một câu đố thú vị về kho báu bị mất tích.",
      "Mô tả một trận chiến épic giữa rồng và pháp sư.",
      "Viết về một cuộc phiêu lưu trong hang động bí ẩn.",
      "Tạo một nhân vật phản diện với động cơ phức tạp.",
      "Mô tả một lễ hội ma quái trong thế giới fantasy.",
      "Viết về cuộc gặp gỡ với một vị thần cổ đại.",
      "Tạo một câu chuyện về việc tìm kiếm thuốc giải độc."
    ];

    return Array.from({ length: count }, (_, i) => 
      prompts[i % prompts.length] + ` (Test ${i + 1})`
    );
  };

  const runParallelTest = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setTestResults([]);
    setStats({ completed: 0, errors: 0, averageTime: 0, totalTime: 0 });

    const prompts = generateTestPrompts(testCount);
    const apiKeys = geminiService.getApiKeys();
    
    console.log(`🚀 [Parallel Test] Starting ${testCount} requests with ${apiKeys.length} keys`);

    // Create initial test results
    const initialResults: TestResult[] = prompts.map((prompt, index) => ({
      id: `test-${Date.now()}-${index}`,
      prompt,
      keyName: 'Pending',
      accountName: 'Pending',
      status: 'pending',
      startTime: Date.now()
    }));

    setTestResults(initialResults);

    // Execute all requests in parallel
    const promises = prompts.map(async (prompt, index) => {
      const resultId = initialResults[index].id;
      
      try {
        // Update status to processing
        setTestResults(prev => prev.map(r => 
          r.id === resultId 
            ? { ...r, status: 'processing' as const, startTime: Date.now() }
            : r
        ));

        const startTime = Date.now();
        const response = await geminiService.generateContent(prompt);
        const duration = Date.now() - startTime;

        // Get the actual key used for this specific request
        // Wait a bit for the request to be processed and tracked
        await new Promise(resolve => setTimeout(resolve, 200));
        const usedKey = geminiService.getKeyForRequest(resultId);
        
        setTestResults(prev => prev.map(r => 
          r.id === resultId 
            ? { 
                ...r, 
                status: 'completed' as const,
                keyName: usedKey?.name || 'Unknown',
                accountName: usedKey?.accountName || 'Unknown',
                endTime: Date.now(),
                duration,
                response: response.substring(0, 100) + '...'
              }
            : r
        ));

        console.log(`✅ [Test ${index + 1}] Completed in ${duration}ms using ${usedKey?.accountName || 'Unknown'} (${usedKey?.name || 'Unknown'})`);
        
      } catch (error) {
        const duration = Date.now() - Date.now();
        await new Promise(resolve => setTimeout(resolve, 200));
        const usedKey = geminiService.getKeyForRequest(resultId);
        
        setTestResults(prev => prev.map(r => 
          r.id === resultId 
            ? { 
                ...r, 
                status: 'error' as const,
                keyName: usedKey?.name || 'Unknown',
                accountName: usedKey?.accountName || 'Unknown',
                endTime: Date.now(),
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            : r
        ));

        console.error(`❌ [Test ${index + 1}] Failed using ${usedKey?.accountName || 'Unknown'}:`, error);
      }
    });

    // Wait for all requests to complete
    await Promise.allSettled(promises);
    
    setIsRunning(false);
    console.log(`🏁 [Parallel Test] Completed - ${stats.completed} success, ${stats.errors} errors`);
  };

  const stopTest = () => {
    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
    setStats({ completed: 0, errors: 0, averageTime: 0, totalTime: 0 });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'processing':
        return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-400';
      case 'processing':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            <span>Parallel API Testing</span>
          </h3>
          <p className="text-gray-400 mt-1">
            Test hiệu suất xử lý song song với nhiều API keys
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="number"
            min="1"
            max="20"
            value={testCount}
            onChange={(e) => setTestCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            disabled={isRunning}
            className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center disabled:opacity-50"
          />
          <button
            onClick={isRunning ? stopTest : runParallelTest}
            disabled={geminiService.getApiKeys().length === 0}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              isRunning 
                ? 'bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30'
                : 'bg-green-500/20 border border-green-500/50 text-green-300 hover:bg-green-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? 'Dừng' : 'Bắt đầu'}</span>
          </button>
          <button
            onClick={clearResults}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-500/20 border border-gray-500/50 text-gray-300 hover:bg-gray-500/30 rounded-lg transition-colors disabled:opacity-50"
          >
            Xóa
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-effect p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Hoàn thành</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.completed}</div>
        </div>
        
        <div className="glass-effect p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-gray-400">Lỗi</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.errors}</div>
        </div>
        
        <div className="glass-effect p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Thời gian TB</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.averageTime}ms</div>
        </div>
        
        <div className="glass-effect p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-400">Tổng thời gian</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalTime}s</div>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-white">Kết quả Test</h4>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {testResults.map((result, index) => (
              <MotionWrapper
                key={result.id}
                className="glass-effect p-4 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <div className="text-white font-medium">
                        Test {index + 1}: {result.prompt.substring(0, 50)}...
                      </div>
                      <div className="text-sm text-gray-400">
                        {result.accountName} ({result.keyName})
                        {result.duration && ` • ${result.duration}ms`}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                    {result.status === 'pending' && 'Chờ xử lý'}
                    {result.status === 'processing' && 'Đang xử lý...'}
                    {result.status === 'completed' && 'Hoàn thành'}
                    {result.status === 'error' && 'Lỗi'}
                  </div>
                </div>
                
                {result.error && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-300 text-sm">
                    {result.error}
                  </div>
                )}
                
                {result.response && (
                  <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-green-300 text-sm">
                    {result.response}
                  </div>
                )}
              </MotionWrapper>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="glass-effect p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-300 mb-2">Hướng dẫn sử dụng:</h4>
        <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
          <li>Chọn số lượng requests muốn test (1-20)</li>
          <li>Click "Bắt đầu" để chạy test song song</li>
          <li>Quan sát console để xem logs chi tiết</li>
          <li>Mỗi key sẽ xử lý 1 request khác nhau</li>
          <li>Test sẽ dừng khi tất cả requests hoàn thành</li>
        </ul>
      </div>
    </div>
  );
}
