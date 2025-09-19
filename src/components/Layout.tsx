import { ReactNode, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };


  return (
    <div className="min-h-screen bg-black">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}
      
      <div className="flex">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={closeSidebar}
          onToggle={toggleSidebar}
        />
        <main className={`flex-1 main-transition ${
          sidebarOpen ? 'main-with-sidebar' : 'main-full-width'
        } p-2 sm:p-4 lg:p-6`}>
          {/* Toggle Button - chỉ hiện khi sidebar đóng */}
          {!sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="fixed top-2 left-2 sm:top-4 sm:left-4 z-40 p-2 sm:p-3 bg-primary-500/20 border-2 border-primary-500/50 rounded-lg text-primary-300 hover:bg-primary-500/30 hover:border-primary-400 transition-all duration-200 shadow-lg"
              title="Mở menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          
          
          {children}
        </main>
        
      </div>
    </div>
  );
}
