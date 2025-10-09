import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Chrome
} from 'lucide-react';
import { authService, AuthState } from '../../services/saveStorage/authService';
import { MotionWrapper } from '../MotionWrapper';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      setMessage({ type: 'success', text: 'Đăng nhập thành công!' });
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    }
  }, [authState.isAuthenticated, authState.user, onSuccess, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (mode === 'signin') {
      const result = await authService.signIn(formData.email, formData.password);
      if (result.success) {
        setMessage({ type: 'success', text: 'Đăng nhập thành công!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Lỗi đăng nhập' });
      }
    } else if (mode === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
        return;
      }
      
      const result = await authService.signUp(formData.email, formData.password, formData.name);
      if (result.success) {
        setMessage({ type: 'success', text: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Lỗi đăng ký' });
      }
    } else if (mode === 'reset') {
      const result = await authService.resetPassword(formData.email);
      if (result.success) {
        setMessage({ type: 'success', text: 'Đã gửi email reset mật khẩu!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Lỗi gửi email reset' });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setMessage(null);
    const result = await authService.signInWithGoogle();
    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Lỗi đăng nhập Google' });
    }
  };

  const handleSignOut = async () => {
    setMessage(null);
    const result = await authService.signOut();
    if (result.success) {
      setMessage({ type: 'success', text: 'Đã đăng xuất!' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Lỗi đăng xuất' });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    });
    setMessage(null);
  };

  const switchMode = (newMode: 'signin' | 'signup' | 'reset') => {
    setMode(newMode);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <MotionWrapper
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <MotionWrapper
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="glass-effect rounded-2xl p-6 max-w-md w-full"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold-vietnamese text-white uppercase">
              {mode === 'signin' && 'Đăng Nhập'}
              {mode === 'signup' && 'Đăng Ký'}
              {mode === 'reset' && 'Reset Mật Khẩu'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 bg-gray-600/20 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-600/30 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status Messages */}
          {message && (
            <MotionWrapper
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 p-3 rounded-lg border ${
                message.type === 'success' 
                  ? 'bg-green-500/20 border-green-500/50 text-green-300'
                  : message.type === 'error'
                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : 'bg-blue-500/20 border-blue-500/50 text-blue-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {message.type === 'success' && <CheckCircle className="w-4 h-4" />}
                {message.type === 'error' && <AlertCircle className="w-4 h-4" />}
                <span className="text-sm">{message.text}</span>
              </div>
            </MotionWrapper>
          )}

          {/* Auth State Display */}
          {authState.isAuthenticated && authState.user && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-green-300" />
                </div>
                <div>
                  <p className="text-green-300 font-medium">
                    {authState.user.name || authState.user.email}
                  </p>
                  <p className="text-green-300/70 text-sm">
                    {authState.user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={authState.isLoading}
                className="mt-3 w-full py-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authState.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Đăng Xuất'
                )}
              </button>
            </div>
          )}

          {/* Auth Form */}
          {!authState.isAuthenticated && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field for signup */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tên
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="Nhập tên của bạn"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    placeholder="Nhập email của bạn"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              {mode !== 'reset' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="Nhập mật khẩu"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm password field for signup */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="Xác nhận mật khẩu"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={authState.isLoading}
                className="w-full py-3 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {authState.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {mode === 'signin' && 'Đăng Nhập'}
                    {mode === 'signup' && 'Đăng Ký'}
                    {mode === 'reset' && 'Gửi Email Reset'}
                  </>
                )}
              </button>

              {/* Google Sign In */}
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Chrome className="w-5 h-5" />
                  <span>Đăng nhập với Google</span>
                </button>
              )}
            </form>
          )}

          {/* Mode switcher */}
          {!authState.isAuthenticated && (
            <div className="mt-6 pt-4 border-t border-gray-600/50">
              <div className="flex justify-center space-x-4 text-sm">
                {mode !== 'signin' && (
                  <button
                    onClick={() => switchMode('signin')}
                    className="text-blue-300 hover:text-blue-200 transition-colors duration-200"
                  >
                    Đăng nhập
                  </button>
                )}
                {mode !== 'signup' && (
                  <button
                    onClick={() => switchMode('signup')}
                    className="text-blue-300 hover:text-blue-200 transition-colors duration-200"
                  >
                    Đăng ký
                  </button>
                )}
                {mode !== 'reset' && (
                  <button
                    onClick={() => switchMode('reset')}
                    className="text-blue-300 hover:text-blue-200 transition-colors duration-200"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
            </div>
          )}
        </MotionWrapper>
      </MotionWrapper>
    </AnimatePresence>
  );
}
