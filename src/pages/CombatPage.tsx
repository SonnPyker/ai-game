import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Play,
  Pause,
  MessageSquare,
  Pin,
  X
} from 'lucide-react';
import { Character, Enemy, InventoryItem } from '../types';
import { translateEffectFormat } from '../utils/skillEffectTranslator';
import { combatService, CombatState, Combatant } from '../services/combatService';
import { combatDataService } from '../services/combatDataService';
import { inventoryService } from '../services/inventoryService';
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
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const processingRef = useRef(false);
  const lastActionTimeRef = useRef(0);
  const currentActionIdRef = useRef<string | null>(null);
  // Combat log is always visible and pinned
  
  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  // Mobile enemy display states
  const [currentEnemyIndex, setCurrentEnemyIndex] = useState(0);
  const [showCompactEnemyView, setShowCompactEnemyView] = useState(false);

  // Screen size detection and responsive management
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsLargeScreen(width >= 1024); // Tailwind's 'lg' breakpoint
      setIsTablet(width >= 768 && width < 1024); // Tailwind's 'md' to 'lg' breakpoint
      setIsMobile(width < 768); // Tailwind's 'md' breakpoint
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
      setShowResults(true);
    }
  }, [combatState?.isActive]);

  // Fallback: Check for combat end every second as backup
  useEffect(() => {
    const fallbackInterval = setInterval(() => {
      const currentCombat = combatService.getCurrentCombat();
      if (currentCombat && !currentCombat.isActive && !showResults) {
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
      
      // Create test enemies with different threat levels
      const testEnemies: Enemy[] = [
        // Low threat goblin (no skills)
        {
          id: 'test_goblin_low',
          name: 'Goblin Thường',
          description: 'Một goblin yếu ớt, chỉ có basic attacks.',
          type: 'humanoid',
          level: 1,
          combatLevel: 1,
          threatLevel: 'low',
          stats: {
            strength: 10,
            agility: 12,
            constitution: 8,
            intelligence: 6,
            wisdom: 8,
            charisma: 6,
            modifiers: {
              strength: 0,
              agility: 1,
              constitution: -1,
              intelligence: -2,
              wisdom: -1,
              charisma: -2
            }
          },
          health: { current: 20, max: 20 },
          armorClass: 6,
          attacks: [
            {
              name: 'Rusty Dagger',
              attackBonus: 2,
              damage: '1d4',
              damageType: 'physical'
            }
          ],
          experienceReward: 15
        },
        // Medium threat goblin (1 skill)
        {
          id: 'test_goblin_medium',
          name: 'Goblin Chiến Binh',
          description: 'Một goblin có kinh nghiệm chiến đấu, biết sử dụng skills.',
          type: 'humanoid',
          level: 3,
          combatLevel: 3,
          threatLevel: 'medium',
          stats: {
            strength: 14,
            agility: 16,
            constitution: 12,
            intelligence: 10,
            wisdom: 12,
            charisma: 8,
            modifiers: {
              strength: 2,
              agility: 3,
              constitution: 1,
              intelligence: 0,
              wisdom: 1,
              charisma: -1
            }
          },
          health: { current: 35, max: 35 },
          armorClass: 10,
          attacks: [
            {
              name: 'Scimitar',
              attackBonus: 5,
              damage: '1d6+2',
              damageType: 'physical'
            }
          ],
          skills: [
            {
              id: 'goblin_power_strike',
              name: 'Power Strike',
              description: 'Tấn công mạnh mẽ với sát thương tăng thêm.',
              level: 2,
              skillType: 'damage',
              effects: ['damage_buff:+1d4:3turns'],
              cooldown: 3,
              currentCooldown: 0,
              icon: '⚔',
              requiresTarget: true
            }
          ],
          experienceReward: 50
        },
        // High threat goblin (2 skills)
        {
          id: 'test_goblin_high',
          name: 'Goblin Shaman',
          description: 'Một goblin pháp sư mạnh mẽ với nhiều kỹ năng.',
          type: 'humanoid',
          level: 5,
          combatLevel: 5,
          threatLevel: 'high',
          stats: {
            strength: 12,
            agility: 14,
            constitution: 14,
            intelligence: 16,
            wisdom: 18,
            charisma: 10,
            modifiers: {
              strength: 1,
              agility: 2,
              constitution: 2,
              intelligence: 3,
              wisdom: 4,
              charisma: 0
            }
          },
          health: { current: 45, max: 45 },
          armorClass: 12,
          attacks: [
            {
              name: 'Staff',
              attackBonus: 4,
              damage: '1d6+1',
              damageType: 'physical'
            }
          ],
          skills: [
            {
              id: 'goblin_fire_blast',
              name: 'Fire Blast',
              description: 'Tạo ra ngọn lửa tấn công kẻ thù.',
              level: 3,
              skillType: 'damage',
              effects: ['damage:2d6:instant'],
              cooldown: 4,
              currentCooldown: 0,
              icon: '•',
              requiresTarget: true
            },
            {
              id: 'goblin_heal_self',
              name: 'Heal Self',
              description: 'Hồi phục HP cho bản thân.',
              level: 2,
              skillType: 'healing',
              effects: ['heal:2d4:+2:instant'],
              cooldown: 3,
              currentCooldown: 0,
              icon: '♡',
              requiresTarget: false
            }
          ],
          experienceReward: 100
        },
        // Extreme threat goblin (3 skills)
        {
          id: 'test_goblin_extreme',
          name: 'Goblin Warlord',
          description: 'Một goblin tướng lĩnh cực kỳ nguy hiểm với đầy đủ kỹ năng.',
          type: 'humanoid',
          level: 8,
          combatLevel: 8,
          threatLevel: 'extreme',
          stats: {
            strength: 18,
            agility: 16,
            constitution: 18,
            intelligence: 14,
            wisdom: 16,
            charisma: 12,
            modifiers: {
              strength: 4,
              agility: 3,
              constitution: 4,
              intelligence: 2,
              wisdom: 3,
              charisma: 1
            }
          },
          health: { current: 80, max: 80 },
          armorClass: 16,
          attacks: [
            {
              name: 'War Axe',
              attackBonus: 8,
              damage: '2d6+4',
              damageType: 'physical'
            }
          ],
          skills: [
            {
              id: 'goblin_berserker_rage',
              name: 'Berserker Rage',
              description: 'Kích hoạt cơn thịnh nộ, tăng sức mạnh và tốc độ.',
              level: 4,
              skillType: 'damage',
              effects: ['stat_buff:strength:+3:4turns', 'stat_buff:agility:+2:4turns'],
              cooldown: 5,
              currentCooldown: 0,
              icon: '○',
              requiresTarget: false
            },
            {
              id: 'goblin_heal_self_advanced',
              name: 'Greater Heal',
              description: 'Hồi phục HP mạnh mẽ cho bản thân.',
              level: 4,
              skillType: 'healing',
              effects: ['heal:3d6:+3:instant'],
              cooldown: 4,
              currentCooldown: 0,
              icon: '♡',
              requiresTarget: false
            },
            {
              id: 'goblin_defensive_stance',
              name: 'Defensive Stance',
              description: 'Tăng khả năng phòng thủ tạm thời.',
              level: 3,
              skillType: 'healing',
              effects: ['stat_buff:ac:+3:5turns'],
              cooldown: 3,
              currentCooldown: 0,
              icon: '○',
              requiresTarget: false
            }
          ],
          experienceReward: 200
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
      // Try to find item in combat inventory first, then fallback to regular inventory
      let item = combatState.playerInventory?.find(i => i.id === itemId);
      if (!item) {
        const foundItem = inventoryService.findItemInInventory(itemId);
        if (foundItem) {
          item = foundItem;
        }
      }
      
      if (!item) {
        return;
      }

      const success = combatService.useItem('player', item, targetId);
      
      if (success) {
        // Only sync consumable items since combat inventory only contains consumables
        if (item.type === 'consumable' && item.quantity !== undefined && item.quantity > 0) {
          item.quantity -= 1;
          
          // CRITICAL: Sync with inventoryService to ensure main inventory is updated
          
          // Update through inventoryService to ensure consistency
          if (item.quantity <= 0) {
            // Remove item completely if quantity reaches 0
            inventoryService.removeItem(item.id, 1);
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
          }
          
          // Load current inventory into inventoryService
          inventoryService.setCharacter(character);
          
          // Update character data with current inventory
          character.inventory = inventoryService.getInventory();
          character.equipment = inventoryService.getEquipment();
          character.equipped_stats_bonuses = inventoryService.getEquippedStatsBonuses();
          localStorage.setItem('currentCharacter', JSON.stringify(character));
          
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


  // Handle manual end turn
  const handleEndTurn = useCallback(async () => {
    if (!combatState || !combatState.isPlayerTurn || isProcessing) return;

    // Check if player can end turn
    if (!combatService.canEndTurn()) {
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
            
            // Update combat level data from combat service
            if (playerCombatant.characterData) {
              // Copy combat level data from the combatant (which was updated by combatService)
              character.combatLevel = playerCombatant.characterData.combatLevel;
              character.combatExperience = playerCombatant.characterData.combatExperience;
              
            }
          }
          
          // Get actual experience from combat rewards
          const experienceGained = combatState?.rewards?.experience || 0;
          const currencyGained = combatState?.rewards?.currency || 0;
          
          if (experienceGained > 0) {
            // Add full experience to regular character level
            const regularLevelResult = levelSystemService.addExperience(character, experienceGained);
            
            
            if (regularLevelResult.leveledUp) {
            }
          }
          
          // Add currency reward
          if (currencyGained > 0) {
            const currentCurrency = character.currency || 0;
            character.currency = currentCurrency + currencyGained;
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
        const combatInventory = combatState?.playerInventory || [];
        const consumableItems = combatInventory.filter(item => item.type === 'consumable');
        
        consumableItems.forEach(combatItem => {
          const mainItem = inventoryService.findItemInInventory(combatItem.id);
          if (mainItem && mainItem.type === 'consumable') {
            // Update quantity to match combat state
            if (mainItem.quantity !== combatItem.quantity) {
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
          }
          
          character.inventory = inventoryService.getInventory();
          character.equipment = inventoryService.getEquipment();
          character.equipped_stats_bonuses = inventoryService.getEquippedStatsBonuses();
          localStorage.setItem('currentCharacter', JSON.stringify(character));
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
  
  // Mobile enemy navigation functions
  const goToNextEnemy = useCallback(() => {
    if (aliveEnemies.length > 0) {
      setCurrentEnemyIndex(prev => (prev + 1) % aliveEnemies.length);
    }
  }, [aliveEnemies.length]);

  const goToPreviousEnemy = useCallback(() => {
    if (aliveEnemies.length > 0) {
      setCurrentEnemyIndex(prev => prev === 0 ? aliveEnemies.length - 1 : prev - 1);
    }
  }, [aliveEnemies.length]);

  const goToEnemy = useCallback((index: number) => {
    if (index >= 0 && index < aliveEnemies.length) {
      setCurrentEnemyIndex(index);
    }
  }, [aliveEnemies.length]);


  // Touch event handlers for swipe gestures
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isMobile) {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    }
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isMobile) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNextEnemy();
    }
    if (isRightSwipe) {
      goToPreviousEnemy();
    }
  }, [isMobile, touchStart, touchEnd, goToNextEnemy, goToPreviousEnemy]);
  
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

  // Auto-scroll to active enemy with improved logic
  useEffect(() => {
    if (isMobile && currentCombatantId && aliveEnemies.length > 0) {
      const activeEnemyIndex = aliveEnemies.findIndex(enemy => enemy.id === currentCombatantId);
      if (activeEnemyIndex !== -1) {
        // Always auto switch to the enemy whose turn it is on mobile
        if (activeEnemyIndex !== currentEnemyIndex) {
          setCurrentEnemyIndex(activeEnemyIndex);
        }
        
        // Auto-select the active enemy as target on mobile for better UX
        if (!selectedTarget) {
          setSelectedTarget(currentCombatantId);
        }
      }
    }
  }, [currentCombatantId, isMobile, aliveEnemies, currentEnemyIndex, selectedTarget]);

  // Reset enemy index when combat starts or enemies change
  useEffect(() => {
    if (isMobile && aliveEnemies.length > 0) {
      // If current index is out of bounds, reset to 0
      if (currentEnemyIndex >= aliveEnemies.length) {
        setCurrentEnemyIndex(0);
      }
      // If no enemy is selected and there are enemies, select the first one
      if (currentEnemyIndex < 0 && aliveEnemies.length > 0) {
        setCurrentEnemyIndex(0);
      }
    }
  }, [aliveEnemies.length, currentEnemyIndex, isMobile]);

  // Auto-adjust view mode based on enemy count
  useEffect(() => {
    if (isMobile) {
      if (aliveEnemies.length <= 1) {
        // Single enemy - always use detail view
        setShowCompactEnemyView(false);
      } else if (aliveEnemies.length > 4) {
        // Many enemies - suggest compact view
        if (!showCompactEnemyView) {
          // Only auto-switch to compact view if user hasn't manually chosen detail view
          setShowCompactEnemyView(true);
        }
      }
    }
  }, [aliveEnemies.length, isMobile, showCompactEnemyView]);

  // Backup auto-switch mechanism - force switch when combat state changes
  useEffect(() => {
    if (isMobile && combatState && aliveEnemies.length > 0 && currentCombatantId) {
      const activeEnemyIndex = aliveEnemies.findIndex(enemy => enemy.id === currentCombatantId);
      if (activeEnemyIndex !== -1 && activeEnemyIndex !== currentEnemyIndex) {
        setCurrentEnemyIndex(activeEnemyIndex);
      }
    }
  }, [combatState, isMobile, aliveEnemies, currentEnemyIndex, currentCombatantId]);
  
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
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
          {/* Left side - Combat Log Button for mobile */}
          <div className="flex items-center">
            {isMobile && (
              <button
                onClick={toggleCombatLog}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Toggle Combat Log"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Center - Turn Indicator */}
          <div className="flex-1 flex justify-center">
            {isMobile ? (
              // Mobile: Simple turn indicator
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-400">T{combatState?.currentTurn || 0}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  combatState?.isPlayerTurn 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {combatState?.isPlayerTurn ? 'Bạn' : 'Enemy'}
                </span>
                {nextCombatantName && (
                  <span className="text-xs text-gray-500">
                    Tiếp: {nextCombatantName}
                  </span>
                )}
              </div>
            ) : (
              // Desktop: Full turn indicator
              <TurnIndicator
                turnNumber={combatState?.currentTurn || 0}
                isPlayerTurn={combatState?.isPlayerTurn || false}
                currentCombatantName={combatState?.isPlayerTurn ? 'Player' : aliveEnemies[0]?.name}
                nextCombatantName={nextCombatantName}
                isProcessing={isProcessing}
                turnOrder={combatState?.turnOrder || []}
                currentCombatantIndex={combatState?.currentCombatantIndex || 0}
              />
            )}
          </div>
          
          {/* Right side - Control Buttons */}
          <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
            {/* Combat Log Button - Always Pinned (for desktop) */}
            {!isMobile && (
              <div
                className={`border rounded-lg bg-yellow-600/30 border-yellow-500/50 text-gray-200 ${isMobile ? 'p-1.5' : 'p-2'}`}
                title="Combat Log (Luôn hiển thị)"
              >
                <MessageSquare className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
              </div>
            )}
            
            {/* Pause/Play Button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`text-gray-400 hover:text-white transition-colors ${isMobile ? 'p-1.5' : 'p-2'}`}
              title={isPaused ? "Tiếp tục" : "Tạm dừng"}
            >
              {isPaused ? <Play className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} /> : <Pause className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} />}
            </button>
          </div>
        </div>
      </div>

      <div className={`flex flex-col min-h-[calc(100vh-80px)] transition-all duration-300 justify-between ${isLargeScreen && showCombatLog ? 'lg:mr-96' : ''}`}>
        {/* Enemy Cards - Optimized Mobile Layout */}
        <div className={`${isMobile ? 'p-1' : 'p-2'} sm:p-4 lg:max-h-[50vh] lg:overflow-y-auto`}>
          {isMobile && aliveEnemies.length > 0 ? (
            // Mobile: Smart enemy display
            <div className="relative">
              {/* Mobile Enemy Header - Simplified */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center space-x-2">
                  {currentCombatantId === aliveEnemies[currentEnemyIndex]?.id && (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  )}
                  <span className="text-xs text-gray-400">
                    {currentEnemyIndex + 1}/{aliveEnemies.length}
                  </span>
                </div>
                
                {/* View Toggle Button */}
                {aliveEnemies.length > 1 && (
                  <button
                    onClick={() => setShowCompactEnemyView(!showCompactEnemyView)}
                    className="text-xs text-yellow-400 hover:text-yellow-300 px-2 py-1 rounded bg-yellow-900/30 border border-yellow-700/50"
                  >
                    {showCompactEnemyView ? 'Chi tiết' : 'Tất cả'}
                  </button>
                )}
              </div>

              {showCompactEnemyView ? (
                // Compact View: Show all enemies in a grid
                <div className="grid grid-cols-2 gap-1">
                  {aliveEnemies.map((enemy, index) => (
                    <div 
                      key={enemy.id}
                      className={`p-2 bg-gray-800/50 rounded border cursor-pointer transition-all ${
                        currentCombatantId === enemy.id 
                          ? 'border-yellow-400 bg-yellow-900/20 ring-2 ring-yellow-400/50' 
                          : selectedTarget === enemy.id
                          ? 'border-yellow-400 bg-yellow-900/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => {
                        setSelectedTarget(enemy.id);
                        setCurrentEnemyIndex(index);
                        setShowCompactEnemyView(false);
                      }}
                    >
                      <div className="text-xs font-medium text-white truncate">
                        {enemy.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        HP: {enemy.health.current}/{enemy.health.max}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                        <div 
                          className="bg-yellow-600 h-1 rounded-full transition-all"
                          style={{ width: `${(enemy.health.current / enemy.health.max) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Detail View: Show single enemy with navigation
                <div className="space-y-2">
                  {/* Single Enemy Display with Swipe Support */}
                  <div 
                    className="w-full"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <CombatantCard
                      combatant={aliveEnemies[currentEnemyIndex]}
                      isEnemy={true}
                      isSelected={selectedTarget === aliveEnemies[currentEnemyIndex]?.id}
                      onSelect={() => setSelectedTarget(aliveEnemies[currentEnemyIndex]?.id)}
                      isPlayerTurn={combatState?.isPlayerTurn || false}
                      isCurrentTurn={currentCombatantId === aliveEnemies[currentEnemyIndex]?.id}
                    />
                  </div>

                  {/* Navigation Controls */}
                  {aliveEnemies.length > 1 && (
                    <div className="flex items-center justify-center space-x-4">
                      <button
                        onClick={goToPreviousEnemy}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                      >
                        ←
                      </button>
                      
                      {/* Pagination Dots */}
                      <div className="flex items-center space-x-1">
                        {aliveEnemies.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => goToEnemy(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              index === currentEnemyIndex 
                                ? 'bg-yellow-400' 
                                : 'bg-gray-600 hover:bg-gray-500'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={goToNextEnemy}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Desktop/Tablet: Original layout
            <div className="relative">
              {/* Desktop scroll indicator */}
              {aliveEnemies.length > 1 && (
                <div className="sm:hidden absolute top-0 right-0 z-10 bg-gray-800/90 px-2 py-1 rounded-bl text-xs text-gray-400">
                  ← Kéo để xem thêm →
                </div>
              )}
              
              {/* Responsive enemy grid */}
              <div className={`
                ${isTablet ? 'flex flex-wrap gap-3 justify-center' : ''}
                ${isLargeScreen ? 'flex flex-wrap gap-4 justify-center overflow-x-visible' : ''}
                scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800
              `}>
                {aliveEnemies.map((enemy) => (
                  <div 
                    key={enemy.id} 
                    className={`
                      ${isTablet ? 'w-auto min-w-[280px] max-w-[350px]' : ''}
                      ${isLargeScreen ? 'w-auto min-w-[300px] max-w-[400px]' : ''}
                    `}
                  >
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
          )}
        </div>

        {/* Ally Cards - Between Enemy and Player */}
        {allyCombatants.length > 0 && (
          <div className={`${isMobile ? 'p-1' : 'p-2'} sm:p-4 border-t border-yellow-700/30`}>
            <div className={`
              ${isMobile ? 'flex overflow-x-auto gap-1 snap-x snap-mandatory' : ''}
              ${isTablet ? 'flex flex-wrap gap-3 justify-center' : ''}
              ${isLargeScreen ? 'flex gap-2 sm:gap-4 flex-wrap justify-center' : ''}
            `}>
              {allyCombatants.map((ally) => (
                <div 
                  key={ally.id} 
                  className={`
                    ${isMobile ? 'flex-shrink-0 w-[260px] snap-center' : ''}
                    ${isTablet ? 'w-auto min-w-[280px] max-w-[350px]' : ''}
                    ${isLargeScreen ? 'w-[280px] sm:w-auto sm:min-w-[300px] sm:max-w-[400px]' : ''}
                  `}
                >
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
        <div className={`bg-gray-900/50 border-t border-gray-700 ${isMobile ? 'p-1' : 'p-2'} sm:p-4 flex-shrink-0`}>
          <div className={`${isMobile ? 'flex flex-col space-y-2' : 'grid grid-cols-1 lg:grid-cols-3'} gap-2 sm:gap-4`}>
            {/* Player Cards - Support Multiple Players */}
            <div className={isMobile ? 'w-full' : 'lg:col-span-1'}>
              <div className={`${isMobile ? 'space-y-1' : 'space-y-2'} sm:space-y-3`}>
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
            <div className={isMobile ? 'w-full' : 'lg:col-span-2'}>
              {combatState?.isPlayerTurn ? (
                <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
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

                  {/* Mobile Action Buttons */}
                  {isMobile && (
                    <div className="space-y-2">
                      {/* Action Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleAttack(0, selectedTarget || undefined)}
                          disabled={isProcessing || !selectedTarget || turnState?.mainActionUsed}
                          className={`p-3 rounded-lg transition-colors text-sm font-medium ${
                            !selectedTarget 
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                              : 'bg-gray-900 hover:bg-gray-900 disabled:bg-gray-600 disabled:text-gray-400 text-white'
                          }`}
                        >
                          Tấn Công
                        </button>
                        <button
                          onClick={handleDefend}
                          disabled={isProcessing || turnState?.mainActionUsed}
                          className="p-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          Phòng Thủ
                        </button>
                        <button
                          onClick={() => setShowSkills(true)}
                          disabled={isProcessing || turnState?.skillActionUsed}
                          className="p-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          Kỹ Năng
                        </button>
                        <button
                          onClick={() => setShowInventory(true)}
                          disabled={isProcessing}
                          className="p-3 bg-yellow-700 hover:bg-yellow-700 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          Đồ Dùng
                        </button>
                        <button
                          onClick={handleRun}
                          disabled={isProcessing}
                          className="p-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg transition-colors text-sm font-medium col-span-1"
                        >
                          Chạy
                        </button>
                        <button
                          onClick={handleEndTurn}
                          disabled={isProcessing || !canEndTurn}
                          className="p-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:text-gray-300 text-white rounded-lg transition-colors text-sm font-medium col-span-1"
                        >
                          Kết Thúc
                        </button>
                      </div>
                    </div>
                  )}
                  
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
            className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${isMobile ? 'p-2' : 'p-4'}`}
            onClick={() => setShowSkills(false)}
          >
            <MotionWrapper
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`bg-gray-900 rounded-lg shadow-2xl w-full ${isMobile ? 'max-w-full max-h-[90vh]' : 'max-w-2xl max-h-[80vh]'} overflow-hidden`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
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
                                  ? 'bg-gray-900 hover:bg-gray-900 text-white'
                                  : skill.skillType === 'healing'
                                    ? 'bg-yellow-700 hover:bg-yellow-700 text-white'
                                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            }`}
                          >
                            {skill.currentCooldown > 0 ? `Cooldown: ${skill.currentCooldown}` : 'Sử dụng'}
                          </button>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">{skill.description}</p>
                        <div className="text-xs text-yellow-300">
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
            className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${isMobile ? 'p-2' : 'p-4'}`}
            onClick={() => setShowInventory(false)}
          >
            <MotionWrapper
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`bg-gray-900 rounded-lg shadow-2xl w-full ${isMobile ? 'max-w-full max-h-[90vh]' : 'max-w-4xl max-h-[80vh]'} overflow-hidden`}
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
               : `fixed bottom-0 left-0 w-full ${isMobile ? 'h-3/4' : 'h-1/2'}`
           }`}
         >
            {/* Combat Log Header */}
            <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700 rounded-t-lg flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Combat Log</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Close button for mobile, Pin icon for desktop */}
                  {!isLargeScreen ? (
                    <button
                      onClick={toggleCombatLog}
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-400 hover:text-yellow-300 transition-colors text-xs"
                      title="Đóng Combat Log"
                    >
                      <X className="w-3 h-3" />
                      <span>Đóng</span>
                    </button>
                  ) : (
                    <div className="p-1 rounded bg-yellow-600/30 text-yellow-400" title="Luôn hiển thị">
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
