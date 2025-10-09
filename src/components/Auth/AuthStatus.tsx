import { useState, useEffect } from 'react';
import { MotionWrapper } from '../MotionWrapper';
import { LogIn, User, LogOut } from 'lucide-react';
import { authService, AuthState } from '../../services/saveStorage/authService';
import { AuthModal } from './AuthModal';

export function AuthStatus() {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    await authService.signOut();
  };

  return (
    <>
      <MotionWrapper
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-4 right-4 z-40"
      >
        {authState.isAuthenticated ? (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 border border-green-500/50 rounded-lg">
              <User className="w-4 h-4 text-green-300" />
              <span className="text-green-300 text-sm font-medium">
                {authState.user?.name || authState.user?.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors duration-200"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200"
          >
            <LogIn className="w-4 h-4" />
            <span className="text-sm">Đăng nhập</span>
          </button>
        )}
      </MotionWrapper>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </>
  );
}
