import { Routes, Route } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { HomePage } from './pages/HomePage';
import { CharacterCreationPage } from './pages/CharacterCreationPage';
import { GamePage } from './pages/GamePage';
import { SettingsPage } from './pages/SettingsPage';
import { SaveLoadPage } from './pages/SaveLoadPage';
import { InitPage } from './pages/InitPage';
import { WorldBuilder } from './components/WorldBuilder/WorldBuilder';
import { Layout } from './components/Layout';
// import { useRefreshHandler } from './hooks/useRefreshHandler';

function App() {
  // Sử dụng hook để xử lý refresh (tạm thời tắt để tránh xung đột với navigation)
  // useRefreshHandler();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/init" element={<InitPage />} />
        <Route path="/create-character" element={<CharacterCreationPage />} />
        <Route path="/world-builder" element={<WorldBuilder />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/saveload" element={<SaveLoadPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <SpeedInsights />
    </Layout>
  );
}

export default App;
