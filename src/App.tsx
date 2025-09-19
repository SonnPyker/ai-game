import { Routes, Route } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { HomePage } from './pages/HomePage';
import { CharacterCreationPage } from './pages/CharacterCreationPage';
import { GamePage } from './pages/GamePage';
import { SettingsPage } from './pages/SettingsPage';
import { WorldBuilder } from './components/WorldBuilder/WorldBuilder';
import { Layout } from './components/Layout';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-character" element={<CharacterCreationPage />} />
        <Route path="/world-builder" element={<WorldBuilder />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <SpeedInsights />
    </Layout>
  );
}

export default App;
