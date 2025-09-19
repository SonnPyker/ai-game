import { useState } from 'react';
import { GameChatAdvanced } from '../components/Game/GameChatAdvanced';
import { GameSidebar } from '../components/Game/GameSidebar';

export function GamePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Game Sidebar - Top Bar */}
      <GameSidebar 
        isOpen={isSidebarOpen}
        onToggle={handleSidebarToggle}
      />
      
      {/* Game Chat - Full Height with conditional top margin */}
      <div className={`flex-1 overflow-hidden transition-all duration-300 ${
        isSidebarOpen ? 'mt-16' : 'mt-0'
      }`}>
        <GameChatAdvanced />
      </div>
    </div>
  );
}