import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Home
} from 'lucide-react';
import { ServerInfo } from './ServerInfo/ServerInfo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onClose, onToggle }: SidebarProps) {
  const location = useLocation();

  const menuItems = [
    { id: 'home', label: 'TRANG CHỦ', icon: Home, path: '/', action: 'home' },
    { id: 'new-game', label: 'CHƠI MỚI', icon: Play, path: '/world-builder', action: 'new-game' },
    { id: 'settings', label: 'CÀI ĐẶT', icon: Settings, path: '/settings' },
  ];

  // Function to determine if a menu item is active based on current location
  const isActiveMenuItem = (item: any) => {
    if (item.id === 'home') {
      return location.pathname === '/';
    } else if (item.id === 'new-game') {
      return location.pathname === '/world-builder' || location.pathname === '/create-character' || location.pathname === '/game';
    } else if (item.id === 'settings') {
      return location.pathname === '/settings';
    }
    return false;
  };

  return (
    <>
      {/* Toggle Button - Outside sidebar, middle right */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-50 p-2 bg-primary-500/20 border-2 border-primary-500/50 rounded-lg text-primary-300 hover:bg-primary-500/30 hover:border-primary-400 transition-all duration-200 shadow-lg ${
          isOpen ? 'left-64 sm:left-72' : 'left-2'
        }`}
        title={isOpen ? "Đóng menu" : "Mở menu"}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>

      <aside className={`fixed left-0 top-0 w-64 sm:w-72 h-full glass-effect border-r border-gray-700/50 overflow-y-auto scrollbar-hide z-50 sidebar-transition ${
        isOpen ? 'sidebar-open' : 'sidebar-closed'
      }`}>
        <nav className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold-vietnamese text-white uppercase">MENU</h2>
            <div className="flex items-center space-x-2">
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
              
              onClose();
              
              if (item.action === 'new-game') {
                // Chuyển đến tạo thế giới trước
                window.location.href = '/world-builder';
              } else if (item.action === 'home') {
                // Chuyển đến trang chủ
                window.location.href = '/';
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
                      : isActiveMenuItem(item)
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
    </>
  );
}
