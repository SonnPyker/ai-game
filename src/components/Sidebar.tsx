import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  Download,
  Play
} from 'lucide-react';
import { AuthButton } from './Auth/AuthButton';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  onOpenAuthModal: () => void;
}

export function Sidebar({ isOpen, onClose, onToggle, onOpenAuthModal }: SidebarProps) {
  const location = useLocation();

  // Function to check if user is in game creation process
  const isInGameCreationProcess = () => {
    return location.pathname === '/world-builder' || 
           location.pathname === '/create-character' || 
           location.pathname === '/game';
  };

  const menuItems = [
    { id: 'home', label: 'TRANG CHỦ', icon: Home, path: '/', action: 'home' },
    { id: 'init', label: 'KHỞI TẠO', icon: Play, path: '/init', action: 'init' },
    { id: 'saveload', label: 'TẢI GAME', icon: Download, path: '/saveload', action: 'saveload' },
    { id: 'settings', label: 'CÀI ĐẶT', icon: Settings, path: '/settings' },
  ];

  // Function to determine if a menu item is active based on current location
  const isActiveMenuItem = (item: any) => {
    if (item.id === 'home') {
      return location.pathname === '/';
    } else if (item.id === 'init') {
      // Highlight "Khởi tạo" when in game creation process OR on init page
      return location.pathname === '/init' || isInGameCreationProcess();
    } else if (item.id === 'saveload') {
      return location.pathname === '/saveload';
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
        <nav className="p-3 sm:p-4 h-full flex flex-col mobile-padding">
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
        
          <ul className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              // Disable "Khởi tạo" tab when in game creation process
              const isDisabled = item.id === 'init' && isInGameCreationProcess();
              
              const handleClick = (e: React.MouseEvent) => {
                e.preventDefault();
                
                if (isDisabled) return;
                
                onClose();
                
              if (item.action === 'home') {
                // Chuyển đến trang chủ
                window.location.href = '/';
              } else if (item.action === 'init') {
                // Chuyển đến trang khởi tạo
                window.location.href = '/init';
              } else if (item.action === 'saveload') {
                // Chuyển đến trang save/load
                window.location.href = '/saveload';
              } else {
                // Chuyển đến path thông thường
                window.location.href = item.path;
              }
              };
              
              return (
                <li key={item.id}>
                  <a
                    href={item.path}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 border-2 mobile-button ${
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

          {/* Auth Button ở cuối sidebar */}
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <AuthButton onOpenAuthModal={onOpenAuthModal} />
          </div>
        </nav>
      </aside>
    </>
  );
}
