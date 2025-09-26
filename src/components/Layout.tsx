import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { AuthModal } from './Auth/AuthModal';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleOpenAuthModal = () => {
    setShowAuthModal(true);
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
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
          onOpenAuthModal={handleOpenAuthModal}
        />
        <main className={`flex-1 main-transition ${
          sidebarOpen ? 'main-with-sidebar' : 'main-full-width'
        } p-2 sm:p-4 lg:p-6`}>
          {children}
        </main>
        
      </div>

      {/* Auth Modal - Render ở cấp cao nhất */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseAuthModal}
        onSuccess={handleCloseAuthModal}
      />
    </div>
  );
}
