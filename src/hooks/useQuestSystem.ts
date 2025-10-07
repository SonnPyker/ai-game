import { useState, useEffect, useCallback } from 'react';
import { QuestSystem, QuestProgress } from '../types';
import { questDetectionService } from '../services/questDetectionService';
import { factionQuestService } from '../services/factionQuestService';
import { levelSystemService } from '../services/levelSystemService';
import { currencyService } from '../services/currencyService';
import { npcRelationshipService } from '../services/npcRelationshipService';

const QUEST_SYSTEM_KEY = 'quest_system';

// Helper function để xử lý claim reward theo loại
const processRewardClaim = (reward: any) => {
  try {
    // Lấy character data từ localStorage
    const characterData = localStorage.getItem('currentCharacter');
    if (!characterData) return;

    const character = JSON.parse(characterData);

    switch (reward.type) {
      case 'currency':
        // Thêm tiền vào character
        currencyService.addCurrency(character, reward.amount);
        console.log(`✅ Đã nhận ${reward.amount} tiền tệ`);
        break;

      case 'secondary_currency':
        // Thêm tiền phụ vào character
        currencyService.addSecondaryCurrency(character, reward.amount);
        console.log(`✅ Đã nhận ${reward.amount} tiền phụ`);
        break;

      case 'experience':
        // Thêm kinh nghiệm và kiểm tra level up
        const levelResult = levelSystemService.addExperience(character, reward.amount);
        console.log(`✅ Đã nhận ${reward.amount} kinh nghiệm`);
        
        if (levelResult.leveledUp) {
          if (levelResult.levelsGained > 1) {
            console.log(`🎉 Level up! Từ level ${levelResult.previousLevel} lên level ${levelResult.newLevel} (+${levelResult.levelsGained} levels)!`);
          } else {
            console.log(`🎉 Level up! Từ level ${levelResult.previousLevel} lên level ${levelResult.newLevel}!`);
          }
          // Có thể hiển thị notification level up ở đây
        }
        break;

      case 'item':
        // Tạo item reward và thêm trực tiếp vào currentCharacter.inventory
        if (reward.items && reward.items.length > 0) {
          console.log('🎁 Đang thêm items vào character inventory:', reward.items);
          reward.items.forEach((item: any) => {
            // Đảm bảo item có tags phù hợp
            if (!item.tags) {
              item.tags = ['reward'];
            } else if (!item.tags.includes('reward')) {
              item.tags.push('reward');
            }
            
            // Đối với faction quest, đảm bảo rarity unique
            if (reward.factionName) {
              item.rarity = 'unique';
            }
            
            // Thêm trực tiếp vào character inventory
            if (!character.inventory) {
              character.inventory = [];
            }
            
            // Kiểm tra xem item đã tồn tại chưa (để stack nếu cần)
            const existingItem = character.inventory.find((i: any) => i.name === item.name && i.type === item.type);
            if (existingItem && (item.type === 'consumable' || item.type === 'misc')) {
              existingItem.quantity += item.quantity || 1;
            } else {
              character.inventory.push(item);
            }
            
            console.log('🎁 Thêm item vào character:', item);
          });
          console.log(`✅ Đã nhận ${reward.items.length} vật phẩm`);
        } else {
          // Tạo item ngẫu nhiên nếu không có items cụ thể
          const randomItem = generateRandomRewardItem(reward.factionName);
          if (randomItem) {
            console.log('🎁 Thêm random item vào character:', randomItem);
            
            // Thêm trực tiếp vào character inventory
            if (!character.inventory) {
              character.inventory = [];
            }
            character.inventory.push(randomItem);
            
            console.log(`✅ Đã nhận vật phẩm: ${randomItem.name}`);
          }
        }
        break;

      case 'faction_reputation':
        // Thêm danh tiếng phe phái
        if (reward.factionName) {
          npcRelationshipService.adjustFactionReputation(reward.factionName, reward.amount);
          console.log(`✅ Đã nhận ${reward.amount} danh tiếng phe phái ${reward.factionName}`);
        }
        break;

      default:
        console.log(`⚠️ Loại reward không được hỗ trợ: ${reward.type}`);
    }

    // Cập nhật character data trong localStorage
    localStorage.setItem('currentCharacter', JSON.stringify(character));
    
  } catch (error) {
    console.error('Lỗi khi xử lý reward:', error);
  }
};

// Tạo item reward ngẫu nhiên
const generateRandomRewardItem = (factionName?: string) => {
  const itemTypes = ['weapon', 'armor', 'consumable', 'misc'];
  const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
  
  const item = {
    id: `reward_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: factionName ? `Vật phẩm đặc trưng ${factionName}` : 'Vật phẩm ngẫu nhiên',
    description: factionName ? `Một vật phẩm đặc biệt từ phe phái ${factionName}` : 'Một vật phẩm bí ẩn',
    type: randomType as 'weapon' | 'armor' | 'consumable' | 'misc',
    rarity: factionName ? 'unique' as const : 'common' as const,
    quantity: 1,
    icon: randomType === 'weapon' ? '⚔️' : randomType === 'armor' ? '🛡️' : randomType === 'consumable' ? '🧪' : '📦',
    stats: {},
    isEquipped: false,
    tags: ['reward', randomType]
  };

  return item;
};

// Helper function để convert world data quest thành QuestProgress
const convertWorldQuestToQuestProgress = (worldQuest: any, act?: number): QuestProgress => {
  // Xử lý format cũ của starterQuest (backward compatibility)
  if (worldQuest.objective && !worldQuest.objectives) {
    // Convert format cũ sang format mới
    const convertedQuest = {
      ...worldQuest,
      description: worldQuest.objective,
      objectives: worldQuest.steps?.map((step: string, index: number) => ({
        id: `obj_${index + 1}`,
        description: step,
        aiKeywords: []
      })) || [{
        id: 'obj_1',
        description: worldQuest.objective,
        aiKeywords: []
      }],
      rewards: [
        {
          type: 'currency',
          amount: 100,
          description: 'Tiền tệ +100',
          claimed: false
        },
        {
          type: 'experience',
          amount: 300,
          description: worldQuest.reward || 'Kinh nghiệm +300',
          claimed: false
        },
        {
          type: 'item',
          amount: 1,
          items: [{
            name: 'Vật phẩm ngẫu nhiên',
            description: 'Một vật phẩm hữu ích',
            type: 'misc',
            rarity: 'common'
          }],
          description: 'Vật phẩm ngẫu nhiên',
          claimed: false
        }
      ]
    };
    
    return {
      id: convertedQuest.id || `quest_${Date.now()}`,
      type: act !== undefined ? 'main' : 'side', // act = 0 vẫn là main quest
      title: convertedQuest.title,
      description: convertedQuest.description,
      status: act !== undefined ? 'locked' : 'available', // Main quest bắt đầu locked, side quest available
      act: act,
      objectives: convertedQuest.objectives.map((obj: any, index: number) => ({
        id: obj.id,
        description: obj.description,
        completed: false,
        aiKeywords: obj.aiKeywords || [],
        unlocked: index === 0 // Chỉ objective đầu tiên được unlock
      })),
      rewards: convertedQuest.rewards.map((reward: any) => ({
        type: reward.type,
        amount: reward.amount,
        description: reward.description,
        claimed: false
      })),
      createdAt: new Date()
    };
  }
  
  // Format mới (đã có objectives và rewards)
  const questType = act !== undefined ? 'main' : 'side';
  let rewards = worldQuest.rewards?.map((reward: any) => ({
    type: reward.type,
    amount: reward.amount,
    description: reward.description,
    claimed: false,
    items: reward.items || undefined
  })) || [];

  // Validate rewards cho main quest
  if (questType === 'main') {
    const hasCurrency = rewards.some((r: any) => r.type === 'currency');
    const hasExperience = rewards.some((r: any) => r.type === 'experience');
    const hasItem = rewards.some((r: any) => r.type === 'item');

    if (!hasCurrency) {
      rewards.push({
        type: 'currency',
        amount: 100,
        description: 'Tiền tệ +100',
        claimed: false
      });
    }
    if (!hasExperience) {
      rewards.push({
        type: 'experience',
        amount: 300,
        description: 'Kinh nghiệm +300',
        claimed: false
      });
    }
    if (!hasItem) {
      rewards.push({
        type: 'item',
        amount: 1,
        items: [{
          name: 'Vật phẩm ngẫu nhiên',
          description: 'Một vật phẩm hữu ích',
          type: 'misc',
          rarity: 'common'
        }],
        description: 'Vật phẩm ngẫu nhiên',
        claimed: false
      });
    }
  }

  return {
    id: worldQuest.id || `quest_${Date.now()}`,
    type: questType,
    title: worldQuest.title,
    description: worldQuest.description,
    status: act !== undefined ? 'locked' : 'available', // Main quest bắt đầu locked, side quest available
    act: act,
    objectives: worldQuest.objectives?.map((obj: any, index: number) => ({
      id: obj.id || `obj_${index + 1}`,
      description: obj.description,
      completed: false,
      aiKeywords: obj.aiKeywords || [],
      unlocked: index === 0 // Chỉ objective đầu tiên được unlock
    })) || [],
    rewards: rewards,
    createdAt: new Date()
  };
};

// Helper function để load quest từ world_gen_result
const loadQuestsFromWorldData = (): { mainQuests: QuestProgress[], sideQuests: QuestProgress[] } => {
  try {
    const worldData = localStorage.getItem('world_gen_result');
    if (!worldData) {
      console.log('Không tìm thấy world_gen_result');
      return { mainQuests: [], sideQuests: [] };
    }

    const parsed = JSON.parse(worldData);
    const mainQuests: QuestProgress[] = [];
    const sideQuests: QuestProgress[] = [];

    // Load starterQuest (quest mở đầu - không thuộc act nào)
    if (parsed.starterQuest) {
      const starterQuest = convertWorldQuestToQuestProgress(parsed.starterQuest, 0); // Starter quest không có act (act: 0)
      starterQuest.status = 'active'; // Starter quest luôn active
      starterQuest.act = undefined; // Xóa act để không gây nhầm lẫn
      mainQuests.push(starterQuest);
    }

    // Load mainQuests từ world data
    if (parsed.mainQuests && Array.isArray(parsed.mainQuests)) {
      parsed.mainQuests.forEach((quest: any) => {
        const questProgress = convertWorldQuestToQuestProgress(quest, quest.act);
        mainQuests.push(questProgress);
      });
    }

    // Không load sideQuests từ world data - sidequest chỉ được tạo khi accept từ chat

    console.log('Loaded quests from world data:', { mainQuests: mainQuests.length, sideQuests: sideQuests.length });
    return { mainQuests, sideQuests };
  } catch (error) {
    console.error('Lỗi load quest từ world data:', error);
    return { mainQuests: [], sideQuests: [] };
  }
};

// Helper function để load faction quests
const loadFactionQuests = (): QuestProgress[] => {
  return factionQuestService.getFactionQuests();
};

export function useQuestSystem() {
  const [questSystem, setQuestSystem] = useState<QuestSystem>({
    mainQuests: [],
    sideQuests: [],
    factionQuests: [],
    currentAct: 0, // Bắt đầu từ 0 (quest mở đầu)
    totalActs: 5,
    unlockedActs: [], // Chưa unlock act nào
    questHistory: [],
    factionReputations: []
  });

  // Listen for faction reputation changes
  useEffect(() => {
    const handleFactionReputationChange = (event: CustomEvent) => {
      const { factionName, reputation } = event.detail;
      setQuestSystem(prev => {
        const newSystem = { ...prev };
        const existingIndex = newSystem.factionReputations.findIndex(fr => fr.factionName === factionName);
        
        if (existingIndex >= 0) {
          newSystem.factionReputations[existingIndex].reputation = reputation;
        } else {
          newSystem.factionReputations.push({ factionName, reputation });
        }
        
        // Save to localStorage
        localStorage.setItem(QUEST_SYSTEM_KEY, JSON.stringify(newSystem));
        return newSystem;
      });
    };

    window.addEventListener('factionReputationChanged', handleFactionReputationChange as EventListener);
    
    return () => {
      window.removeEventListener('factionReputationChanged', handleFactionReputationChange as EventListener);
    };
  }, []);

  // Load quest system từ localStorage và world data
  useEffect(() => {
    const savedQuestSystem = localStorage.getItem(QUEST_SYSTEM_KEY);
    
    if (savedQuestSystem) {
      try {
        const parsed = JSON.parse(savedQuestSystem);
        // Convert dates back
        const questSystemWithDates = {
          ...parsed,
          factionReputations: parsed.factionReputations || [],
          mainQuests: parsed.mainQuests.map((quest: any) => ({
            ...quest,
            createdAt: new Date(quest.createdAt),
            completedAt: quest.completedAt ? new Date(quest.completedAt) : undefined,
            objectives: quest.objectives.map((obj: any) => ({
              ...obj,
              completedAt: obj.completedAt ? new Date(obj.completedAt) : undefined,
              unlocked: obj.unlocked !== undefined ? obj.unlocked : true // Backward compatibility
            })),
            rewards: quest.rewards.map((reward: any) => ({
              ...reward,
              claimedAt: reward.claimedAt ? new Date(reward.claimedAt) : undefined
            }))
          })),
          sideQuests: parsed.sideQuests.map((quest: any) => ({
            ...quest,
            createdAt: new Date(quest.createdAt),
            completedAt: quest.completedAt ? new Date(quest.completedAt) : undefined,
            objectives: quest.objectives.map((obj: any) => ({
              ...obj,
              completedAt: obj.completedAt ? new Date(obj.completedAt) : undefined,
              unlocked: obj.unlocked !== undefined ? obj.unlocked : true // Backward compatibility
            })),
            rewards: quest.rewards.map((reward: any) => ({
              ...reward,
              claimedAt: reward.claimedAt ? new Date(reward.claimedAt) : undefined
            }))
          })),
          factionQuests: (parsed.factionQuests || []).map((quest: any) => ({
            ...quest,
            createdAt: new Date(quest.createdAt),
            completedAt: quest.completedAt ? new Date(quest.completedAt) : undefined,
            objectives: quest.objectives.map((obj: any) => ({
              ...obj,
              completedAt: obj.completedAt ? new Date(obj.completedAt) : undefined,
              unlocked: obj.unlocked !== undefined ? obj.unlocked : true // Backward compatibility
            })),
            rewards: quest.rewards.map((reward: any) => ({
              ...reward,
              claimedAt: reward.claimedAt ? new Date(reward.claimedAt) : undefined
            }))
          })),
          questHistory: parsed.questHistory.map((quest: any) => ({
            ...quest,
            createdAt: new Date(quest.createdAt),
            completedAt: quest.completedAt ? new Date(quest.completedAt) : undefined
          }))
        };
        setQuestSystem(questSystemWithDates);
      } catch (error) {
        console.error('Lỗi load quest system:', error);
      }
    } else {
      // Nếu chưa có quest system, load từ world data
      const worldQuests = loadQuestsFromWorldData();
      if (worldQuests.mainQuests.length > 0) {
        const newQuestSystem: QuestSystem = {
          mainQuests: worldQuests.mainQuests,
          sideQuests: [], // Không load sidequest từ world data
          factionQuests: loadFactionQuests(), // Load faction quests
          currentAct: 0, // Bắt đầu từ 0 (quest mở đầu)
          totalActs: 5,
          unlockedActs: [], // Chưa unlock act nào
          questHistory: [],
          factionReputations: []
        };
        
        // Starter quest (quest đầu tiên) luôn active
        if (worldQuests.mainQuests.length > 0) {
          newQuestSystem.mainQuests[0].status = 'active';
        }
        
        setQuestSystem(newQuestSystem);
        localStorage.setItem(QUEST_SYSTEM_KEY, JSON.stringify(newQuestSystem));
      }
    }
  }, []);

  // Save quest system vào localStorage
  const saveQuestSystem = useCallback((newQuestSystem: QuestSystem) => {
    setQuestSystem(newQuestSystem);
    localStorage.setItem(QUEST_SYSTEM_KEY, JSON.stringify(newQuestSystem));
  }, []);

  // Accept quest
  const acceptQuest = useCallback((questId: string) => {
    setQuestSystem(prev => {
      const newSystem = { ...prev };
      
      // Tìm quest trong side quests (vì chỉ side quests mới cần accept)
      const questIndex = newSystem.sideQuests.findIndex(q => q.id === questId);
      if (questIndex !== -1) {
        newSystem.sideQuests[questIndex] = {
          ...newSystem.sideQuests[questIndex],
          status: 'active'
        };
      }
      
      saveQuestSystem(newSystem);
      return newSystem;
    });
  }, [saveQuestSystem]);

  // Decline quest (chỉ cho quest chưa nhận)
  const declineQuest = useCallback((questId: string) => {
    setQuestSystem(prev => {
      const newSystem = { ...prev };
      
      // Xóa quest khỏi side quests (chỉ quest chưa nhận)
      newSystem.sideQuests = newSystem.sideQuests.filter(q => q.id !== questId);
      
      saveQuestSystem(newSystem);
      return newSystem;
    });
  }, [saveQuestSystem]);

  // Decline active quest (cho quest đã nhận)
  const declineActiveQuest = useCallback((questId: string) => {
    setQuestSystem(prev => {
      const newSystem = { ...prev };
      
      // Tìm quest trong side quests
      const questIndex = newSystem.sideQuests.findIndex(q => q.id === questId);
      if (questIndex !== -1) {
        // Chuyển status thành declined thay vì xóa
        newSystem.sideQuests[questIndex] = {
          ...newSystem.sideQuests[questIndex],
          status: 'declined'
        };
        
        // Thêm vào quest history với status declined
        newSystem.questHistory.push({
          ...newSystem.sideQuests[questIndex],
          status: 'declined'
        });
      }
      
      saveQuestSystem(newSystem);
      return newSystem;
    });
  }, [saveQuestSystem]);

  // Remove declined quests from UI (xóa quest đã từ chối khỏi hiển thị)
  const removeDeclinedQuests = useCallback(() => {
    setQuestSystem(prev => {
      const newSystem = { ...prev };
      
      // Xóa quest đã declined khỏi sideQuests (chỉ giữ lại trong questHistory)
      newSystem.sideQuests = newSystem.sideQuests.filter(q => q.status !== 'declined');
      
      // Xóa quest đã declined khỏi mainQuests (chỉ giữ lại trong questHistory)
      newSystem.mainQuests = newSystem.mainQuests.filter(q => q.status !== 'declined');
      
      saveQuestSystem(newSystem);
      return newSystem;
    });
  }, [saveQuestSystem]);

  // Complete objective
  const completeObjective = useCallback((questId: string, objectiveId: string, completed: boolean) => {
    setQuestSystem(prev => {
      const newSystem = { ...prev };
      
      // Tìm quest trong main hoặc side quests
      let quest = newSystem.mainQuests.find(q => q.id === questId);
      let questList = 'mainQuests';
      let questIndex = newSystem.mainQuests.findIndex(q => q.id === questId);
      
      if (!quest) {
        quest = newSystem.sideQuests.find(q => q.id === questId);
        questList = 'sideQuests';
        questIndex = newSystem.sideQuests.findIndex(q => q.id === questId);
      }
      
      if (quest && questIndex !== -1) {
        const updatedQuest = { ...quest };
        const objectiveIndex = updatedQuest.objectives.findIndex(obj => obj.id === objectiveId);
        
        if (objectiveIndex !== -1) {
          updatedQuest.objectives[objectiveIndex] = {
            ...updatedQuest.objectives[objectiveIndex],
            completed,
            completedAt: completed ? new Date() : undefined
          };
          
          // Nếu hoàn thành objective, unlock objective tiếp theo
          if (completed && objectiveIndex < updatedQuest.objectives.length - 1) {
            const nextObjectiveIndex = objectiveIndex + 1;
            updatedQuest.objectives[nextObjectiveIndex] = {
              ...updatedQuest.objectives[nextObjectiveIndex],
              unlocked: true
            };
            console.log(`🔓 Unlocked objective: ${updatedQuest.objectives[nextObjectiveIndex].description}`);
          }
          
          // Kiểm tra xem quest có hoàn thành không
          const allObjectivesCompleted = updatedQuest.objectives.every(obj => obj.completed);
          if (allObjectivesCompleted && updatedQuest.status === 'active') {
            updatedQuest.status = 'completed';
            updatedQuest.completedAt = new Date();
            
            // Thêm vào quest history
            newSystem.questHistory.push(updatedQuest);
            
            // Unlock quest mới nếu cần
            unlockNewQuests(newSystem, updatedQuest);
          }
          
          // Cập nhật quest trong system
          if (questList === 'mainQuests') {
            newSystem.mainQuests[questIndex] = updatedQuest;
          } else {
            newSystem.sideQuests[questIndex] = updatedQuest;
            
            // Nếu là side quest, kiểm tra xem có cần tạo objective tiếp theo không
            if (updatedQuest.type === 'side' && updatedQuest._allObjectives) {
              const currentObjectiveCount = updatedQuest.objectives.length;
              const totalObjectives = updatedQuest._allObjectives.length;
              
              // Nếu vừa hoàn thành objective và còn objectives chưa tạo
              if (completed && currentObjectiveCount < totalObjectives) {
                const nextObjective = questDetectionService.generateNextObjective(updatedQuest);
                if (nextObjective) {
                  updatedQuest.objectives.push(nextObjective);
                  newSystem.sideQuests[questIndex] = updatedQuest;
                }
              }
            }
          }
        }
      }
      
      saveQuestSystem(newSystem);
      return newSystem;
    });
  }, [saveQuestSystem]);

  // Claim reward
  const claimReward = useCallback((questId: string, rewardType: string) => {
    setQuestSystem(prev => {
      if (!prev) return prev;
      const newSystem = { ...prev };
      
      // Tìm quest trong main, side hoặc faction quests
      let quest = newSystem.mainQuests.find(q => q.id === questId);
      let questList = 'mainQuests';
      let questIndex = newSystem.mainQuests.findIndex(q => q.id === questId);
      
      if (!quest) {
        quest = newSystem.sideQuests.find(q => q.id === questId);
        questList = 'sideQuests';
        questIndex = newSystem.sideQuests.findIndex(q => q.id === questId);
      }
      
      if (!quest) {
        quest = newSystem.factionQuests.find(q => q.id === questId);
        questList = 'factionQuests';
        questIndex = newSystem.factionQuests.findIndex(q => q.id === questId);
      }
      
      if (quest && questIndex !== -1) {
        const updatedQuest = { ...quest };
        const rewardIndex = updatedQuest.rewards.findIndex(reward => reward.type === rewardType);
        
        if (rewardIndex !== -1) {
          const reward = updatedQuest.rewards[rewardIndex];
          
          // Kiểm tra xem reward đã được claim chưa
          if (reward.claimed) {
            console.log('Reward đã được claim rồi');
            return newSystem;
          }
          
          // Xử lý reward theo loại
          processRewardClaim(reward);
          
          // Đánh dấu reward đã claim
          updatedQuest.rewards[rewardIndex] = {
            ...reward,
            claimed: true,
            claimedAt: new Date()
          };
          
          // Cập nhật quest trong system
          if (questList === 'mainQuests') {
            newSystem.mainQuests[questIndex] = updatedQuest;
          } else if (questList === 'sideQuests') {
            newSystem.sideQuests[questIndex] = updatedQuest;
          } else if (questList === 'factionQuests') {
            newSystem.factionQuests[questIndex] = updatedQuest;
          }
        }
      }
      
      saveQuestSystem(newSystem);
      
      // Force refresh UI bằng cách trigger re-render (sử dụng setTimeout để tránh lỗi render)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('questRewardClaimed'));
      }, 0);
      
      return newSystem;
    });
  }, [saveQuestSystem]);


  // Unlock new quests từ world data
  const unlockNewQuests = useCallback((questSystem: QuestSystem, completedQuest: QuestProgress) => {
    if (completedQuest.type === 'main') {
      let nextAct: number;
      
      // Nếu là starter quest (không có act), unlock Act 1
      if (!completedQuest.act) {
        nextAct = 1;
        console.log('🎬 Hoàn thành quest mở đầu, unlock Act 1');
      } else {
        // Nếu là main quest của act, unlock act tiếp theo
        nextAct = completedQuest.act + 1;
        console.log(`📖 Hoàn thành Act ${completedQuest.act}, unlock Act ${nextAct}`);
      }
      
      if (nextAct <= questSystem.totalActs && !questSystem.unlockedActs.includes(nextAct)) {
        questSystem.unlockedActs.push(nextAct);
        questSystem.currentAct = nextAct;
        
        // Tìm quest có sẵn trong mainQuests với status 'locked'
        const existingQuestIndex = questSystem.mainQuests.findIndex(
          quest => quest.act === nextAct && quest.status === 'locked'
        );
        
        if (existingQuestIndex !== -1) {
          // Unlock quest có sẵn
          questSystem.mainQuests[existingQuestIndex].status = 'active';
          console.log(`✅ Unlocked existing quest for Act ${nextAct}:`, questSystem.mainQuests[existingQuestIndex].title);
        } else {
          // Nếu không tìm thấy quest có sẵn, tìm từ world data
          const worldQuests = loadQuestsFromWorldData();
          const nextActQuest = worldQuests.mainQuests.find(quest => quest.act === nextAct);
          
          if (nextActQuest) {
            // Unlock quest từ world data
            nextActQuest.status = 'active';
            questSystem.mainQuests.push(nextActQuest);
            console.log(`📥 Loaded quest from world data for Act ${nextAct}:`, nextActQuest.title);
          } else {
            // Fallback: tạo quest mặc định nếu không tìm thấy
            console.warn(`⚠️ No quest found for Act ${nextAct}, creating fallback quest`);
            const newMainQuest: QuestProgress = {
              id: `main_quest_act_${nextAct}`,
              type: 'main',
              title: `Act ${nextAct} - Quest Chính`,
              description: `Nhiệm vụ chính của Act ${nextAct}`,
              status: 'active',
              act: nextAct,
              objectives: [
                {
                  id: `obj_1`,
                  description: `Hoàn thành mục tiêu Act ${nextAct}`,
                  completed: false,
                  aiKeywords: ['hoàn thành', 'xong', 'làm xong'],
                  unlocked: true
                }
              ],
              rewards: [
                {
                  type: 'experience',
                  amount: 500 * nextAct,
                  description: `Kinh nghiệm +${500 * nextAct}`,
                  claimed: false
                }
              ],
              createdAt: new Date()
            };
            
            questSystem.mainQuests.push(newMainQuest);
          }
        }
      }
    }
  }, []);

  // Add new side quest
  const addSideQuest = useCallback((quest: QuestProgress) => {
    setQuestSystem(prev => {
      const newSystem = { ...prev };
      
      // Kiểm tra duplicate trước khi add
      const isDuplicate = newSystem.sideQuests.some(q => q.id === quest.id);
      if (isDuplicate) {
        console.warn(`⚠️ Quest ${quest.id} đã tồn tại, bỏ qua việc add duplicate`);
        return prev; // Không thay đổi state
      }
      
      // Kiểm tra quest đã bị từ chối chưa (trong quest history)
      const wasDeclined = newSystem.questHistory.some(q => q.id === quest.id && q.status === 'declined');
      if (wasDeclined) {
        console.warn(`⚠️ Quest ${quest.id} đã bị từ chối trước đó, không thể nhận lại`);
        return prev; // Không thay đổi state
      }
      
      newSystem.sideQuests.push(quest);
      console.log(`✅ Added side quest: ${quest.title} (${quest.id})`);
      saveQuestSystem(newSystem);
      return newSystem;
    });
  }, [saveQuestSystem]);

  // Analyze chat input for quest completion với context đầy đủ
  const analyzeChatInput = useCallback(async (chatInput: string, sceneState?: any, additionalContext?: {
    sccContext?: any;
    storyProgress?: any;
    chatHistory?: Array<{ role: string; content: string; turn?: number }>;
    worldTime?: any;
    turnCounter?: number;
    npcRelationships?: any;
  }) => {
    const activeQuests = [
      ...questSystem.mainQuests.filter(q => q.status === 'active'),
      ...questSystem.sideQuests.filter(q => q.status === 'active')
    ];
    
    const result = await questDetectionService.analyzeQuestCompletion(chatInput, activeQuests, sceneState, additionalContext);
    
    // Auto-complete objectives
    for (const { questId, objectiveId } of result.completedObjectives) {
      completeObjective(questId, objectiveId, true);
    }
    
    return result;
  }, [questSystem, completeObjective]);

  // Generate side quest from AI response
  const generateSideQuestFromAI = useCallback(async (aiResponse: string, storyContext: any, turnCounter?: number) => {
    const newQuest = await questDetectionService.generateSideQuestFromContext(aiResponse, storyContext, turnCounter);
    if (newQuest) {
      addSideQuest(newQuest);
      return newQuest;
    }
    return null;
  }, [addSideQuest]);

  // Add next objective to side quest
  const addNextObjectiveToSideQuest = useCallback((questId: string) => {
    setQuestSystem(prev => {
      const newSystem = { ...prev };
      
      // Tìm side quest
      const questIndex = newSystem.sideQuests.findIndex(q => q.id === questId);
      if (questIndex === -1) return prev;
      
      const quest = newSystem.sideQuests[questIndex];
      
      // Tạo objective tiếp theo
      const nextObjective = questDetectionService.generateNextObjective(quest);
      if (!nextObjective) return prev;
      
      // Thêm objective mới
      newSystem.sideQuests[questIndex] = {
        ...quest,
        objectives: [...quest.objectives, nextObjective]
      };
      
      saveQuestSystem(newSystem);
      return newSystem;
    });
  }, [saveQuestSystem]);

  // Refresh quest system từ world data
  const refreshQuestsFromWorld = useCallback(() => {
    const worldQuests = loadQuestsFromWorldData();
    if (worldQuests.mainQuests.length > 0) {
      setQuestSystem(prev => {
        const newSystem = { ...prev };
        
        // Merge với quest hiện tại, tránh duplicate
        const existingMainIds = new Set(prev.mainQuests.map(q => q.id));
        
        // Thêm main quests mới
        worldQuests.mainQuests.forEach(quest => {
          if (!existingMainIds.has(quest.id)) {
            newSystem.mainQuests.push(quest);
          }
        });
        
        // Không thêm side quests từ world data - sidequest chỉ được tạo khi accept từ chat
        
        saveQuestSystem(newSystem);
        return newSystem;
      });
    }
  }, [saveQuestSystem]);


  // Tạo faction quest từ AI
  const createFactionQuestFromAI = useCallback(async (factionName: string) => {
    const newQuest = await factionQuestService.createFactionQuestFromAI(factionName);
    if (newQuest) {
      setQuestSystem(prev => {
        const newSystem = { ...prev };
        newSystem.factionQuests = [...prev.factionQuests, newQuest];
        saveQuestSystem(newSystem);
        return newSystem;
      });
      return newQuest;
    }
    return null;
  }, [saveQuestSystem]);

  // Cập nhật faction reputation
  const updateFactionReputation = useCallback((factionName: string, reputation: number) => {
    setQuestSystem(prev => {
      const newSystem = { ...prev };
      const existingIndex = newSystem.factionReputations.findIndex(fr => fr.factionName === factionName);
      
      if (existingIndex >= 0) {
        newSystem.factionReputations[existingIndex].reputation = reputation;
      } else {
        newSystem.factionReputations.push({ factionName, reputation });
      }
      
      saveQuestSystem(newSystem);
      return newSystem;
    });
  }, [saveQuestSystem]);

  // Lấy faction reputation
  const getFactionReputation = useCallback((factionName: string): number => {
    const factionRep = questSystem.factionReputations.find(fr => fr.factionName === factionName);
    return factionRep ? factionRep.reputation : 0;
  }, [questSystem.factionReputations]);

  // Đồng bộ faction reputations từ NPC service
  const syncFactionReputations = useCallback(() => {
    // Import npcRelationshipService dynamically to avoid circular dependency
    import('../services/npcRelationshipService').then(({ npcRelationshipService }) => {
      const allFactionReputations = npcRelationshipService.getAllFactionReputations();
      const factionReps = allFactionReputations.map((fr: any) => ({
        factionName: fr.factionName,
        reputation: fr.reputation
      }));
      
      setQuestSystem(prev => {
        const newSystem = { ...prev };
        newSystem.factionReputations = factionReps;
        saveQuestSystem(newSystem);
        return newSystem;
      });
    });
  }, [saveQuestSystem]);

  return {
    questSystem,
    acceptQuest,
    declineQuest,
    declineActiveQuest,
    removeDeclinedQuests,
    completeObjective,
    claimReward,
    addSideQuest,
    analyzeChatInput,
    generateSideQuestFromAI,
    addNextObjectiveToSideQuest,
    unlockNewQuests,
    refreshQuestsFromWorld,
    createFactionQuestFromAI,
    updateFactionReputation,
    getFactionReputation,
    syncFactionReputations
  };
}
