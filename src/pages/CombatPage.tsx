import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Zap, 
  ArrowLeft, 
  Play,
  Pause,
  MessageSquare,
  Pin,
  PinOff
} from 'lucide-react';
import { Character, Enemy } from '../types';
import { combatService, CombatState } from '../services/combatService';
import { inventoryService } from '../services/inventoryService';
import { combatLevelService } from '../services/combatLevelService';

// Combat Components
import { CombatantCard } from '../components/CombatPage/CombatantCard';
import { CombatLog } from '../components/CombatPage/CombatLog';
import { ActionMenu } from '../components/CombatPage/ActionMenu';
import { CombatInventory } from '../components/CombatPage/CombatInventory';
import { CombatResults } from '../components/CombatPage/CombatResults';
import { CombatConfirmationModal } from '../components/CombatPage/CombatConfirmationModal';

interface CombatPageProps {}

export function CombatPage({}: CombatPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCombatLog, setShowCombatLog] = useState(false);
  const [isCombatLogPinned, setIsCombatLogPinned] = useState(false);
  
  // Combat confirmation modal states
  const [showCombatConfirmation, setShowCombatConfirmation] = useState(false);
  const [selectedNPCForCombat, setSelectedNPCForCombat] = useState<any>(null);
  const [combatPreparationStatus, setCombatPreparationStatus] = useState<any>(null);
  const [isPreparingCombat, setIsPreparingCombat] = useState(false);
  const isInitializedRef = useRef(false);

  // Initialize combat from location state or create test combat
  useEffect(() => {
    if (isInitializedRef.current) return; // Prevent multiple initializations
    
    const initializeCombat = async () => {
      try {
        isInitializedRef.current = true;
        
        // Check for NPC combat from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const npcId = urlParams.get('npcId');
        
        if (npcId) {
          // Load NPC data and show confirmation modal
          await loadNPCAndShowConfirmation(npcId);
          return;
        }

        // Get combat data from navigation state
        const combatData = location.state as { 
          player: Character; 
          enemies: Enemy[]; 
          context?: string;
        };

        if (combatData?.player && combatData?.enemies) {
          // Start combat with provided data
          const newCombatState = combatService.initiateCombat(combatData.player, combatData.enemies);
          setCombatState(newCombatState);
        } else {
          // Create test combat for development
          await createTestCombat();
        }
      } catch (error) {
        console.error('Error initializing combat:', error);
        // Fallback to test combat
        await createTestCombat();
      }
    };

    // Only run once on mount
    initializeCombat();
  }, []); // Empty dependency array - only run once

  // createNPCCombat function removed - replaced with loadNPCAndShowConfirmation

  // Function to load NPC and show confirmation modal
  const loadNPCAndShowConfirmation = async (npcId: string) => {
    try {
      // Load NPC data
      const { npcRelationshipService } = await import('../services/npcRelationshipService');
      const npc = npcRelationshipService.getRelationship(npcId);
      if (!npc) {
        throw new Error('Không tìm thấy NPC');
      }

      // Set selected NPC and show confirmation modal
      setSelectedNPCForCombat(npc);
      setShowCombatConfirmation(true);
      
      // Start preparation process
      setIsPreparingCombat(true);
      setCombatPreparationStatus({
        hasCombatStats: false,
        hasWeapon: false,
        hasValidLevel: false,
        isGenerating: true,
        errors: []
      });

      // Prepare NPC for combat
      const { combatPreparationService } = await import('../services/combatPreparationService');
      const { npc: preparedNPC, status } = await combatPreparationService.prepareNPCForCombat(npcId);
      
      // Update status
      setCombatPreparationStatus(status);
      setSelectedNPCForCombat(preparedNPC);
      setIsPreparingCombat(false);
      
    } catch (error) {
      console.error('Error preparing combat with NPC:', error);
      setCombatPreparationStatus({
        hasCombatStats: false,
        hasWeapon: false,
        hasValidLevel: false,
        isGenerating: false,
        errors: [`Lỗi chuẩn bị: ${error instanceof Error ? error.message : 'Unknown error'}`]
      });
      setIsPreparingCombat(false);
    }
  };

  // Function to start actual combat
  const handleStartCombat = useCallback(async () => {
    if (!selectedNPCForCombat) {
      alert('Không tìm thấy dữ liệu NPC. Vui lòng thử lại.');
      return;
    }

    try {
      // Load character data
      const characterData = JSON.parse(localStorage.getItem('currentCharacter') || 'null');
      if (!characterData) {
        throw new Error('Không tìm thấy dữ liệu nhân vật');
      }

      // Generate enemy from prepared NPC
      const enemy: Enemy = {
        id: `npc_${selectedNPCForCombat.id}`,
        name: selectedNPCForCombat.name,
        description: selectedNPCForCombat.description || `Một ${selectedNPCForCombat.name} đang tức giận vì bị tấn công.`,
        type: 'humanoid',
        level: selectedNPCForCombat.combatStats?.combatLevel || selectedNPCForCombat.combatStats?.level,
        combatLevel: selectedNPCForCombat.combatStats?.combatLevel || selectedNPCForCombat.combatStats?.level,
        characterLevel: selectedNPCForCombat.combatStats?.characterLevel,
        stats: selectedNPCForCombat.combatStats?.stats || {
          strength: 10,
          agility: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
          modifiers: {
            strength: 0,
            agility: 0,
            constitution: 0,
            intelligence: 0,
            wisdom: 0,
            charisma: 0
          }
        },
        health: { 
          current: selectedNPCForCombat.combatStats?.health?.current || 20,
          max: selectedNPCForCombat.combatStats?.health?.max || 20
        },
        armorClass: selectedNPCForCombat.combatStats?.armorClass || 10,
        attacks: selectedNPCForCombat.combatStats?.attacks || [],
        abilities: selectedNPCForCombat.combatStats?.abilities,
        experienceReward: (selectedNPCForCombat.combatStats?.combatLevel || selectedNPCForCombat.combatStats?.level || 1) * 10,
        npcId: selectedNPCForCombat.id
      };

      // Start combat
      const newCombatState = combatService.initiateCombat(characterData, [enemy]);
      setCombatState(newCombatState);
      
      // Close modal
      setShowCombatConfirmation(false);
      setSelectedNPCForCombat(null);
      setCombatPreparationStatus(null);
      
    } catch (error) {
      console.error('Error starting combat:', error);
      alert('Có lỗi xảy ra khi bắt đầu combat. Vui lòng thử lại.');
    }
  }, [selectedNPCForCombat]);

  // Function to close combat confirmation modal
  const handleCloseCombatConfirmation = useCallback(() => {
    setShowCombatConfirmation(false);
    setSelectedNPCForCombat(null);
    setCombatPreparationStatus(null);
    setIsPreparingCombat(false);
    // Navigate back to game page
    navigate('/game');
  }, [navigate]);

  // Create test combat for development
  const createTestCombat = async () => {
    try {
      // Get current character from localStorage
      const characterData = localStorage.getItem('currentCharacter');
      if (!characterData) {
        console.error('No character data found');
        navigate('/game');
        return;
      }

      const player: Character = JSON.parse(characterData);
      
      // Create test enemies
      const testEnemies: Enemy[] = [
        {
          id: 'test_goblin',
          name: 'Goblin Test',
          description: 'Một goblin thử nghiệm.',
          type: 'humanoid',
          level: 1,
          combatLevel: 1,
          stats: {
            strength: 12,
            agility: 14,
            constitution: 10,
            intelligence: 8,
            wisdom: 10,
            charisma: 8,
            modifiers: {
              strength: 1,
              agility: 2,
              constitution: 0,
              intelligence: -1,
              wisdom: 0,
              charisma: -1
            }
          },
          health: { current: 7, max: 7 },
          armorClass: 12,
          attacks: [
            {
              name: 'Scimitar',
              attackBonus: 4,
              damage: '1d6+1',
              damageType: 'physical'
            }
          ],
          experienceReward: 25
        }
      ];

      const newCombatState = combatService.initiateCombat(player, testEnemies);
      setCombatState(newCombatState);
    } catch (error) {
      console.error('Error creating test combat:', error);
    }
  };

  // Handle attack action
  const handleAttack = useCallback(async (attackIndex: number, targetId?: string) => {
    if (!combatState || !combatState.isPlayerTurn || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const currentCombatant = combatService.getCurrentCombatant();
      if (!currentCombatant) return;

      // If no target specified, use first alive enemy
      const target = targetId ? 
        combatService.getCombatant(targetId) : 
        combatService.getAliveEnemies()[0];

      if (!target) return;

      // Perform attack
      const success = combatService.performAttack(currentCombatant.id, target.id, attackIndex);
      
      if (success) {
        // Update combat state
        setCombatState({ ...combatService.getCurrentCombat()! });
        
        // Check if combat ended
        if (!combatService.getCurrentCombat()?.isActive) {
          setShowResults(true);
          return;
        }
        
        // End turn
        combatService.endTurn();
        setCombatState({ ...combatService.getCurrentCombat()! });
      }
    } catch (error) {
      console.error('Error performing attack:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [combatState, isProcessing]);

  // Handle item use
  const handleUseItem = useCallback(async (itemId: string, targetId?: string) => {
    if (!combatState || !combatState.isPlayerTurn || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const item = inventoryService.findItemInInventory(itemId);
      if (!item) return;

      const success = combatService.useItem('player', item, targetId);
      
      if (success) {
        // Update combat state
        setCombatState({ ...combatService.getCurrentCombat()! });
        
        // Check if combat ended
        if (!combatService.getCurrentCombat()?.isActive) {
          setShowResults(true);
          return;
        }
        
        // End turn
        combatService.endTurn();
        setCombatState({ ...combatService.getCurrentCombat()! });
      }
    } catch (error) {
      console.error('Error using item:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [combatState, isProcessing]);

  // Handle defend action
  const handleDefend = useCallback(async () => {
    if (!combatState || !combatState.isPlayerTurn || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Defend action (reduce incoming damage by half for this turn)
      // This would require implementing status effects
      combatService.endTurn();
      setCombatState({ ...combatService.getCurrentCombat()! });
    } catch (error) {
      console.error('Error defending:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [combatState, isProcessing]);

  // Handle run action
  const handleRun = useCallback(async () => {
    if (!combatState || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Run away (end combat with defeat)
      combatService.endCombat();
      navigate('/game');
    } catch (error) {
      console.error('Error running away:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [combatState, isProcessing, navigate]);

  // Handle combat end
  const handleCombatEnd = useCallback(() => {
    if (combatState?.rewards) {
      // Award experience and items
      console.log('Combat rewards:', combatState.rewards);
      
      // Add combat experience to character
      try {
        const characterData = localStorage.getItem('currentCharacter');
        if (characterData) {
          const character = JSON.parse(characterData) as Character;
          const combatLevelResult = combatLevelService.addCombatExperience(character, 1);
          
          // Save updated character
          localStorage.setItem('currentCharacter', JSON.stringify(character));
          
          if (combatLevelResult.leveledUp) {
            console.log(`Combat Level Up! Level ${combatLevelResult.previousCombatLevel} → ${combatLevelResult.newCombatLevel}`);
          }
        }
      } catch (error) {
        console.error('Error updating combat experience:', error);
      }
    }
    
    combatService.endCombat();
    navigate('/game');
  }, [combatState, navigate]);

  // Get player combatant
  const playerCombatant = combatState ? combatService.getAlivePlayer() || null : null;
  const aliveEnemies = combatState ? combatService.getAliveEnemies() : [];

  // Show loading only if we're not showing confirmation modal
  if (!combatState && !showCombatConfirmation) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="glass-effect p-8 rounded-2xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Đang khởi tạo combat...</p>
        </div>
      </div>
    );
  }

  if (showResults && combatState) {
    return (
      <CombatResults
        combatState={combatState}
        onContinue={handleCombatEnd}
        onViewLoot={() => setShowInventory(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/game')}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Thoát Combat</span>
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Turn {combatState?.currentTurn || 0}
            </div>
            
            {/* Combat Log Button */}
            <button
              onClick={() => {
                if (isCombatLogPinned) {
                  setIsCombatLogPinned(false);
                  setShowCombatLog(false);
                } else {
                  setShowCombatLog(true);
                }
              }}
              className={`p-2 border rounded-lg transition-colors duration-200 ${
                isCombatLogPinned 
                  ? 'bg-blue-600/30 border-blue-500/50 text-blue-200' 
                  : 'bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30'
              }`}
              title={isCombatLogPinned ? "Bỏ ghim combat log" : "Combat Log"}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className={`flex flex-col h-[calc(100vh-80px)] transition-all duration-300 ${
        isCombatLogPinned ? 'mr-96' : ''
      }`}>
        {/* Enemy Cards */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aliveEnemies.map((enemy) => (
              <CombatantCard
                key={enemy.id}
                combatant={enemy}
                isEnemy={true}
                isSelected={selectedTarget === enemy.id}
                onSelect={() => setSelectedTarget(enemy.id)}
                isPlayerTurn={combatState?.isPlayerTurn || false}
              />
            ))}
          </div>
        </div>

        {/* Player Card and Actions */}
        <div className="bg-gray-900/50 border-t border-gray-700 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Player Card */}
            <div className="lg:col-span-1">
              {playerCombatant && (
                <CombatantCard
                  combatant={playerCombatant}
                  isEnemy={false}
                  isPlayerTurn={combatState?.isPlayerTurn || false}
                />
              )}
            </div>

            {/* Action Menu and Inventory */}
            <div className="lg:col-span-2">
              {combatState?.isPlayerTurn ? (
                <div className="space-y-4">
                  <ActionMenu
                    combatant={playerCombatant}
                    enemies={aliveEnemies}
                    onAttack={handleAttack}
                    onDefend={handleDefend}
                    onUseItem={handleUseItem}
                    onRun={handleRun}
                    isProcessing={isProcessing}
                    selectedTarget={selectedTarget}
                    onSelectTarget={setSelectedTarget}
                  />
                  
                  <button
                    onClick={() => setShowInventory(!showInventory)}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Túi Đồ ({inventoryService.getInventory().length})</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-pulse">
                    <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                    <p className="text-gray-400">Đang chờ lượt của kẻ thù...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Modal */}
      <AnimatePresence>
        {showInventory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowInventory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <CombatInventory
                inventory={inventoryService.getInventory()}
                onUseItem={handleUseItem}
                onClose={() => setShowInventory(false)}
                onSelectTarget={setSelectedTarget}
                enemies={aliveEnemies}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combat Log Menu */}
      <AnimatePresence>
        {showCombatLog && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`fixed top-20 right-4 w-96 h-[calc(100vh-120px)] bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl z-40 ${
              isCombatLogPinned ? 'fixed' : 'absolute'
            }`}
          >
            {/* Combat Log Header */}
            <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Combat Log</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsCombatLogPinned(!isCombatLogPinned)}
                    className={`p-1 rounded transition-colors ${
                      isCombatLogPinned 
                        ? 'bg-blue-600/30 text-blue-400' 
                        : 'text-gray-400 hover:text-blue-400'
                    }`}
                    title={isCombatLogPinned ? "Bỏ ghim" : "Ghim menu"}
                  >
                    {isCombatLogPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setShowCombatLog(false)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title="Đóng"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Combat Log Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <CombatLog
                log={combatService.getCombatLog()}
                isPlayerTurn={combatState?.isPlayerTurn || false}
                isInMenu={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combat Confirmation Modal */}
      {selectedNPCForCombat && (
        <CombatConfirmationModal
          isOpen={showCombatConfirmation}
          onClose={handleCloseCombatConfirmation}
          onStartCombat={handleStartCombat}
          npc={selectedNPCForCombat}
          isPreparing={isPreparingCombat}
          preparationStatus={combatPreparationStatus || {
            hasCombatStats: false,
            hasWeapon: false,
            hasValidLevel: false,
            isGenerating: false,
            errors: []
          }}
        />
      )}
    </div>
  );
}
