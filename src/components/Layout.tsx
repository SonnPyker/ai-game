import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AuthModal } from './Auth/AuthModal';
import { useResponsiveContext } from '../contexts/ResponsiveContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { shouldUseMobileLayout } = useResponsiveContext();

  // Mở sidebar mặc định khi ở homepage, đóng ở các trang khác
  useEffect(() => {
    if (location.pathname === '/') {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

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

  // Auto-close sidebar on mobile when navigating
  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (shouldUseMobileLayout() && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname, shouldUseMobileLayout]);



  return (
    <div className="min-h-screen bg-black">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && shouldUseMobileLayout() && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
          }}
          style={{ zIndex: 40 }}
        />
      )}
      
      <div className="flex">
        <Sidebar 
          key={sidebarOpen ? 'open' : 'closed'}
          isOpen={sidebarOpen} 
          onClose={handleSidebarClose}
          onToggle={toggleSidebar}
          onOpenAuthModal={handleOpenAuthModal}
        />
        <main className={`flex-1 main-transition ${
          sidebarOpen && !shouldUseMobileLayout() ? 'main-with-sidebar' : 'main-full-width'
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
