import { useState, useEffect } from 'react';
import { Play, Globe, User, ArrowRight, CheckCircle, Circle } from 'lucide-react';
import { npcRelationshipService } from '../services/npcRelationshipService';
import { MotionWrapper } from '../components/MotionWrapper';
import { HelpButton } from '../components/HelpChat/HelpButton';
import { useResponsiveContext } from '../contexts/ResponsiveContext';

type InitStep = 'world' | 'character' | 'scenario';

interface InitState {
  currentStep: InitStep;
  worldCompleted: boolean;
  characterCompleted: boolean;
  scenarioCompleted: boolean;
  worldName: string;
  characterName: string;
}

export function InitPage() {
  const { shouldUseMobileLayout } = useResponsiveContext();
  const isMobile = shouldUseMobileLayout();
  
  const [initState, setInitState] = useState<InitState>({
    currentStep: 'world',
    worldCompleted: false,
    characterCompleted: false,
    scenarioCompleted: false,
    worldName: '',
    characterName: ''
  });

  // Kiểm tra trạng thái hiện tại khi component mount
  useEffect(() => {
    const worldData = localStorage.getItem('world_gen_result');
    const characterData = localStorage.getItem('currentCharacter');
    const scenarioData = localStorage.getItem('rp_scenario');

    let worldName = '';
    let characterName = '';

    // Lấy tên thế giới
    if (worldData) {
      try {
        const worldParsed = JSON.parse(worldData);
        worldName = worldParsed.worldTitle || worldParsed.name || 'Thế giới chưa đặt tên';
      } catch (error) {
        console.error('Lỗi parse world data:', error);
        worldName = 'Thế giới chưa đặt tên';
      }
    }

    // Lấy tên nhân vật
    if (characterData) {
      try {
        const characterParsed = JSON.parse(characterData);
        characterName = characterParsed.name || characterParsed.characterName || 'Nhân vật chưa đặt tên';
      } catch (error) {
        console.error('Lỗi parse character data:', error);
        characterName = 'Nhân vật chưa đặt tên';
      }
    }

    const newState: InitState = {
      currentStep: 'world',
      worldCompleted: !!worldData,
      characterCompleted: !!characterData,
      scenarioCompleted: !!scenarioData,
      worldName,
      characterName
    };

    // Xác định bước hiện tại
    if (newState.worldCompleted && newState.characterCompleted && newState.scenarioCompleted) {
      newState.currentStep = 'scenario';
    } else if (newState.worldCompleted && newState.characterCompleted) {
      newState.currentStep = 'scenario';
    } else if (newState.worldCompleted) {
      newState.currentStep = 'character';
    }

    setInitState(newState);
  }, []);

  const steps = [
    {
      id: 'world' as InitStep,
      title: 'Tạo Thế Giới',
      description: 'Thiết lập bối cảnh, thể loại và quy tắc thế giới',
      icon: Globe,
      path: '/world-builder',
      completed: initState.worldCompleted,
      name: initState.worldName,
      disabled: false // Luôn có thể tạo thế giới
    },
    {
      id: 'character' as InitStep,
      title: 'Tạo Nhân Vật',
      description: 'Thiết kế nhân vật chính của bạn',
      icon: User,
      path: '/create-character',
      completed: initState.characterCompleted,
      name: initState.characterName,
      disabled: !initState.worldCompleted // Cần có thế giới trước
    },
    {
      id: 'scenario' as InitStep,
      title: 'Khởi Tạo Kịch Bản',
      description: 'AI sẽ tạo kịch bản mở đầu và bắt đầu game',
      icon: Play,
      path: '/game',
      completed: initState.scenarioCompleted,
      name: '',
      disabled: !initState.worldCompleted || !initState.characterCompleted // Cần có cả thế giới và nhân vật
    }
  ];

  const handleStepClick = async (step: typeof steps[0]) => {
    // Không cho phép click nếu bước bị disabled
    if (step.disabled) {
      return;
    }

    // Reset dữ liệu của các bước sau nếu cần
    if (step.id === 'world') {
      // Reset character và scenario
      localStorage.removeItem('currentCharacter');
      localStorage.removeItem('rp_scenario');
      localStorage.removeItem('rp_chat');
      localStorage.removeItem('game_turn_counter');
      localStorage.removeItem('faction_quests'); // Xóa faction quests khi reset world
      localStorage.removeItem('faction_reputations'); // Xóa faction reputations khi reset world
      localStorage.removeItem('action_suggestions'); // Xóa action suggestions khi reset world
      localStorage.removeItem('action_log'); // Xóa action log khi reset world
      localStorage.removeItem('selectedNPCForDialogue'); // Xóa selected NPC khi reset world
      localStorage.removeItem('combat_history'); // Xóa combat history khi reset world
      localStorage.removeItem('combat_result'); // Xóa combat result khi reset world
      localStorage.removeItem('merchant_shops'); // Xóa merchant shops khi reset world
      // Clear NPC relationship data when starting new world
      npcRelationshipService.clearAllData();
      
      // Clear merchant shops data when starting new world
      const { merchantService } = await import('../services/merchantService');
      merchantService.clearAllMerchantShops();
    } else if (step.id === 'character') {
      // Reset scenario
      localStorage.removeItem('rp_scenario');
      localStorage.removeItem('rp_chat');
      localStorage.removeItem('game_turn_counter');
      localStorage.removeItem('faction_quests'); // Xóa faction quests khi reset character
      localStorage.removeItem('faction_reputations'); // Xóa faction reputations khi reset character
      localStorage.removeItem('action_suggestions'); // Xóa action suggestions khi reset character
      localStorage.removeItem('action_log'); // Xóa action log khi reset character
      localStorage.removeItem('selectedNPCForDialogue'); // Xóa selected NPC khi reset character
      localStorage.removeItem('combat_history'); // Xóa combat history khi reset character
      localStorage.removeItem('combat_result'); // Xóa combat result khi reset character
      // Clear NPC relationship data when creating new character
      npcRelationshipService.clearAllData();
    }

    // Chuyển đến trang tương ứng
    window.location.href = step.path;
  };

  const getStepStatus = (step: typeof steps[0]) => {
    if (step.disabled) return 'disabled';
    if (step.completed) return 'completed';
    if (step.id === initState.currentStep) return 'current';
    return 'pending';
  };

  const getStepIcon = (step: typeof steps[0]) => {
    const status = getStepStatus(step);
    const Icon = step.icon;
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'current':
        return <Icon className="w-6 h-6 text-blue-400" />;
      case 'disabled':
        return <Icon className="w-6 h-6 text-gray-500" />;
      default:
        return <Circle className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStepColor = (step: typeof steps[0]) => {
    const status = getStepStatus(step);
    
    switch (status) {
      case 'completed':
        return 'border-green-500/50 bg-green-500/10';
      case 'current':
        return 'border-blue-500/50 bg-blue-500/10';
      case 'disabled':
        return 'border-gray-600/50 bg-gray-800/20 opacity-50';
      default:
        return 'border-gray-600/50 bg-gray-800/20';
    }
  };

  const getStepTextColor = (step: typeof steps[0]) => {
    const status = getStepStatus(step);
    
    switch (status) {
      case 'completed':
        return 'text-green-300';
      case 'current':
        return 'text-blue-300';
      case 'disabled':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
      {/* Help Button */}
      <HelpButton variant="fixed" />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <MotionWrapper
          className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className={`${isMobile ? 'text-2xl sm:text-3xl' : 'text-3xl'} font-bold-vietnamese text-white mb-2 uppercase`}>
            KHỞI TẠO GAME
          </h1>
          <p className={`${isMobile ? 'text-sm sm:text-base' : 'text-base'} text-gray-400`}>
            Theo dõi tiến trình tạo game và tiếp tục từ bước hiện tại
          </p>
        </MotionWrapper>

        {/* Progress Steps */}
        <div className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
          {steps.map((step, index) => (
            <MotionWrapper
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`glass-effect ${isMobile ? 'p-4' : 'p-6'} rounded-xl border-2 transition-all duration-200 ${
                step.disabled 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'cursor-pointer hover:scale-[1.02]'
              } ${getStepColor(step)}`}
              onClick={() => handleStepClick(step)}
            >
              <div className={`flex items-center ${isMobile ? 'flex-col sm:flex-row' : 'justify-between'}`}>
                <div className={`flex items-center ${isMobile ? 'w-full sm:w-auto' : ''} ${isMobile ? 'space-x-3' : 'space-x-4'}`}>
                  <div className="flex-shrink-0">
                    {getStepIcon(step)}
                  </div>
                  <div className={`${isMobile ? 'flex-1' : ''}`}>
                    <h3 className={`${isMobile ? 'text-lg sm:text-xl' : 'text-xl'} font-bold-vietnamese mb-1 ${getStepTextColor(step)}`}>
                      {step.title}
                    </h3>
                    <p className={`text-gray-400 ${isMobile ? 'text-xs sm:text-sm' : 'text-sm'}`}>
                      {step.description}
                    </p>
                    {step.name && (
                      <p className={`${isMobile ? 'text-xs sm:text-sm' : 'text-sm'} font-medium mt-1 ${
                        getStepStatus(step) === 'completed' 
                          ? 'text-green-300' 
                          : getStepStatus(step) === 'current'
                          ? 'text-blue-300'
                          : 'text-gray-500'
                      }`}>
                        📝 {step.name}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className={`flex items-center space-x-2 ${isMobile ? 'mt-3 sm:mt-0' : ''}`}>
                  {getStepStatus(step) === 'current' && (
                    <span className={`${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-xs'} bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded-full font-medium`}>
                      TIẾP TỤC
                    </span>
                  )}
                  {getStepStatus(step) === 'completed' && (
                    <span className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'} bg-green-500/20 border border-green-500/50 text-green-300 rounded-full font-medium ${
                      step.id === 'scenario' && initState.worldCompleted && initState.characterCompleted && initState.scenarioCompleted 
                        ? `${isMobile ? 'text-xs px-3 py-1' : 'text-sm px-4 py-2'} bg-green-500/30 border-green-400 text-green-200 font-bold` 
                        : isMobile ? 'text-xs' : 'text-xs'
                    }`}>
                      {step.id === 'scenario' && initState.worldCompleted && initState.characterCompleted && initState.scenarioCompleted 
                        ? 'CHƠI TIẾP' 
                        : 'HOÀN THÀNH'
                      }
                    </span>
                  )}
                  {getStepStatus(step) === 'disabled' && (
                    <span className={`${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-xs'} bg-gray-500/20 border border-gray-500/50 text-gray-400 rounded-full font-medium`}>
                      CHƯA SẴN SÀNG
                    </span>
                  )}
                  {!step.disabled && (
                    <ArrowRight className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-gray-400`} />
                  )}
                </div>
              </div>
            </MotionWrapper>
          ))}
        </div>

        {/* Status Summary */}
        <MotionWrapper
          className={`${isMobile ? 'mt-6' : 'mt-8'} glass-effect ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-gray-700/50`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-white mb-4`}>Trạng thái hiện tại:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                initState.worldCompleted ? 'bg-green-400' : 'bg-gray-500'
              }`}></div>
              <p className="text-sm text-gray-300">Thế giới</p>
            </div>
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                initState.characterCompleted ? 'bg-green-400' : 'bg-gray-500'
              }`}></div>
              <p className="text-sm text-gray-300">Nhân vật</p>
            </div>
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                initState.scenarioCompleted ? 'bg-green-400' : 'bg-gray-500'
              }`}></div>
              <p className="text-sm text-gray-300">Kịch bản</p>
            </div>
          </div>
        </MotionWrapper>

        {/* Help Text */}
        <MotionWrapper
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p className="text-sm text-gray-500">
            💡 Nếu bạn đang ở giữa quá trình tạo game và bị chuyển hướng, 
            hãy nhấn vào bước hiện tại để tiếp tục. Lưu ý: việc quay lại các bước trước có thể reset dữ liệu đã nhập.
          </p>
        </MotionWrapper>
      </div>
    </div>
  );
}
