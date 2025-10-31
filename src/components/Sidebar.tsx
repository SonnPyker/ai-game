import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { useResponsiveContext } from '../contexts/ResponsiveContext';
import { UIToggle } from './UIToggle';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  onOpenAuthModal: () => void;
}

export function Sidebar({ isOpen, onClose, onToggle, onOpenAuthModal }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { shouldUseMobileLayout } = useResponsiveContext();
  const sidebarRef = useRef<HTMLElement>(null);

  // Force update transform when isOpen changes
  useEffect(() => {
    if (sidebarRef.current) {
      if (isOpen) {
        sidebarRef.current.style.display = 'block';
        sidebarRef.current.style.transform = 'translateX(0)';
      } else {
        sidebarRef.current.style.transform = 'translateX(-100%)';
        // Immediate hiding without delay
        sidebarRef.current.style.display = 'none';
      }
    }
  }, [isOpen]);

  // Function to check if user is in game creation process
  const isInGameCreationProcess = () => {
    return location.pathname === '/world-builder' || 
           location.pathname === '/create-character' || 
           location.pathname === '/game';
  };

  const menuItems = [
    { id: 'home', label: 'TRANG CHỦ', icon: Home, path: '/', action: 'home' },
    { id: 'init', label: 'TIẾP TỤC', icon: Play, path: '/init', action: 'init' },
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
        className={`fixed top-1/2 -translate-y-1/2 z-[70] p-2 bg-primary-500/20 border-2 border-primary-500/50 rounded-lg text-primary-300 hover:bg-primary-500/30 hover:border-primary-400 transition-all duration-200 shadow-lg ${
          isOpen && !shouldUseMobileLayout() ? 'left-64 sm:left-72' : 'left-2'
        }`}
        title={isOpen ? "Đóng menu" : "Mở menu"}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>

      <aside 
        className={`fixed left-0 top-0 h-full glass-effect border-r border-gray-700/50 overflow-y-auto scrollbar-hide z-[60] ${
          shouldUseMobileLayout() 
            ? 'w-80 sidebar-mobile' // Wider on mobile for better usability
            : 'w-64 sm:w-72'
        }`}
        style={{
          willChange: 'transform'
        }}
        ref={sidebarRef}
      >
        <nav className="p-3 sm:p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold-vietnamese text-white uppercase">MENU</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="p-3 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors duration-200 border-2 border-red-500/50 rounded-lg sidebar-close-btn"
                title="Đóng menu"
                style={{ zIndex: 10001 }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* UI Toggle - Always visible */}
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300 font-medium">Giao diện</span>
            </div>
            <UIToggle />
          </div>
        
          <ul className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              // Disable "Tiếp tục" tab when in game creation process
              const isDisabled = item.id === 'init' && isInGameCreationProcess();
              
              const handleClick = (e: React.MouseEvent) => {
                e.preventDefault();
                
                if (isDisabled) return;
                
                // Đóng sidebar trước khi navigate
                onClose();
                
                // Sử dụng React Router để navigate
                if (item.action === 'home') {
                  navigate('/');
                } else if (item.action === 'init') {
                  navigate('/init');
                } else if (item.action === 'saveload') {
                  navigate('/saveload');
                } else {
                  navigate(item.path);
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

          {/* Auth Button ở cuối sidebar */}
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <AuthButton onOpenAuthModal={onOpenAuthModal} />
          </div>
        </nav>
      </aside>
    </>
  );
}
