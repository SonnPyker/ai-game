import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Play,
  Pause,
  MessageSquare,
  Pin,
  Plus,
  TestTube,
  AlertTriangle,
  X,
  Sword
} from 'lucide-react';
import { Character, Enemy, InventoryItem } from '../types';
import { translateEffectFormat } from '../utils/skillEffectTranslator';
import { combatService, CombatState, Combatant } from '../services/combatService';
import { combatDataService } from '../services/combatDataService';
import { inventoryService } from '../services/inventoryService';
import { levelSystemService } from '../services/levelSystemService';
import { questCombatService } from '../services/questCombatService';
import { enemyGenerationService } from '../services/enemyGenerationService';
import { effectProcessingService } from '../services/effectProcessingService';
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
import { HelpButton } from '../components/HelpChat/HelpButton';

interface CombatPageProps {}

export function CombatPage({}: CombatPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Combat Log visibility states
  const [showCombatLog, setShowCombatLog] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const processingRef = useRef(false);
  const lastActionTimeRef = useRef(0);
  const currentActionIdRef = useRef<string | null>(null);
  // Combat log is always visible and pinned
  
  // Screen size detection and combat log management
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024); // Tailwind's 'lg' breakpoint
    };

    checkScreenSize(); // Check initially
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Always show combat log on large screens
  useEffect(() => {
    if (isLargeScreen) {
      setShowCombatLog(true);
    }
  }, [isLargeScreen]);

  // Toggle combat log function for mobile
  const toggleCombatLog = useCallback(() => {
    if (!isLargeScreen) {
      setShowCombatLog(prev => !prev);
    }
  }, [isLargeScreen]);

  // Toggle action menu function for mobile
  const toggleActionMenu = useCallback(() => {
    if (!isLargeScreen) {
      setShowActionMenu(prev => !prev);
    }
  }, [isLargeScreen]);
  
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
        
        // Check for saved combat state first
        const savedCombatState = localStorage.getItem('current_combat_state');
        if (savedCombatState) {
          try {
            const combatData = JSON.parse(savedCombatState);
            combatService.restoreCombatState(combatData);
            setCombatState({ ...combatService.getCurrentCombat()! });
            console.log('✅ Restored combat state from localStorage');
            return;
          } catch (error) {
            console.error('Error restoring combat state:', error);
            localStorage.removeItem('current_combat_state');
          }
        }
        
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
              
              // Start combat (NPC challenge or scene-based encounter)
              const newCombatState = await combatService.initiateCombat(player, combatData.enemies, worldDifficulty);
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
          
          // Ensure player data is up-to-date with latest AC calculation
          let player = combatData.player;
          const inventoryService = (await import('../services/inventoryService')).inventoryService;
          inventoryService.setCharacter(player);
          
          // Get the updated character with recalculated AC
          const updatedCharacter = inventoryService.getCharacter();
          if (updatedCharacter) {
            player = updatedCharacter;
            // Save updated character data back to localStorage
            localStorage.setItem('currentCharacter', JSON.stringify(player));
          }
          
          // Start combat with updated player data
          const newCombatState = await combatService.initiateCombat(player, combatData.enemies, worldDifficulty);
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
      if (currentCombat) {
        // Always update if combat state changed or if it's the first time
        // Check for important state changes like isActive, currentTurn, etc.
        const shouldUpdate = !combatState || 
          currentCombat.isActive !== combatState.isActive ||
          currentCombat.currentTurn !== combatState.currentTurn ||
          currentCombat.currentCombatantIndex !== combatState.currentCombatantIndex ||
          currentCombat.turnOrder?.length !== combatState.turnOrder?.length ||
          currentCombat.combatants?.length !== combatState.combatants?.length;
        
        if (shouldUpdate) {
          setCombatState({ ...currentCombat });
          // Auto-save combat state
          combatService.saveCombatState();
        }
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [combatState]);

  // Check for combat end and show results
  useEffect(() => {
    if (combatState && !combatState.isActive) {
      console.log('🎯 Combat ended, showing results. Winner:', combatState.winner);
      setShowResults(true);
    }
  }, [combatState?.isActive]);

  // Fallback: Check for combat end every second as backup
  useEffect(() => {
    const fallbackInterval = setInterval(() => {
      const currentCombat = combatService.getCurrentCombat();
      if (currentCombat && !currentCombat.isActive && !showResults) {
        console.log('🔄 Fallback: Combat ended, showing results. Winner:', currentCombat.winner);
        setCombatState({ ...currentCombat });
        setShowResults(true);
      }
    }, 1000); // Check every second

    return () => clearInterval(fallbackInterval);
  }, [showResults]);

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
      let characterData = JSON.parse(localStorage.getItem('currentCharacter') || 'null');
      if (!characterData) {
        throw new Error('Không tìm thấy dữ liệu nhân vật');
      }

      // Ensure character data is up-to-date with latest AC calculation
      // This is important because AC might have changed due to equipment changes
      const inventoryService = (await import('../services/inventoryService')).inventoryService;
      inventoryService.setCharacter(characterData);
      
      // Get the updated character with recalculated AC
      const updatedCharacter = inventoryService.getCharacter();
      if (updatedCharacter) {
        characterData = updatedCharacter;
        // Save updated character data back to localStorage
        localStorage.setItem('currentCharacter', JSON.stringify(characterData));
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
      
      const newCombatState = await combatService.initiateCombat(characterData, [enemy], worldDifficulty);
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

      let player: Character = JSON.parse(characterData);
      
      // Ensure character data is up-to-date with latest AC calculation
      const inventoryService = (await import('../services/inventoryService')).inventoryService;
      inventoryService.setCharacter(player);
      
      // Get the updated character with recalculated AC
      const updatedCharacter = inventoryService.getCharacter();
      if (updatedCharacter) {
        player = updatedCharacter;
        // Save updated character data back to localStorage
        localStorage.setItem('currentCharacter', JSON.stringify(player));
      }
      
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
          health: { current: 25, max: 25 },
          armorClass: 8,
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
      
      const newCombatState = await combatService.initiateCombat(player, testEnemies, worldDifficulty);
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

    console.log('handleUseItem called with itemId:', itemId, 'targetId:', targetId);
    setIsProcessing(true);
    
    try {
      // Try to find item in combat inventory first, then fallback to regular inventory
      let item = combatState.playerInventory?.find(i => i.id === itemId);
      if (!item) {
        const foundItem = inventoryService.findItemInInventory(itemId);
        if (foundItem) {
          item = foundItem;
        }
      }
      
      if (!item) {
        console.log('Item not found:', itemId);
        return;
      }

      console.log('Using item:', item);
      const success = combatService.useItem('player', item, targetId);
      
      if (success) {
        // Only sync consumable items since combat inventory only contains consumables
        if (item.type === 'consumable' && item.quantity !== undefined && item.quantity > 0) {
          item.quantity -= 1;
          
          // CRITICAL: Sync with inventoryService to ensure main inventory is updated
          console.log('🔄 Syncing consumable usage with main inventory:', {
            itemId: item.id,
            itemName: item.name,
            itemType: item.type,
            newQuantity: item.quantity
          });
          
          // Update through inventoryService to ensure consistency
          if (item.quantity <= 0) {
            // Remove item completely if quantity reaches 0
            inventoryService.removeItem(item.id, 1);
            console.log('🗑️ Removed consumable from main inventory:', item.name);
          } else {
            // Update quantity in main inventory
            const mainInventoryItem = inventoryService.findItemInInventory(item.id);
            if (mainInventoryItem && mainInventoryItem.type === 'consumable') {
              mainInventoryItem.quantity = item.quantity;
              // Force save by updating character data
              const characterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
              const inventoryItem = characterData.inventory.find((invItem: any) => invItem.id === item.id);
              if (inventoryItem) {
                inventoryItem.quantity = item.quantity;
                localStorage.setItem('currentCharacter', JSON.stringify(characterData));
              }
              console.log('📝 Updated consumable quantity in main inventory:', item.name, 'new quantity:', item.quantity);
            }
          }
          
          // Also update character inventory in localStorage for immediate UI update
          const characterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
          const inventoryItem = characterData.inventory.find((invItem: any) => invItem.id === item.id);
          if (inventoryItem) {
            inventoryItem.quantity = item.quantity;
            localStorage.setItem('currentCharacter', JSON.stringify(characterData));
          }
        }
        
        // Update combat state
        setCombatState({ ...combatService.getCurrentCombat()! });
        
        // Check if combat ended
        if (!combatService.getCurrentCombat()?.isActive) {
          setShowResults(true);
          return;
        }
        
        // Don't end turn automatically - consumable is extra action
        // Player can continue with main action or end turn manually
      }
    } catch (error) {
      console.error('Error using item:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [combatState, isProcessing]);

  // Handle skill use
  const handleUseSkill = useCallback(async (skillId: string, targetIds?: string[]) => {
    if (!combatState || !combatState.isPlayerTurn || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const success = combatService.useSkill('player', skillId, targetIds);
      
      if (success) {
        // Update combat state
        setCombatState({ ...combatService.getCurrentCombat()! });
        
        // Check if combat ended
        if (!combatService.getCurrentCombat()?.isActive) {
          setShowResults(true);
          return;
        }
        
        // Don't end turn automatically - skill is skill action
        // Player can continue with main action or end turn manually
      }
    } catch (error) {
      console.error('Error using skill:', error);
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
      
      // Update character data with current HP and inventory before fleeing
      try {
        const characterData = localStorage.getItem('currentCharacter');
        if (characterData) {
          const character = JSON.parse(characterData);
          
          // Get current player combatant to update HP
          const playerCombatant = combatService.getAlivePlayer();
          if (playerCombatant) {
            // Update character HP with current combat HP
            character.health = {
              current: playerCombatant.health.current,
              max: playerCombatant.health.max
            };
            console.log('Updated character HP from combat:', playerCombatant.health, 'to character:', character.health);
          }
          
          // Load current inventory into inventoryService
          inventoryService.setCharacter(character);
          
          // Update character data with current inventory
          character.inventory = inventoryService.getInventory();
          character.equipment = inventoryService.getEquipment();
          character.equipped_stats_bonuses = inventoryService.getEquippedStatsBonuses();
          localStorage.setItem('currentCharacter', JSON.stringify(character));
          
          console.log('✅ Updated character data before fleeing');
        }
      } catch (error) {
        console.error('Error updating character data before fleeing:', error);
      }
      
      // Clear enemies from sceneState after fleeing from combat
      try {
        const currentSceneState = localStorage.getItem('rp_scene_state');
        if (currentSceneState) {
          const sceneState = JSON.parse(currentSceneState);
          const updatedSceneState = {
            ...sceneState,
            combatInitiation: undefined,
            dangers: {
              ...sceneState.dangers,
              monsters: [], // Clear all monsters after fleeing from combat
              enemies: []   // Clear all enemies after fleeing from combat
            }
          };
          localStorage.setItem('rp_scene_state', JSON.stringify(updatedSceneState));
          console.log('✅ Cleared enemies from sceneState after fleeing from combat');
        }
      } catch (error) {
        console.error('Error clearing enemies from sceneState after fleeing:', error);
      }
      
      // Generate combat result data for fleeing
      const combatResultData = combatService.generateCombatResultData();
      
      if (combatResultData) {
        // ADDED: Add turn number to metadata for encounter chance reset
        if (!combatResultData.metadata) {
          combatResultData.metadata = {};
        }
        const currentTurn = parseInt(localStorage.getItem('game_turn_counter') || '0');
        combatResultData.metadata.gameTurn = currentTurn;
        
        // Save combat result data
        combatDataService.addToCombatHistory(combatResultData);
        localStorage.setItem('combat_result', JSON.stringify(combatResultData));
        
        console.log('🏃 Player fled from combat - combat history saved with turn:', currentTurn);
      }
      
      // Run away (end combat)
      combatService.endCombat();
      localStorage.removeItem('current_combat_state'); // Clear saved combat state
      navigate('/game');
    } catch (error) {
      console.error('Error running away:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [combatState, isProcessing, navigate]);

  // Handle force reset combat state
  const handleForceReset = useCallback(async () => {
    if (isProcessing) return;

    const confirmed = window.confirm(
      '⚠️ FORCE RESET COMBAT STATE ⚠️\n\n' +
      'This will completely reset the current combat and return you to the game.\n' +
      'All combat progress will be lost.\n\n' +
      'Are you sure you want to continue?'
    );

    if (!confirmed) return;

    setIsProcessing(true);
    
    try {
      // Clear all combat state
      combatService.endCombat();
      localStorage.removeItem('current_combat_state');
      
      // Reset all combat-related state
      setCombatState(null);
      setSelectedTarget(null);
      setShowInventory(false);
      setShowSkills(false);
      setShowResults(false);
      setIsPaused(false);
      
      // Navigate back to game
      navigate('/game');
    } catch (error) {
      console.error('Error during force reset:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, navigate]);

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

  // Test function: Add enemy
  const handleAddTestEnemy = useCallback(async () => {
    if (!combatState || isProcessing) return;

    try {
      setIsProcessing(true);
      
      // Generate a test enemy
      const testEnemy = enemyGenerationService.generateRandomEnemy(
        combatState.currentTurn + 1
      );
      
      // Add enemy to combat
      combatService.addEnemyToCombat(testEnemy);
      
      // Update combat state
      setCombatState({ ...combatService.getCurrentCombat()! });
      
      console.log('✅ Added test enemy:', testEnemy.name);
    } catch (error) {
      console.error('Error adding test enemy:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [combatState, isProcessing]);

  // Test function: Add consumable to player
  const handleAddTestConsumable = useCallback(async () => {
    if (!combatState || isProcessing) return;

    try {
      setIsProcessing(true);
      
      // Get current character
      const characterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
      if (!characterData.inventory) {
        characterData.inventory = [];
      }
      
      // Generate test consumables
      const testConsumables = effectProcessingService.generateEnemyConsumables(
        combatState.currentTurn + 1,
        'medium'
      );
      
      console.log('Generated consumables:', testConsumables);
      
      // Add first consumable to player inventory
      if (testConsumables.length > 0) {
        const newItem = testConsumables[0];
        // Find existing item by name and effect (not by id)
        const existingItem = characterData.inventory.find((item: any) => 
          item.name === newItem.name && 
          item.effect === newItem.effect &&
          item.type === 'consumable'
        );
        
        if (existingItem) {
          existingItem.quantity += 1;
          console.log('Merged with existing item:', existingItem.name, 'New quantity:', existingItem.quantity);
        } else {
          characterData.inventory.push({
            ...newItem,
            quantity: 1
          });
          console.log('Added new item:', newItem.name);
        }
        
        // Save updated character
        localStorage.setItem('currentCharacter', JSON.stringify(characterData));
        console.log('Updated character inventory:', characterData.inventory);
        
        // Update player combatant inventory in combat state
        const currentCombat = combatService.getCurrentCombat();
        if (currentCombat) {
          const playerCombatant = currentCombat.combatants.find(c => c.id === 'player');
          if (playerCombatant) {
            playerCombatant.inventory = characterData.inventory;
            console.log('Updated player combatant inventory:', playerCombatant.inventory);
          }
          
          // Update playerInventory in combat state
          currentCombat.playerInventory = characterData.inventory;
          console.log('Updated combat state playerInventory:', currentCombat.playerInventory);
        }
        
        // Update combat state to reflect inventory changes
        setCombatState({ ...combatService.getCurrentCombat()! });
        
        console.log('✅ Added test consumable:', testConsumables[0].name);
      }
    } catch (error) {
      console.error('Error adding test consumable:', error);
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
        
        // Add turn number to metadata for encounter chance reset
        if (!combatResultData.metadata) {
          combatResultData.metadata = {};
        }
        const currentTurn = parseInt(localStorage.getItem('game_turn_counter') || '0');
        combatResultData.metadata.gameTurn = currentTurn;
        
        // Save to localStorage
        localStorage.setItem('combat_result', JSON.stringify(combatResultData));
        
        // Save to combat_history for encounter chance reset
        combatDataService.addToCombatHistory(combatResultData);
        console.log('📝 Updated combat_history with gameTurn:', currentTurn);
      }
      
      // Update character data with current HP and experience
      try {
        const characterData = localStorage.getItem('currentCharacter');
        if (characterData) {
          const character = JSON.parse(characterData) as Character;
          
          // Update character HP with current combat HP
          const playerCombatant = combatService.getAlivePlayer();
          if (playerCombatant) {
            character.health = {
              current: playerCombatant.health.current,
              max: playerCombatant.health.max
            };
            console.log('Updated character HP after combat:', character.health);
            
            // Update combat level data from combat service
            if (playerCombatant.characterData) {
              // Copy combat level data from the combatant (which was updated by combatService)
              character.combatLevel = playerCombatant.characterData.combatLevel;
              character.combatExperience = playerCombatant.characterData.combatExperience;
              
              console.log(`⚔️ Combat Level: ${character.combatLevel}, Combat XP: ${character.combatExperience}`);
            }
          }
          
          // Get actual experience from combat rewards
          const experienceGained = combatState?.rewards?.experience || 0;
          const currencyGained = combatState?.rewards?.currency || 0;
          
          if (experienceGained > 0) {
            // Add full experience to regular character level
            const regularLevelResult = levelSystemService.addExperience(character, experienceGained);
            
            console.log(`💚 Experience gained: ${experienceGained} XP`);
            console.log(`⭐ Character Level: ${regularLevelResult.previousLevel} → ${regularLevelResult.newLevel}`);
            
            if (regularLevelResult.leveledUp) {
              console.log(`🎉 Character Level Up! ${regularLevelResult.previousLevel} → ${regularLevelResult.newLevel}`);
            }
          }
          
          // Add currency reward
          if (currencyGained > 0) {
            const currentCurrency = character.currency || 0;
            character.currency = currentCurrency + currencyGained;
            console.log(`💰 Currency gained: ${currencyGained} gold (Total: ${character.currency})`);
          }
          
          // Save updated character
          localStorage.setItem('currentCharacter', JSON.stringify(character));
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
        
        // CRITICAL: Sync combat inventory changes with main inventory before adding rewards
        // Only sync consumable items since combat inventory only contains consumables
        console.log('🔄 Syncing combat consumable changes with main inventory...');
        const combatInventory = combatState?.playerInventory || [];
        const consumableItems = combatInventory.filter(item => item.type === 'consumable');
        
        consumableItems.forEach(combatItem => {
          const mainItem = inventoryService.findItemInInventory(combatItem.id);
          if (mainItem && mainItem.type === 'consumable') {
            // Update quantity to match combat state
            if (mainItem.quantity !== combatItem.quantity) {
              console.log('📝 Syncing consumable quantity:', {
                name: combatItem.name,
                combatQuantity: combatItem.quantity,
                mainQuantity: mainItem.quantity
              });
              mainItem.quantity = combatItem.quantity;
            }
          }
        });
        
        // Save inventory changes before adding rewards
        // Force save by updating character data
        const updatedCharacterData = JSON.parse(localStorage.getItem('currentCharacter') || '{}');
        updatedCharacterData.inventory = inventoryService.getInventory();
        localStorage.setItem('currentCharacter', JSON.stringify(updatedCharacterData));
        
        // Then add new items
        selectedItems.forEach(item => {
          inventoryService.addItem(item);
        });
        
        // Update character data with new inventory and current HP
        if (characterData) {
          const character = JSON.parse(characterData);
          
          // Update HP from combat state if not already updated
          const playerCombatant = combatService.getAlivePlayer();
          if (playerCombatant) {
            character.health = {
              current: playerCombatant.health.current,
              max: playerCombatant.health.max
            };
            console.log('Updated character HP after combat (inventory section):', character.health);
          }
          
          character.inventory = inventoryService.getInventory();
          character.equipment = inventoryService.getEquipment();
          character.equipped_stats_bonuses = inventoryService.getEquippedStatsBonuses();
          localStorage.setItem('currentCharacter', JSON.stringify(character));
          console.log('✅ Updated character inventory after combat rewards and sync');
        }
      } catch (error) {
        console.error('Error adding items to inventory:', error);
      }
    }
    
    // Clear enemies from sceneState after combat ends (victory or defeat)
    try {
      const currentSceneState = localStorage.getItem('rp_scene_state');
      if (currentSceneState) {
        const sceneState = JSON.parse(currentSceneState);
        const updatedSceneState = {
          ...sceneState,
          combatInitiation: undefined,
          dangers: {
            ...sceneState.dangers,
            monsters: [], // Clear all monsters after combat ends
            enemies: []   // Clear all enemies after combat ends
          }
        };
        localStorage.setItem('rp_scene_state', JSON.stringify(updatedSceneState));
        console.log('✅ Cleared enemies from sceneState after combat ended');
      }
    } catch (error) {
      console.error('Error clearing enemies from sceneState after combat ended:', error);
    }
    
    // Clear pending combat data
    localStorage.removeItem('pending_combat');
    localStorage.removeItem('current_combat_state'); // Clear saved combat state
    
    combatService.endCombat();
    navigate('/game');
  }, [combatState, navigate]);

  // Get player combatants
  const playerCombatants = combatState ? combatService.getAlivePlayers() : [];
  const aliveEnemies = combatState ? combatService.getAliveEnemies() : [];
  const allyCombatants = combatState ? combatState.combatants.filter(c => c.type === 'ally' && c.isAlive) : [];
  
  // Get next combatant name for turn indicator
  const nextCombatantName = useMemo(() => {
    if (!combatState || !combatState.turnOrder || combatState.turnOrder.length <= 1) {
      return undefined;
    }
    
    const nextIndex = (combatState.currentCombatantIndex + 1) % combatState.turnOrder.length;
    const nextCombatantId = combatState.turnOrder[nextIndex];
    
    if (nextCombatantId === 'player') {
      return 'Player';
    }
    
    const nextCombatant = combatState.combatants.find(c => c.id === nextCombatantId);
    return nextCombatant?.name || `Enemy ${nextCombatantId}`;
  }, [combatState]);

  // Get current combatant ID for turn indicator
  const currentCombatantId = useMemo(() => {
    if (!combatState || !combatState.turnOrder) return null;
    return combatState.turnOrder[combatState.currentCombatantIndex];
  }, [combatState]);
  
  // Get skills from combat state (already migrated)
  const playerSkills = playerCombatants[0]?.skills || [];
  
  // Get turn state for UI
  const turnState = combatService.getTurnState();
  const canEndTurn = combatService.canEndTurn();


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
      {/* Help Button */}
      <HelpButton variant="fixed" />
      {/* Header with Turn Indicator */}
      <div className="bg-gray-900/50 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          {/* Turn Indicator */}
          <TurnIndicator
            turnNumber={combatState?.currentTurn || 0}
            isPlayerTurn={combatState?.isPlayerTurn || false}
            currentCombatantName={combatState?.isPlayerTurn ? 'Player' : aliveEnemies[0]?.name}
            nextCombatantName={nextCombatantName}
            isProcessing={isProcessing}
            turnOrder={combatState?.turnOrder || []}
            currentCombatantIndex={combatState?.currentCombatantIndex || 0}
          />
          
          {/* Control Buttons */}
          <div className="flex items-center space-x-2">
            {/* Combat Log Button - Always Pinned */}
            <div
              className="p-2 border rounded-lg bg-blue-600/30 border-blue-500/50 text-blue-200"
              title="Combat Log (Luôn hiển thị)"
            >
              <MessageSquare className="w-4 h-4" />
            </div>
            
            {/* Pause/Play Button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title={isPaused ? "Tiếp tục" : "Tạm dừng"}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>

            {/* Test Buttons */}
            <div className="flex items-center space-x-1 border-l border-gray-600 pl-2">
              {/* Add Enemy Test Button */}
              <button
                onClick={handleAddTestEnemy}
                disabled={isProcessing}
                className="p-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                title="Thêm Enemy Test"
              >
                <Plus className="w-4 h-4" />
              </button>
              
              {/* Add Consumable Test Button */}
              <button
                onClick={handleAddTestConsumable}
                disabled={isProcessing}
                className="p-2 text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                title="Thêm Consumable Test"
              >
                <TestTube className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`flex flex-col min-h-[calc(100vh-80px)] transition-all duration-300 justify-between ${isLargeScreen && showCombatLog ? 'lg:mr-96' : ''}`}>
        {/* Enemy Cards - PC Optimized Layout */}
        <div className="p-2 sm:p-4 lg:max-h-[50vh] lg:overflow-y-auto">
          {/* Mobile: Horizontal scroll, Desktop: Flex wrap with height limit */}
          <div className="relative">
            {/* Scroll indicator for mobile */}
            {aliveEnemies.length > 1 && (
              <div className="sm:hidden absolute top-0 right-0 z-10 bg-gray-800/80 px-2 py-1 rounded-bl text-xs text-gray-400">
                ← Kéo để xem thêm →
              </div>
            )}
            <div className="flex overflow-x-auto gap-2 sm:gap-4 sm:flex-wrap sm:justify-center sm:overflow-x-visible scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {aliveEnemies.map((enemy) => (
                <div key={enemy.id} className="flex-shrink-0 w-[280px] sm:w-auto sm:min-w-[300px] sm:max-w-[400px]">
                  <CombatantCard
                    combatant={enemy}
                    isEnemy={true}
                    isSelected={selectedTarget === enemy.id}
                    onSelect={() => setSelectedTarget(enemy.id)}
                    isPlayerTurn={combatState?.isPlayerTurn || false}
                    isCurrentTurn={currentCombatantId === enemy.id}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ally Cards - Between Enemy and Player */}
        {allyCombatants.length > 0 && (
          <div className="p-2 sm:p-4 border-t border-green-700/30">
            <div className="flex gap-2 sm:gap-4 flex-wrap justify-center">
              {allyCombatants.map((ally) => (
                <div key={ally.id} className="w-[280px] sm:w-auto sm:min-w-[300px] sm:max-w-[400px]">
                  <CombatantCard
                    combatant={ally}
                    isEnemy={false}
                    isPlayerTurn={combatState?.isPlayerTurn || false}
                    isCurrentTurn={currentCombatantId === ally.id}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player Card and Actions */}
        <div className="bg-gray-900/50 border-t border-gray-700 p-2 sm:p-4 flex-shrink-0">
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
                    isCurrentTurn={currentCombatantId === player.id}
                    temporaryPlayerStats={combatState?.temporaryPlayerStats}
                  />
                ))}
              </div>
            </div>

            {/* Action Menu and Inventory */}
            <div className="lg:col-span-2">
              {combatState?.isPlayerTurn ? (
                <div className="space-y-4">
                  {/* Desktop Action Menu */}
                  <div className="hidden lg:block">
                    <ActionMenu
                      combatant={playerCombatants[0] || null}
                      enemies={aliveEnemies}
                      onAttack={handleAttack}
                      onDefend={handleDefend}
                      onUseItem={handleUseItem}
                      onInventory={() => setShowInventory(!showInventory)}
                      onSkills={() => setShowSkills(!showSkills)}
                      onEndTurn={handleEndTurn}
                      onRun={handleRun}
                      isProcessing={isProcessing}
                      selectedTarget={selectedTarget}
                      onSelectTarget={setSelectedTarget}
                      canEndTurn={canEndTurn}
                      mainActionUsed={turnState?.mainActionUsed || false}
                      extraActionUsed={turnState?.extraActionUsed || false}
                      skillActionUsed={turnState?.skillActionUsed || false}
                      skills={playerSkills}
                      temporaryPlayerStats={combatState?.temporaryPlayerStats}
                    />
                  </div>
                  
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

      {/* Skills Modal */}
      <AnimatePresence>
        {showSkills && (
          <MotionWrapper
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSkills(false)}
          >
            <MotionWrapper
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Kỹ Năng Nhân Vật</h2>
                  <button
                    onClick={() => setShowSkills(false)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
                  {playerSkills.length > 0 ? (
                    playerSkills.map((skill: any, index: number) => (
                      <div key={skill.id || index} className="p-4 bg-white/5 rounded-lg border border-white/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{skill.icon}</span>
                            <div>
                              <h3 className="text-lg font-medium text-white">{skill.name}</h3>
                              <p className="text-sm text-gray-400">{skill.skillType}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (skill.requiresTarget && aliveEnemies.length > 0) {
                                // Use selected target if available, otherwise use first enemy
                                const targetId = selectedTarget || aliveEnemies[0].id;
                                handleUseSkill(skill.id, [targetId]);
                              } else {
                                handleUseSkill(skill.id);
                              }
                              setShowSkills(false);
                            }}
                            disabled={isProcessing || (turnState?.skillActionUsed || false) || (skill.currentCooldown > 0)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isProcessing || (turnState?.skillActionUsed || false) || (skill.currentCooldown > 0)
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : skill.skillType === 'damage'
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : skill.skillType === 'healing'
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                          >
                            {skill.currentCooldown > 0 ? `Cooldown: ${skill.currentCooldown}` : 'Sử dụng'}
                          </button>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">{skill.description}</p>
                        <div className="text-xs text-blue-300">
                          <span className="font-medium">Hiệu quả: </span>
                          {translateEffectFormat(skill.effects)}
                        </div>
                        <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                          <span>Level: {skill.level}</span>
                          <span>Cooldown: {skill.cooldown} lượt</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p>Chưa có kỹ năng nào</p>
                      <p className="text-sm">Tạo nhân vật mới để có kỹ năng</p>
                    </div>
                  )}
                </div>
              </div>
            </MotionWrapper>
          </MotionWrapper>
        )}
      </AnimatePresence>

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
                inventory={combatState?.playerInventory || inventoryService.getInventory()}
                onUseItem={handleUseItem}
                onClose={() => setShowInventory(false)}
                onSelectTarget={setSelectedTarget}
                enemies={aliveEnemies}
              />
            </MotionWrapper>
          </MotionWrapper>
        )}
      </AnimatePresence>

       {/* Combat Log Menu - Responsive */}
       {(showCombatLog || isLargeScreen) && (
         <MotionWrapper
           initial={isLargeScreen ? { opacity: 0, x: 20 } : { opacity: 0, y: '100%' }}
           animate={isLargeScreen ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
           exit={isLargeScreen ? { opacity: 0, x: 20 } : { opacity: 0, y: '100%' }}
           className={`bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-40 flex flex-col ${
             isLargeScreen 
               ? 'fixed top-20 right-4 w-96 h-[calc(100vh-120px)]' 
               : 'fixed bottom-0 left-0 w-full h-1/2'
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
                    onClick={handleForceReset}
                    disabled={isProcessing}
                    className="flex items-center space-x-1 px-2 py-1 rounded bg-orange-600/30 hover:bg-orange-600/50 text-orange-400 hover:text-orange-300 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Force Reset Combat (Emergency)"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                  {/* Close button for mobile, Pin icon for desktop */}
                  {!isLargeScreen ? (
                    <button
                      onClick={toggleCombatLog}
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 hover:text-blue-300 transition-colors text-xs"
                      title="Đóng Combat Log"
                    >
                      <X className="w-3 h-3" />
                      <span>Đóng</span>
                    </button>
                  ) : (
                    <div className="p-1 rounded bg-blue-600/30 text-blue-400" title="Luôn hiển thị">
                      <Pin className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Combat Log Content */}
            <div className="flex-1 overflow-hidden min-h-0">
              <CombatLog
                log={combatService.getCurrentTurnActions()}
                turnLogs={combatService.getTurnLogs()}
                isPlayerTurn={combatState?.isPlayerTurn || false}
                isInMenu={true}
              />
            </div>
          </MotionWrapper>
       )}

      {/* Mobile Action Menu Bong Bóng */}
      {!isLargeScreen && showActionMenu && combatState?.isPlayerTurn && (
        <MotionWrapper
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          className="fixed bottom-0 left-0 w-full h-1/2 bg-gray-800 border border-gray-600 rounded-t-lg shadow-2xl z-40 flex flex-col"
        >
          {/* Action Menu Header */}
          <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700 rounded-t-lg flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sword className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Action Menu</h3>
              </div>
              <button
                onClick={toggleActionMenu}
                className="flex items-center space-x-1 px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 hover:text-blue-300 transition-colors text-xs"
                title="Đóng Action Menu"
              >
                <X className="w-3 h-3" />
                <span>Đóng</span>
              </button>
            </div>
          </div>

          {/* Action Menu Content */}
          <div className="flex-1 overflow-hidden min-h-0 p-4">
            <ActionMenu
              combatant={playerCombatants[0] || null}
              enemies={aliveEnemies}
              onAttack={handleAttack}
              onDefend={handleDefend}
              onUseItem={handleUseItem}
              onInventory={() => setShowInventory(!showInventory)}
              onSkills={() => setShowSkills(!showSkills)}
              onEndTurn={handleEndTurn}
              onRun={handleRun}
              isProcessing={isProcessing}
              selectedTarget={selectedTarget}
              onSelectTarget={setSelectedTarget}
              canEndTurn={canEndTurn}
              mainActionUsed={turnState?.mainActionUsed || false}
              extraActionUsed={turnState?.extraActionUsed || false}
              skillActionUsed={turnState?.skillActionUsed || false}
              skills={playerSkills}
              temporaryPlayerStats={combatState?.temporaryPlayerStats}
            />
          </div>
        </MotionWrapper>
      )}

      {/* Floating Action Buttons for Mobile */}
      {!isLargeScreen && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
          {/* Combat Log Button */}
          {!showCombatLog && (
            <MotionWrapper
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <button
                onClick={toggleCombatLog}
                className="p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
                title="Mở Combat Log"
              >
                <MessageSquare className="w-6 h-6" />
              </button>
            </MotionWrapper>
          )}
          
          {/* Action Menu Button */}
          {combatState?.isPlayerTurn && !showActionMenu && (
            <MotionWrapper
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <button
                onClick={toggleActionMenu}
                className="p-3 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-colors"
                title="Mở Action Menu"
              >
                <Sword className="w-6 h-6" />
              </button>
            </MotionWrapper>
          )}
        </div>
      )}

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
