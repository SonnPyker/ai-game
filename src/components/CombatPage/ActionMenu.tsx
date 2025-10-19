import { useState, useRef, useEffect } from 'react';
import { MotionWrapper, MotionButton } from '../MotionWrapper';
import { 
  Sword, 
  Shield, 
  Package, 
  ArrowRight, 
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Menu
} from 'lucide-react';
import { Combatant } from '../../services/combatService';
import { CharacterSkill } from '../../types';
import { useResponsiveContext } from '../../contexts/ResponsiveContext';

interface ActionMenuProps {
  combatant: Combatant | null;
  enemies: Combatant[];
  onAttack: (attackIndex: number, targetId?: string) => void;
  onDefend: () => void;
  onUseItem?: (itemId: string, targetId?: string) => void;
  onInventory?: () => void;
  onSkills?: () => void;
  onEndTurn?: () => void;
  onRun: () => void;
  isProcessing: boolean;
  selectedTarget?: string | null;
  onSelectTarget: (targetId: string | null) => void;
  canEndTurn?: boolean;
  mainActionUsed?: boolean;
  extraActionUsed?: boolean;
  skillActionUsed?: boolean;
  skills?: CharacterSkill[];
  temporaryPlayerStats?: any; // TemporaryPlayerStats
}

export function ActionMenu({
  combatant,
  enemies,
  onAttack,
  onDefend,
  onUseItem: _onUseItem,
  onInventory,
  onSkills,
  onEndTurn: _onEndTurn,
  onRun,
  isProcessing,
  selectedTarget,
  onSelectTarget,
  canEndTurn = false,
  mainActionUsed = false,
  extraActionUsed = false,
  skillActionUsed = false,
  skills = [],
  temporaryPlayerStats
}: ActionMenuProps) {
  
  // Function to calculate combined damage display
  const getCombinedDamage = (baseDamage: string, damageBonus?: string): string => {
    // Chỉ hiển thị damageBonus nếu nó có giá trị thực sự (từ status effects)
    if (!damageBonus || damageBonus.trim() === '') return baseDamage;
    return `${baseDamage} + ${damageBonus}`;
  };
  // All hooks must be called at the top level
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Touch gesture refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);

  // Use responsive context instead of window width detection
  const { getEffectiveUIMode } = useResponsiveContext();
  const isMobileMode = getEffectiveUIMode() === 'mobile';
  
  
  // Default to expanded (open) on both mobile and desktop
  useEffect(() => {
    setIsCollapsed(false);
  }, [isMobileMode]);

  // Toggle collapse function
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
      }
    };
  }, []);

  // Early return after all hooks
  if (!combatant) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
        <p className="text-gray-400">Không có dữ liệu combatant</p>
      </div>
    );
  }

  const handleAttack = (attackIndex: number) => {
    if (enemies.length === 1) {
      // Auto-select single enemy
      onAttack(attackIndex, enemies[0].id);
    } else if (selectedTarget) {
      // Use selected target
      onAttack(attackIndex, selectedTarget);
    } else {
      // Let user select target
      onAttack(attackIndex);
    }
  };

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent, _attackIndex: number) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Long press for target selection
    longPressRef.current = setTimeout(() => {
      if (enemies.length > 1) {
        onSelectTarget(enemies[0].id); // Select first enemy on long press
      }
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent, attackIndex: number) => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }

    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const deltaTime = Date.now() - touchStartRef.current.time;

    // If it's a tap (not a swipe) and not a long press
    if (deltaX < 10 && deltaY < 10 && deltaTime < 500) {
      handleAttack(attackIndex);
    }

    touchStartRef.current = null;
  };

  const handleTouchCancel = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    touchStartRef.current = null;
  };

  // Get action button class based on state
  const getActionButtonClass = (disabled: boolean, isMainAction: boolean) => {
    const baseClass = "flex items-center space-x-2 p-2 lg:p-3 rounded-lg transition-all duration-200 font-medium";
    
    if (disabled) {
      return `${baseClass} bg-gray-700 text-gray-500 cursor-not-allowed opacity-50`;
    }
    
    if (isMainAction && mainActionUsed) {
      return `${baseClass} bg-gray-700 text-gray-500 cursor-not-allowed opacity-50`;
    }
    
    if (isMainAction) {
      return `${baseClass} bg-gray-600 hover:bg-gray-500 text-white hover:shadow-lg transform hover:scale-105`;
    }
    
    return `${baseClass} bg-gray-700 hover:bg-gray-600 text-white hover:shadow-lg transform hover:scale-105`;
  };

  // Get consumable items from inventory

  return (
    <div className="space-y-1 lg:space-y-2">
      {/* Action Menu Header with Toggle (only on mobile) */}
      {isMobileMode && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Menu className="w-5 h-5 mr-2" />
            Hành Động
          </h3>
          <button
            onClick={toggleCollapse}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            title={isCollapsed ? "Mở rộng menu hành động" : "Thu gọn menu hành động"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      )}

      {/* Action Buttons - Collapsible only on mobile */}
      {isMobileMode ? (
        <div className="space-y-4">
          {!isCollapsed ? (
          <MotionWrapper
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              height: 'auto',
              opacity: 1
            }}
            exit={{ 
              height: 0,
              opacity: 0
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-4">
              {/* Main Actions Section */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-1 lg:mb-2">Hành động chính:</h4>
                <div className="grid grid-cols-1 gap-1">
                  {/* Attack Actions */}
                  {combatant.attacks.map((attack, index) => (
                    <MotionButton
                      key={index}
                      data-attack-index={index}
                      onClick={() => handleAttack(index)}
                      onTouchStart={(e: React.TouchEvent) => handleTouchStart(e, index)}
                      onTouchEnd={(e: React.TouchEvent) => handleTouchEnd(e, index)}
                      onTouchCancel={handleTouchCancel}
                      disabled={isProcessing || enemies.length === 0 || mainActionUsed}
                      className={getActionButtonClass(isProcessing || enemies.length === 0, true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Sword className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium">{attack.name}</div>
                        <div className="text-xs text-gray-400">
                          +{attack.attackBonus} to hit, {getCombinedDamage(attack.damage, temporaryPlayerStats?.damageBonus)}
                        </div>
                      </div>
                    </MotionButton>
                  ))}

                  {/* Defend Action */}
                  <MotionButton
                    onClick={onDefend}
                    disabled={isProcessing || mainActionUsed}
                    className={getActionButtonClass(isProcessing, true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Shield className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Phòng Thủ</div>
                      <div className="text-xs text-gray-400">
                        Giảm 50% sát thương nhận vào
                      </div>
                    </div>
                  </MotionButton>
                </div>
              </div>

              {/* Extra Actions Section */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-1 lg:mb-2">Hành động phụ (tùy chọn):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Inventory Action */}
                  <MotionButton
                    onClick={onInventory}
                    disabled={isProcessing || extraActionUsed}
                    className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium ${
                      extraActionUsed 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-105'
                    }`}
                    whileHover={extraActionUsed ? {} : { scale: 1.02 }}
                    whileTap={extraActionUsed ? {} : { scale: 0.98 }}
                  >
                    <Package className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Túi Đồ</div>
                      <div className="text-xs text-blue-200">
                        Mở túi đồ
                      </div>
                    </div>
                  </MotionButton>

                  {/* Skills Action */}
                  <MotionButton
                    onClick={onSkills}
                    disabled={isProcessing}
                    className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium ${
                      skillActionUsed 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50' 
                        : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-lg transform hover:scale-105'
                    }`}
                    whileHover={skillActionUsed ? {} : { scale: 1.02 }}
                    whileTap={skillActionUsed ? {} : { scale: 0.98 }}
                    title={`Kỹ năng có sẵn: ${skills.length}`}
                  >
                    <Sword className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Kỹ Năng</div>
                      <div className="text-xs text-purple-200">
                        {skillActionUsed ? 'Đã sử dụng' : (skills.length > 0 ? `${skills.length} kỹ năng` : 'Chưa có kỹ năng')}
                      </div>
                    </div>
                  </MotionButton>
                </div>
              </div>
            </div>
          </MotionWrapper>
          ) : null}

          {/* Bottom Actions - Always visible on mobile */}
          <div className="flex flex-col gap-2 pb-4">
            {/* End Turn Action */}
            <MotionButton
              onClick={_onEndTurn}
              disabled={isProcessing || !canEndTurn}
              className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium ${
                !canEndTurn
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                  : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-lg transform hover:scale-105'
              }`}
              whileHover={!canEndTurn ? {} : { scale: 1.02 }}
              whileTap={!canEndTurn ? {} : { scale: 0.98 }}
            >
              <RotateCcw className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Kết Thúc Lượt</div>
                <div className="text-xs text-gray-300">
                  {!canEndTurn ? 'Cần dùng hành động chính' : 'Chuyển lượt'}
                </div>
              </div>
            </MotionButton>

            {/* Run Action */}
            <MotionButton
              onClick={onRun}
              disabled={isProcessing}
              className="flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium bg-red-700 hover:bg-red-600 text-white hover:shadow-lg transform hover:scale-105"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ArrowRight className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Chạy Trốn</div>
                <div className="text-xs text-gray-300">
                  Thoát khỏi combat
                </div>
              </div>
            </MotionButton>
          </div>
        </div>
      ) : (
        /* Desktop Layout - Always visible */
        <div className="space-y-1 lg:space-y-2">
          {/* Main Actions Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-1 lg:mb-2">Hành động chính:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
              {/* Attack Actions */}
              {combatant.attacks.map((attack, index) => (
                <MotionButton
                  key={index}
                  data-attack-index={index}
                  onClick={() => handleAttack(index)}
                  onTouchStart={(e: React.TouchEvent) => handleTouchStart(e, index)}
                  onTouchEnd={(e: React.TouchEvent) => handleTouchEnd(e, index)}
                  onTouchCancel={handleTouchCancel}
                  disabled={isProcessing || enemies.length === 0 || mainActionUsed}
                  className={getActionButtonClass(isProcessing || enemies.length === 0, true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Sword className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">{attack.name}</div>
                    <div className="text-xs text-gray-400">
                      +{attack.attackBonus} to hit, {getCombinedDamage(attack.damage, temporaryPlayerStats?.damageBonus)}
                    </div>
                  </div>
                </MotionButton>
              ))}

              {/* Defend Action */}
              <MotionButton
                onClick={onDefend}
                disabled={isProcessing || mainActionUsed}
                className={getActionButtonClass(isProcessing, true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Shield className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Phòng Thủ</div>
                  <div className="text-xs text-gray-400">
                    Giảm 50% sát thương nhận vào
                  </div>
                </div>
              </MotionButton>
            </div>
          </div>


          {/* Extra Actions Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-1 lg:mb-2">Hành động phụ (tùy chọn):</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
              {/* Inventory Action */}
              <MotionButton
                onClick={onInventory}
                disabled={isProcessing || extraActionUsed}
                className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium ${
                  extraActionUsed 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-105'
                }`}
                whileHover={extraActionUsed ? {} : { scale: 1.02 }}
                whileTap={extraActionUsed ? {} : { scale: 0.98 }}
              >
                <Package className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Túi Đồ</div>
                  <div className="text-xs text-blue-200">
                    Mở túi đồ
                  </div>
                </div>
              </MotionButton>

              {/* Skills Action */}
              <MotionButton
                onClick={onSkills}
                disabled={isProcessing}
                className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium ${
                  skillActionUsed 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-lg transform hover:scale-105'
                }`}
                whileHover={skillActionUsed ? {} : { scale: 1.02 }}
                whileTap={skillActionUsed ? {} : { scale: 0.98 }}
                title={`Kỹ năng có sẵn: ${skills.length}`}
              >
                <Sword className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Kỹ Năng</div>
                  <div className="text-xs text-purple-200">
                    {skillActionUsed ? 'Đã sử dụng' : (skills.length > 0 ? `${skills.length} kỹ năng` : 'Chưa có kỹ năng')}
                  </div>
                </div>
              </MotionButton>
            </div>
          </div>

          {/* Bottom Actions - Run and End Turn */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Run Action */}
            <MotionButton
              onClick={onRun}
              disabled={isProcessing}
              className="flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium bg-red-700 hover:bg-red-600 text-white hover:shadow-lg transform hover:scale-105 flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ArrowRight className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Chạy Trốn</div>
                <div className="text-xs text-gray-300">
                  Thoát khỏi combat
                </div>
              </div>
            </MotionButton>

            {/* End Turn Action */}
            <MotionButton
              onClick={_onEndTurn}
              disabled={isProcessing || !canEndTurn}
              className={`flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium flex-1 ${
                !canEndTurn
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                  : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-lg transform hover:scale-105'
              }`}
              whileHover={!canEndTurn ? {} : { scale: 1.02 }}
              whileTap={!canEndTurn ? {} : { scale: 0.98 }}
            >
              <RotateCcw className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Kết Thúc Lượt</div>
                <div className="text-xs text-gray-300">
                  {!canEndTurn ? 'Cần dùng hành động chính' : 'Chuyển lượt'}
                </div>
              </div>
            </MotionButton>
          </div>

        </div>
      )}



      {/* Processing Indicator */}
      {isProcessing && (
        <MotionWrapper
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-blue-900/20 border border-blue-400/50 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2">
            <MotionWrapper
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RotateCcw className="w-4 h-4 text-blue-400" />
            </MotionWrapper>
            <span className="text-sm text-blue-300">
              Đang xử lý hành động...
            </span>
          </div>
        </MotionWrapper>
      )}

      {/* No Enemies Warning */}
      {enemies.length === 0 && (
        <MotionWrapper
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-900/20 border border-yellow-400/50 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-300">
              Không có kẻ thù để tấn công
            </span>
          </div>
        </MotionWrapper>
      )}

    </div>
  );
}