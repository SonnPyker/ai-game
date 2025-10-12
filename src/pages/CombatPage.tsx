import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ArrowRight,
  Play,
  Pause,
  MessageSquare,
  Pin,
  PinOff
} from 'lucide-react';
import { Character, Enemy, InventoryItem } from '../types';
import { combatService, CombatState, Combatant } from '../services/combatService';
import { combatDataService } from '../services/combatDataService';
import { inventoryService } from '../services/inventoryService';
import { combatLevelService } from '../services/combatLevelService';
import { levelSystemService } from '../services/levelSystemService';
import { questCombatService } from '../services/questCombatService';
import { MotionWrapper } from '../components/MotionWrapper';

// Combat Components
import { CombatantCard } from '../components/CombatPage/CombatantCard';
import { CombatLog } from '../components/CombatPage/CombatLog';
import { ActionMenu } from '../components/CombatPage/ActionMenu';
import { CombatInventory } from '../components/CombatPage/CombatInventory';
import { CombatResults } from '../components/CombatPage/CombatResults';
import { TurnIndicator } from '../components/CombatPage/TurnIndicator';
import { CombatConfirmationModal } from '../components/CombatPage/CombatConfirmationModal';
import { CombatDialogueSequence } from '../components/CombatPage/CombatDialogueBubble';

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
  const processingRef = useRef(false);
  const lastActionTimeRef = useRef(0);
  const currentActionIdRef = useRef<string | null>(null);
  const [showCombatLog, setShowCombatLog] = useState(false);
  const [isCombatLogPinned, setIsCombatLogPinned] = useState(false);
  
  // Combat confirmation modal states
  const [showCombatConfirmation, setShowCombatConfirmation] = useState(false);
  const [selectedNPCForCombat, setSelectedNPCForCombat] = useState<any>(null);
  const [combatPreparationStatus, setCombatPreparationStatus] = useState<any>(null);
  const [isPreparingCombat, setIsPreparingCombat] = useState(false);
  const isInitializedRef = useRef(false);
  
  // Combat dialogue bubble states
  const [currentDialogueSequence, setCurrentDialogueSequence] = useState<any>(null);
  const [showDialogueBubble, setShowDialogueBubble] = useState(false);

  // Show dialogue bubble for combat action (currently unused)
  // const showCombatDialogue = (combatantName: string, combatantType: 'player' | 'enemy' | 'npc', message: string, messageType: 'description' | 'attack_roll' | 'damage_roll' | 'status' | 'death' = 'description') => {
  //   const dialogue = combatDialogueService.createQuickDialogue(combatantName, combatantType, message, messageType);
  //   setCurrentDialogueSequence(dialogue);
  //   setShowDialogueBubble(true);
  // };

  // Handle dialogue sequence completion
  const handleDialogueComplete = () => {
    setShowDialogueBubble(false);
    setCurrentDialogueSequence(null);
  };

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

        // Check for pending combat from localStorage (NPC challenge)
        const pendingCombatData = localStorage.getItem('pending_combat');
        if (pendingCombatData) {
          try {
            const combatData = JSON.parse(pendingCombatData);
            localStorage.removeItem('pending_combat'); // Clear after reading
            
            if ((combatData.type === 'npc_challenge' || combatData.type === 'random_encounter') && combatData.enemies) {
              // Load character data
              const characterData = localStorage.getItem('currentCharacter');
              if (!characterData) {
                throw new Error('No character data found');
              }
              
              const player = JSON.parse(characterData) as Character;
              
              // Get world difficulty for combat
              const worldData = localStorage.getItem('world_gen_result');
              const worldDifficulty = worldData ? JSON.parse(worldData).difficulty || 'medium' : 'medium';
              
              // Start combat (NPC challenge or random encounter)
              const newCombatState = combatService.initiateCombat(player, combatData.enemies, worldDifficulty);
              setCombatState(newCombatState);
              
              // Check if enemy goes first and process their turn
              if (!newCombatState.isPlayerTurn) {
                await combatService.processEnemyTurn();
                setCombatState({ ...combatService.getCurrentCombat()! });
              }
              
              return;
            }
          } catch (error) {
            console.error('Error loading pending combat:', error);
            localStorage.removeItem('pending_combat'); // Clear invalid data
          }
        }

        // Get combat data from navigation state
        const combatData = location.state as { 
          player: Character; 
          enemies: Enemy[]; 
          context?: string;
        };

        if (combatData?.player && combatData?.enemies) {
          // Get world difficulty from localStorage
          const worldData = localStorage.getItem('world_gen_result');
          const worldDifficulty = worldData ? JSON.parse(worldData).difficulty : undefined;
          
          // Start combat with provided data
          const newCombatState = combatService.initiateCombat(combatData.player, combatData.enemies, worldDifficulty);
          setCombatState(newCombatState);
          
          // Check if enemy goes first and process their turn
          if (!newCombatState.isPlayerTurn) {
            await combatService.processEnemyTurn();
            setCombatState({ ...combatService.getCurrentCombat()! });
          }
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

  // Listen to combat state changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentCombat = combatService.getCurrentCombat();
      if (currentCombat && (!combatState || currentCombat !== combatState)) {
        setCombatState({ ...currentCombat });
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [combatState]);

  // Check for combat end and show results
  useEffect(() => {
    if (combatState && !combatState.isActive) {
      setShowResults(true);
    }
  }, [combatState?.isActive]);

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
      // Get world difficulty for test combat too
      const worldData = localStorage.getItem('world_gen_result');
      const worldDifficulty = worldData ? JSON.parse(worldData).difficulty : undefined;
      
      const newCombatState = combatService.initiateCombat(characterData, [enemy], worldDifficulty);
      setCombatState(newCombatState);
      
      // Check if enemy goes first and process their turn
      if (!newCombatState.isPlayerTurn) {
        await combatService.processEnemyTurn();
        setCombatState({ ...combatService.getCurrentCombat()! });
      }
      
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

      // Get world difficulty for test combat
      const worldData = localStorage.getItem('world_gen_result');
      const worldDifficulty = worldData ? JSON.parse(worldData).difficulty : undefined;
      
      const newCombatState = combatService.initiateCombat(player, testEnemies, worldDifficulty);
      setCombatState(newCombatState);
      
      // Check if enemy goes first and process their turn
      if (!newCombatState.isPlayerTurn) {
        await combatService.processEnemyTurn();
        setCombatState({ ...combatService.getCurrentCombat()! });
      }
    } catch (error) {
      console.error('Error creating test combat:', error);
    }
  };

  // Handle attack action (now with manual turn control)
  const handleAttack = useCallback(async (attackIndex: number, targetId?: string) => {
    // Early return checks
    if (!combatState || !combatState.isPlayerTurn || isProcessing || processingRef.current) return;

    // Check if player has already performed an action this turn
    const turnState = combatService.getTurnState();
    if (turnState?.hasPerformedAction) {
      console.log('Player has already performed an action this turn');
      return;
    }

    // Debounce: prevent multiple clicks within 1000ms using ref
    const now = Date.now();
    if (now - lastActionTimeRef.current < 1000) return;
    
    // Generate unique action ID to prevent duplicate processing
    const actionId = `${attackIndex}-${targetId || 'default'}-${now}`;
    if (currentActionIdRef.current === actionId) return;
    
    // Set processing state immediately to prevent race conditions
    processingRef.current = true;
    setIsProcessing(true);
    lastActionTimeRef.current = now;
    currentActionIdRef.current = actionId;
    
    try {
      const currentCombatant = combatService.getCurrentCombatant();
      if (!currentCombatant) {
        processingRef.current = false;
        setIsProcessing(false);
        return;
      }

      // If no target specified, use first alive enemy
      const target = targetId ? 
        combatService.getCombatant(targetId) : 
        combatService.getAliveEnemies()[0];

      if (!target) {
        processingRef.current = false;
        setIsProcessing(false);
        return;
      }

      // Perform attack with visual effects
      await combatService.performAttack(currentCombatant.id, target.id, attackIndex);
      
      // Update combat state regardless of success (for miss logs)
      setCombatState({ ...combatService.getCurrentCombat()! });
      
      // Check if combat ended
      if (!combatService.getCurrentCombat()?.isActive) {
        setShowResults(true);
        return;
      }
      
      // DO NOT auto end turn - player must manually end turn
      // Just update the state to show that action was performed
      setCombatState({ ...combatService.getCurrentCombat()! });
      
    } catch (error) {
      console.error('Error performing attack:', error);
    } finally {
      // Add a small delay to ensure state is properly reset
      setTimeout(() => {
        processingRef.current = false;
        setIsProcessing(false);
        currentActionIdRef.current = null;
      }, 100);
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

  // Handle defend action (now with manual turn control)
  const handleDefend = useCallback(async () => {
    if (!combatState || !combatState.isPlayerTurn || isProcessing) return;

    // Check if player has already performed an action this turn
    const turnState = combatService.getTurnState();
    if (turnState?.hasPerformedAction) {
      console.log('Player has already performed an action this turn');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Defend action (reduce incoming damage by half for this turn)
      combatService.defend('player');
      
      // Update combat state
      setCombatState({ ...combatService.getCurrentCombat()! });
      
      // Check if combat ended
      if (!combatService.getCurrentCombat()?.isActive) {
        setShowResults(true);
        return;
      }
      
      // DO NOT auto end turn - player must manually end turn
      // Just update the state to show that action was performed
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
      // Set combat winner as fled
      combatService.setPlayerFled();
      
      // Update character data with current inventory before fleeing
      try {
        const characterData = localStorage.getItem('currentCharacter');
        if (characterData) {
          const character = JSON.parse(characterData);
          
          // Load current inventory into inventoryService
          inventoryService.setCharacter(character);
          
          // Update character data with current inventory
          character.inventory = inventoryService.getInventory();
          character.equipment = inventoryService.getEquipment();
          character.equipped_stats_bonuses = inventoryService.getEquippedStatsBonuses();
          localStorage.setItem('currentCharacter', JSON.stringify(character));
          
          console.log('✅ Updated character inventory before fleeing');
        }
      } catch (error) {
        console.error('Error updating character inventory before fleeing:', error);
      }
      
      // Generate combat result data for fleeing
      const combatResultData = combatService.generateCombatResultData();
      
      if (combatResultData) {
        // Save combat result data
        combatDataService.addToCombatHistory(combatResultData);
        localStorage.setItem('combat_result', JSON.stringify(combatResultData));
        
        console.log('🏃 Player fled from combat - combat history saved');
      }
      
      // Run away (end combat)
      combatService.endCombat();
      navigate('/game');
    } catch (error) {
      console.error('Error running away:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [combatState, isProcessing, navigate]);

  // Handle manual end turn
  const handleEndTurn = useCallback(async () => {
    if (!combatState || !combatState.isPlayerTurn || isProcessing) return;

    // Check if player can end turn
    if (!combatService.canEndTurn()) {
      console.log('Player cannot end turn yet');
      return;
    }

    setIsProcessing(true);
    
    try {
      // End turn manually
      combatService.endTurn();
      setCombatState({ ...combatService.getCurrentCombat()! });
      
      // Process enemy turn if it's not player's turn
      if (!combatService.getCurrentCombat()?.isPlayerTurn) {
        await combatService.processEnemyTurn();
        setCombatState({ ...combatService.getCurrentCombat()! });
      }
    } catch (error) {
      console.error('Error ending turn:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [combatState, isProcessing]);

  // Handle combat end with selected items
  const handleCombatEndWithItems = useCallback((selectedItems: InventoryItem[]) => {
    if (combatState?.rewards) {
      // Generate combat result data
      const combatResultData = combatService.generateCombatResultData();
      
      if (combatResultData) {
        // Update rewards with selected items
        combatResultData.rewards.items = selectedItems;
        
        // Update quest combat objectives if player won
        if (combatResultData.victory && combatResultData.enemiesDefeated.length > 0) {
          combatResultData.enemiesDefeated.forEach(enemy => {
            const questUpdated = questCombatService.updateCombatObjectiveProgress(enemy.name);
            if (questUpdated) {
              console.log(`🎯 Quest progress updated for defeating: ${enemy.name}`);
            }
          });
        }
        
        // Save to localStorage
        localStorage.setItem('combat_result', JSON.stringify(combatResultData));
      }
      
      // Add combat experience to character
      try {
        const characterData = localStorage.getItem('currentCharacter');
        if (characterData) {
          const character = JSON.parse(characterData) as Character;
          
          // Get actual experience from combat rewards
          const experienceGained = combatState?.rewards?.experience || 0;
          
          if (experienceGained > 0) {
            // Add 1 XP to combat level (for participating in combat)
            const combatLevelResult = combatLevelService.addCombatExperience(character, 1);
            
            // Add full experience to regular character level
            const regularLevelResult = levelSystemService.addExperience(character, experienceGained);
            
            // Save updated character
            localStorage.setItem('currentCharacter', JSON.stringify(character));
            
            console.log(`💚 Experience gained: ${experienceGained} XP`);
            console.log(`⚔️ Combat Level: ${combatLevelResult.previousCombatLevel} → ${combatLevelResult.newCombatLevel}`);
            console.log(`⭐ Character Level: ${regularLevelResult.previousLevel} → ${regularLevelResult.newLevel}`);
            
            if (combatLevelResult.leveledUp) {
              console.log(`🎉 Combat Level Up! ${combatLevelResult.previousCombatLevel} → ${combatLevelResult.newCombatLevel}`);
            }
            
            if (regularLevelResult.leveledUp) {
              console.log(`🎉 Character Level Up! ${regularLevelResult.previousLevel} → ${regularLevelResult.newLevel}`);
            }
          }
        }
      } catch (error) {
        console.error('Error updating combat experience:', error);
      }

      // Add selected items to inventory
      try {
        // First, load current character data into inventoryService to avoid reset
        const characterData = localStorage.getItem('currentCharacter');
        if (characterData) {
          const character = JSON.parse(characterData);
          
          // Set character in inventoryService to load existing inventory
          inventoryService.setCharacter(character);
        }
        
        // Then add new items
        selectedItems.forEach(item => {
          inventoryService.addItem(item);
        });
        
        // Update character data with new inventory
        if (characterData) {
          const character = JSON.parse(characterData);
          character.inventory = inventoryService.getInventory();
          character.equipment = inventoryService.getEquipment();
          character.equipped_stats_bonuses = inventoryService.getEquippedStatsBonuses();
          localStorage.setItem('currentCharacter', JSON.stringify(character));
          console.log('✅ Updated character inventory after combat rewards');
        }
      } catch (error) {
        console.error('Error adding items to inventory:', error);
      }
    }
    
    // Clear pending combat data
    localStorage.removeItem('pending_combat');
    
    combatService.endCombat();
    navigate('/game');
  }, [combatState, navigate]);

  // Get player combatants
  const playerCombatants = combatState ? combatService.getAlivePlayers() : [];
  const aliveEnemies = combatState ? combatService.getAliveEnemies() : [];
  
  // Get turn state for UI
  const turnState = combatService.getTurnState();
  const canEndTurn = combatService.canEndTurn();
  const hasPerformedAction = turnState?.hasPerformedAction || false;


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
        onContinue={handleCombatEndWithItems}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header with Turn Indicator */}
      <div className="bg-gray-900/50 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          {/* Turn Indicator */}
          <TurnIndicator
            turnNumber={combatState?.currentTurn || 0}
            isPlayerTurn={combatState?.isPlayerTurn || false}
            currentCombatantName={combatState?.isPlayerTurn ? 'Player' : aliveEnemies[0]?.name}
            isProcessing={isProcessing}
          />
          
          {/* Control Buttons */}
          <div className="flex items-center space-x-2">
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
            
            {/* Pause/Play Button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title={isPaused ? "Tiếp tục" : "Tạm dừng"}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className={`flex flex-col h-[calc(100vh-80px)] transition-all duration-300 ${
        isCombatLogPinned ? 'lg:mr-96' : ''
      }`}>
        {/* Enemy Cards - Compact Layout */}
        <div className="flex-1 p-2 sm:p-4">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            {aliveEnemies.map((enemy) => (
              <div key={enemy.id} className="w-full sm:w-auto sm:min-w-[300px] sm:max-w-[400px]">
                <CombatantCard
                  combatant={enemy}
                  isEnemy={true}
                  isSelected={selectedTarget === enemy.id}
                  onSelect={() => setSelectedTarget(enemy.id)}
                  isPlayerTurn={combatState?.isPlayerTurn || false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Player Card and Actions */}
        <div className="bg-gray-900/50 border-t border-gray-700 p-2 sm:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4">
            {/* Player Cards - Support Multiple Players */}
            <div className="lg:col-span-1">
              <div className="space-y-2 sm:space-y-3">
                {playerCombatants.map((player: Combatant) => (
                  <CombatantCard
                    key={player.id}
                    combatant={player}
                    isEnemy={false}
                    isPlayerTurn={combatState?.isPlayerTurn || false}
                  />
                ))}
              </div>
            </div>

            {/* Action Menu and Inventory */}
            <div className="lg:col-span-2">
              {combatState?.isPlayerTurn ? (
                <div className="space-y-4">
                  <ActionMenu
                    combatant={playerCombatants[0] || null}
                    enemies={aliveEnemies}
                    onAttack={handleAttack}
                    onDefend={handleDefend}
                    onUseItem={handleUseItem}
                    onInventory={() => setShowInventory(!showInventory)}
                    onEndTurn={handleEndTurn}
                    onRun={handleRun}
                    isProcessing={isProcessing}
                    selectedTarget={selectedTarget}
                    onSelectTarget={setSelectedTarget}
                    hasPerformedAction={hasPerformedAction}
                    canEndTurn={canEndTurn}
                  />
                  
                  <button
                    onClick={handleEndTurn}
                    disabled={!canEndTurn || isProcessing}
                    className={`
                      w-full py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 font-medium text-lg
                      ${canEndTurn && !isProcessing
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 ring-2 ring-green-400 ring-opacity-50'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                      }
                    `}
                  >
                    <ArrowRight className="w-5 h-5" />
                    <span>
                      {hasPerformedAction ? 'Kết Thúc Lượt' : 'Chờ Hành Động...'}
                    </span>
                    {hasPerformedAction && (
                      <div className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    )}
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
          <MotionWrapper
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowInventory(false)}
          >
            <MotionWrapper
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <CombatInventory
                inventory={inventoryService.getInventory()}
                onUseItem={handleUseItem}
                onClose={() => setShowInventory(false)}
                onSelectTarget={setSelectedTarget}
                enemies={aliveEnemies}
              />
            </MotionWrapper>
          </MotionWrapper>
        )}
      </AnimatePresence>

      {/* Combat Log Menu */}
      <AnimatePresence>
        {showCombatLog && (
          <MotionWrapper
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`fixed top-20 right-4 w-96 h-[calc(100vh-120px)] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-40 flex flex-col ${
              isCombatLogPinned ? 'fixed' : 'absolute'
            }`}
          >
            {/* Combat Log Header */}
            <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700 rounded-t-lg flex-shrink-0">
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
            <div className="flex-1 overflow-hidden min-h-0">
              <CombatLog
                log={combatService.getCombatLog()}
                turnLogs={combatService.getTurnLogs()}
                isPlayerTurn={combatState?.isPlayerTurn || false}
                isInMenu={true}
              />
            </div>
          </MotionWrapper>
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

      {/* Combat Dialogue Bubbles */}
      {showDialogueBubble && currentDialogueSequence && (
        <CombatDialogueSequence
          combatantName={currentDialogueSequence.combatantName}
          combatantType={currentDialogueSequence.combatantType}
          sequence={currentDialogueSequence.sequence}
          onComplete={handleDialogueComplete}
        />
      )}
    </div>
  );
}
