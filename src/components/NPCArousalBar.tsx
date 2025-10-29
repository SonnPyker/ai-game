import { NPCRelationship, ContentFlags } from '../types';
import { npcArousalService } from '../services/npcArousalService';
import { npcRelationshipService } from '../services/npcRelationshipService';

interface NPCArousalBarProps {
  npc: NPCRelationship;
  contentFlags?: ContentFlags;
  className?: string;
}

export function NPCArousalBar({ npc, contentFlags, className = '' }: NPCArousalBarProps) {
  // Only show if adult content is enabled and in direct mode
  if (!npcArousalService.shouldShowArousalBar(contentFlags)) {
    return null;
  }

  // Initialize arousal data if not exists
  if (!npc.arousal) {
    npcArousalService.initializeArousalForNPC(npc);
    // Save the updated NPC data
    npcRelationshipService.saveData();
  }

  const arousal = npc.arousal;
  if (!arousal) {
    return null; // Safety check
  }
  const description = npcArousalService.getArousalDescription(arousal.level);
  const color = npcArousalService.getArousalColor(arousal.level);
  const barColor = npcArousalService.getArousalBarColor(arousal.level);
  const response = npcArousalService.getArousalResponse(npc);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Arousal Level Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${color}`}>
            Hứng tình: {description}
          </span>
          <span className="text-gray-400">
            {arousal.level}/100
          </span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${barColor}`}
            style={{ width: `${arousal.level}%` }}
          />
        </div>
      </div>

      {/* Arousal Response */}
      {response && (
        <div className="text-xs text-gray-300 italic">
          {response}
        </div>
      )}


    </div>
  );
}
