import { Routes, Route } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { Suspense, lazy } from 'react';
import { Layout } from './components/Layout';
import { ResponsiveProvider } from './contexts/ResponsiveContext';
import { MinimizedModalProvider } from './contexts/MinimizedModalContext';
import { MinimizedModalContainer } from './components/MinimizedModalContainer';
import { AnimationController } from './components/AnimationController';

// Lazy load các pages lớn để giảm kích thước bundle chính
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const CharacterCreationPage = lazy(() => import('./pages/CharacterCreationPage').then(module => ({ default: module.CharacterCreationPage })));
const GamePage = lazy(() => import('./pages/GamePage').then(module => ({ default: module.GamePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const SaveLoadPage = lazy(() => import('./pages/SaveLoadPage').then(module => ({ default: module.SaveLoadPage })));
const InitPage = lazy(() => import('./pages/InitPage').then(module => ({ default: module.InitPage })));
const CombatPage = lazy(() => import('./pages/CombatPage').then(module => ({ default: module.CombatPage })));
const WorldBuilder = lazy(() => import('./components/WorldBuilder/WorldBuilder').then(module => ({ default: module.WorldBuilder })));

function App() {

  return (
    <ResponsiveProvider>
      <MinimizedModalProvider>
        <AnimationController />
        <Layout>
        <Suspense fallback={
          <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="glass-effect p-8 rounded-2xl text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-white">Đang tải...</p>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/init" element={<InitPage />} />
            <Route path="/create-character" element={<CharacterCreationPage />} />
            <Route path="/world-builder" element={<WorldBuilder />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/combat" element={<CombatPage />} />
            <Route path="/saveload" element={<SaveLoadPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
        <MinimizedModalContainer />
        <SpeedInsights />
        <Analytics />
      </Layout>
      </MinimizedModalProvider>
    </ResponsiveProvider>
  );
}

export default App;
