import { useNavigate } from 'react-router-dom';
import { 
  Sword, 
  Sparkles, 
  Users, 
  Zap, 
  Star,
  ArrowRight,
  Play
} from 'lucide-react';
import { MotionWrapper } from '../components/MotionWrapper';
import { npcRelationshipService } from '../services/npcRelationshipService';

export function HomePage() {
  const navigate = useNavigate();

  const handleStartGame = async () => {
    // Reset game data nhưng giữ lại save slots và API keys
    const keysToRemove = [
      'rp_chat',
      'rp_scenario', 
      'game_turn_counter',
      'rp_summary_indexed',
      'rp_scene_state',
      'world_gen_result',
      'currentCharacter',
      'scc_context',
      'scc_summary_backup',
      'quest_system', // Xóa quest system khi reset game
      'faction_quests', // Xóa faction quests khi reset game
      'faction_reputations', // Xóa faction reputations khi reset game
      'player_location', // Xóa player location khi reset game
      'game_inventory', // Xóa inventory khi reset game
      'game_equipment', // Xóa equipment khi reset game
      'merchant_shops', // Xóa merchant shops khi reset game
      // World Builder keys
      'completeWorldData',
      'currentWorldData',
      'currentWorldDescription',
      'worldTitle',
      'rp_summary'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear NPC relationship data
    npcRelationshipService.clearAllData();
    
    // Clear merchant shops data
    const { merchantService } = await import('../services/merchantService');
    merchantService.clearAllMerchantShops();
    
    // Clear selected NPC for dialogue
    localStorage.removeItem('selectedNPCForDialogue');
    
    // Clear combat history
    localStorage.removeItem('combat_history');
    localStorage.removeItem('combat_result');
    
    
    // Bắt đầu flow game: Init Page → World Builder → Character Creation → Game
    navigate('/init');
  };

  const features = [
    {
      icon: Sparkles,
      title: 'AI THÔNG MINH',
      description: 'Trải nghiệm cuộc trò chuyện tự nhiên với AI được huấn luyện đặc biệt cho game roleplay.'
    },
    {
      icon: Users,
      title: 'NHÂN VẬT ĐA DẠNG',
      description: 'Tạo nhân vật với nhiều chủng tộc, nghề nghiệp và ngoại hình khác nhau.'
    },
    {
      icon: Zap,
      title: 'CỐT TRUYỆN ĐỘNG',
      description: 'Mỗi lần chơi đều có cốt truyện mới, được AI tạo ra dựa trên hành động của bạn.'
    },
    {
      icon: Star,
      title: 'HỆ THỐNG TIẾN BỘ',
      description: 'Phát triển nhân vật, hoàn thành nhiệm vụ và khám phá thế giới rộng lớn.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <MotionWrapper 
        className="text-center py-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="mb-8">
          <MotionWrapper 
            className="w-24 h-24 mx-auto mb-6 bg-primary-500 rounded-full flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Sword className="w-12 h-12 text-white" />
          </MotionWrapper>
          
          <h1 className="text-6xl font-extrabold-vietnamese text-white mb-6 uppercase">
            THẾ GIỚI HUYỀN BÍ
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Khám phá một thế giới fantasy đầy bí ẩn, nơi mỗi quyết định của bạn sẽ định hình câu chuyện. 
            Trải nghiệm game roleplay với AI thông minh, tạo ra những cuộc phiêu lưu độc đáo và không bao giờ lặp lại.
          </p>
        </div>
        
        <div className="flex justify-center">
          <button 
            onClick={handleStartGame}
            className="btn-primary inline-flex items-center space-x-3 text-lg px-8 py-4 bg-primary-500 hover:bg-primary-600 transform hover:scale-105 transition-all duration-200"
          >
            <Play className="w-6 h-6" />
            <span>BẮT ĐẦU CHƠI MỚI</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </MotionWrapper>

      {/* Features Section */}
      <MotionWrapper 
        className="py-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold-vietnamese text-white mb-4 uppercase">
            TÍNH NĂNG NỔI BẬT
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Khám phá những tính năng độc đáo làm cho trải nghiệm game của bạn trở nên đặc biệt
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <MotionWrapper
                key={feature.title}
                className="glass-effect p-6 rounded-xl card-hover"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold-vietnamese text-white mb-3 uppercase">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </MotionWrapper>
            );
          })}
        </div>
      </MotionWrapper>
    </div>
  );
}
