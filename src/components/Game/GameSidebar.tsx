import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';

interface GameSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function GameSidebar({ isOpen, onToggle }: GameSidebarProps) {

  return (
    <>
      {/* Main Sidebar */}
      <div className={`fixed top-0 left-0 w-full h-16 glass-effect border-b-4 border-white/40 z-40 transition-all duration-300 ${
        isOpen ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="flex items-center justify-between h-full px-4">
          {/* Left side - Toggle button */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onToggle}
              className="p-2 text-gray-300 hover:text-white transition-colors duration-200 border-2 border-white/40 rounded-lg hover:border-white/60"
              title="Đóng sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-2">
              <Menu className="w-5 h-5 text-gray-300" />
              <span className="text-sm text-gray-300">Game Menu</span>
            </div>
          </div>

        </div>
      </div>

      {/* Toggle Button when sidebar is hidden */}
      {!isOpen && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={onToggle}
            className="p-3 text-gray-300 hover:text-white transition-colors duration-200 border-2 border-white/40 rounded-lg hover:border-white/60 glass-effect"
            title="Mở sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}
