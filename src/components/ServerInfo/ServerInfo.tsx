import { useState, useEffect } from 'react';
import { MotionWrapper } from '../MotionWrapper';
import { 
  Server, 
  Wifi, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  Check,
  AlertTriangle
} from 'lucide-react';

interface ServerInfoProps {
  className?: string;
}

export function ServerInfo({ className = '' }: ServerInfoProps) {
  const [serverInfo, setServerInfo] = useState<{
    port: number;
    url: string;
    status: 'online' | 'offline' | 'checking';
  }>({
    port: 5173,
    url: 'http://localhost:5173',
    status: 'checking'
  });
  
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    detectServerInfo();
  }, []);

  const detectServerInfo = async () => {
    setServerInfo(prev => ({ ...prev, status: 'checking' }));
    
    // Thử các port phổ biến
    const ports = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
    
    for (const port of ports) {
      try {
        await fetch(`http://localhost:${port}`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: AbortSignal.timeout(1000)
        });
        
        setServerInfo({
          port,
          url: `http://localhost:${port}`,
          status: 'online'
        });
        return;
      } catch (error) {
        // Port không khả dụng, thử port tiếp theo
        continue;
      }
    }
    
    // Không tìm thấy server nào
    setServerInfo(prev => ({ ...prev, status: 'offline' }));
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(serverInfo.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Không thể copy URL:', error);
    }
  };

  const openInNewTab = () => {
    window.open(serverInfo.url, '_blank');
  };

  const getStatusColor = () => {
    switch (serverInfo.status) {
      case 'online': return 'text-yellow-400';
      case 'offline': return 'text-white';
      case 'checking': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (serverInfo.status) {
      case 'online': return <Wifi className="w-4 h-4" />;
      case 'offline': return <AlertTriangle className="w-4 h-4" />;
      case 'checking': return <RefreshCw className="w-4 h-4 animate-spin" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (serverInfo.status) {
      case 'online': return 'Server đang chạy';
      case 'offline': return 'Server không khả dụng';
      case 'checking': return 'Đang kiểm tra...';
      default: return 'Không xác định';
    }
  };

  return (
    <MotionWrapper
      className={`glass-effect p-4 rounded-lg ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Server className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-semibold text-white">Server Info</h3>
        </div>
        <button
          onClick={detectServerInfo}
          className="p-1 text-gray-400 hover:text-white transition-colors duration-200"
          title="Kiểm tra lại"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {/* Status */}
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Port & URL */}
        {serverInfo.status === 'online' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Port:</span>
              <span className="text-sm font-mono text-white">{serverInfo.port}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <div className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs font-mono text-white truncate">
                {serverInfo.url}
              </div>
              <button
                onClick={copyUrl}
                className="p-1 text-gray-400 hover:text-white transition-colors duration-200"
                title="Copy URL"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
              <button
                onClick={openInNewTab}
                className="p-1 text-gray-400 hover:text-white transition-colors duration-200"
                title="Mở trong tab mới"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Offline Message */}
        {serverInfo.status === 'offline' && (
          <div className="text-xs text-gray-400">
            <p>Không tìm thấy server nào đang chạy.</p>
            <p>Hãy chạy <code className="text-yellow-400">start.bat</code> để khởi động server.</p>
          </div>
        )}
      </div>
    </MotionWrapper>
  );
}
