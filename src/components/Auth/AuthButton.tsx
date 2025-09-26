import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogIn, User, LogOut } from 'lucide-react';
import { authService, AuthState } from '../../services/saveStorage/authService';

interface AuthButtonProps {
  onOpenAuthModal: () => void;
}

export function AuthButton({ onOpenAuthModal }: AuthButtonProps) {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    await authService.signOut();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-auto"
      >
        {authState.isLoading ? (
          <div className="flex items-center justify-center space-x-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <div className="w-4 h-4 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-yellow-300 text-sm">Đang kiểm tra...</span>
          </div>
        ) : authState.isAuthenticated ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 border border-green-500/50 rounded-lg">
              <User className="w-4 h-4 text-green-300" />
              <span className="text-green-300 text-sm font-medium truncate">
                {authState.user?.name || authState.user?.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors duration-200"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Đăng xuất</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200"
          >
            <LogIn className="w-4 h-4" />
            <span className="text-sm">Đăng nhập</span>
          </button>
        )}
      </motion.div>
    </>
  );
}
