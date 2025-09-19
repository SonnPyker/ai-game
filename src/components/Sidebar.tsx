import { useState } from 'react';
import { 
  Settings,
  X,
  Menu,
  Play
} from 'lucide-react';
import { ServerInfo } from './ServerInfo/ServerInfo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onClose, onToggle }: SidebarProps) {
  const [activeTab, setActiveTab] = useState('home');

  const menuItems = [
    { id: 'new-game', label: 'Chơi Mới', icon: Play, path: '/world-builder', action: 'new-game' },
    { id: 'settings', label: 'Cài Đặt', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className={`fixed left-0 top-0 w-64 sm:w-72 h-full glass-effect border-r border-gray-700/50 overflow-y-auto scrollbar-hide z-50 sidebar-transition ${
      isOpen ? 'sidebar-open' : 'sidebar-closed'
    }`}>
      <nav className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold-vietnamese text-white">Menu</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggle}
              className="p-2 text-gray-300 hover:text-white transition-colors duration-200 border border-gray-600/50 rounded-lg hover:border-gray-500/50"
              title={isOpen ? "Ẩn menu" : "Hiện menu"}
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-300 hover:text-white transition-colors duration-200 border border-gray-600/50 rounded-lg hover:border-gray-500/50"
              title="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isDisabled = false;
            
            const handleClick = (e: React.MouseEvent) => {
              e.preventDefault();
              
              if (isDisabled) return;
              
              setActiveTab(item.id);
              onClose();
              
              if (item.action === 'new-game') {
                // Chuyển đến tạo thế giới trước
                window.location.href = '/world-builder';
              } else {
                // Chuyển đến path thông thường
                window.location.href = item.path;
              }
            };
            
            return (
              <li key={item.id}>
                <a
                  href={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 border-2 ${
                    isDisabled 
                      ? 'bg-gray-500/10 border-gray-500/20 text-gray-500 cursor-not-allowed'
                      : activeTab === item.id
                        ? 'tab-active'
                        : 'tab-inactive'
                  }`}
                  onClick={handleClick}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
        
        {/* Server Info */}
        <div className="mt-6">
          <ServerInfo />
        </div>
      </nav>
    </aside>
  );
}
