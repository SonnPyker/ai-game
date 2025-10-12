import { useState, useRef, useEffect } from 'react';
import { MotionWrapper, MotionButton } from '../MotionWrapper';
import { 
  Sword, 
  Shield, 
  Package, 
  ArrowRight, 
  RotateCcw,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Menu,
  Target,
  Zap
} from 'lucide-react';
import { Combatant } from '../../services/combatService';
import { useResponsiveContext } from '../../contexts/ResponsiveContext';

interface ActionMenuProps {
  combatant: Combatant | null;
  enemies: Combatant[];
  onAttack: (attackIndex: number, targetId?: string) => void;
  onDefend: () => void;
  onUseItem?: (itemId: string, targetId?: string) => void;
  onInventory?: () => void;
  onEndTurn?: () => void;
  onRun: () => void;
  isProcessing: boolean;
  selectedTarget?: string | null;
  onSelectTarget: (targetId: string | null) => void;
  hasPerformedAction?: boolean;
  canEndTurn?: boolean;
}

export function ActionMenu({
  combatant,
  enemies,
  onAttack,
  onDefend,
  onUseItem: _onUseItem,
  onInventory,
  onEndTurn: _onEndTurn,
  onRun,
  isProcessing,
  selectedTarget,
  onSelectTarget,
  hasPerformedAction = false
}: ActionMenuProps) {
  // All hooks must be called at the top level
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Touch gesture refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);

  // Use responsive context instead of window width detection
  const { getEffectiveUIMode } = useResponsiveContext();
  const isMobileMode = getEffectiveUIMode() === 'mobile';
  
  // Auto-collapse only on mobile mode by default
  useEffect(() => {
    if (isMobileMode) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
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
    if (enemies.length === 0 || isProcessing || hasPerformedAction) return;
    
    // Add immediate visual feedback
    const button = document.querySelector(`[data-attack-index="${attackIndex}"]`) as HTMLElement;
    if (button) {
      // Check if button is already disabled
      if (button.style.pointerEvents === 'none') return;
      
      button.style.transform = 'scale(0.95)';
      button.style.opacity = '0.7';
      button.style.pointerEvents = 'none';
      
      setTimeout(() => {
        button.style.transform = '';
        button.style.opacity = '';
      }, 150);
      
      // Keep disabled for longer to prevent rapid clicks
      setTimeout(() => {
        button.style.pointerEvents = '';
      }, 2000);
    }
    
    if (!selectedTarget) {
      // No target selected, show message
      console.log('Please select a target first by clicking on an enemy card');
      return;
    }
    
    // Execute attack with selected target
    onAttack(attackIndex, selectedTarget);
  };


  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent, attackIndex: number) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Long press detection
    longPressRef.current = setTimeout(() => {
      // Show attack details on long press
      const attack = combatant.attacks[attackIndex];
      if (attack) {
        alert(`${attack.name}\nAttack Bonus: +${attack.attackBonus}\nDamage: ${attack.damage}`);
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
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Check for swipe gestures
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50 && deltaTime < 300) {
      // Swipe left/right to cycle through attacks
      if (deltaX > 0) {
        // Swipe right - next attack
        const nextIndex = (attackIndex + 1) % combatant.attacks.length;
        handleAttack(nextIndex);
      } else {
        // Swipe left - previous attack
        const prevIndex = attackIndex === 0 ? combatant.attacks.length - 1 : attackIndex - 1;
        handleAttack(prevIndex);
      }
    } else if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30 && deltaTime < 200) {
      // Tap - normal attack
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

  const getActionButtonClass = (isDisabled: boolean = false) => {
    const baseClass = "flex items-center justify-center space-x-2 p-3 sm:p-4 rounded-lg transition-all duration-200 font-medium text-sm sm:text-base";
    
    if (isDisabled || hasPerformedAction) {
      return `${baseClass} bg-gray-700 text-gray-500 cursor-not-allowed opacity-50`;
    }
    
    return `${baseClass} bg-gray-700 hover:bg-gray-600 text-white hover:shadow-lg transform hover:scale-105`;
  };

  return (
    <div className="space-y-4">
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
        <MotionWrapper
          initial={false}
          animate={{ 
            height: isCollapsed ? 0 : 'auto',
            opacity: isCollapsed ? 0 : 1
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="grid grid-cols-1 gap-2">
        {/* Attack Actions */}
        {combatant.attacks.map((attack, index) => (
          <MotionButton
            key={index}
            data-attack-index={index}
            onClick={() => handleAttack(index)}
            onTouchStart={(e: React.TouchEvent) => handleTouchStart(e, index)}
            onTouchEnd={(e: React.TouchEvent) => handleTouchEnd(e, index)}
            onTouchCancel={handleTouchCancel}
            disabled={isProcessing || enemies.length === 0 || hasPerformedAction}
            className={getActionButtonClass(isProcessing || enemies.length === 0)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sword className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">{attack.name}</div>
              <div className="text-xs text-gray-400">
                +{attack.attackBonus} to hit, {attack.damage}
              </div>
            </div>
          </MotionButton>
        ))}

        {/* Defend Action */}
        <MotionButton
          onClick={onDefend}
          disabled={isProcessing || hasPerformedAction}
          className={getActionButtonClass(isProcessing)}
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

        {/* Inventory Action - Changed from Use Item to Inventory */}
        <MotionButton
          onClick={onInventory}
          disabled={isProcessing || hasPerformedAction}
          className={`
            flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium
            ${hasPerformedAction 
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50' 
              : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-105'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Package className="w-5 h-5" />
          <div className="text-left">
            <div className="font-medium">Túi Đồ</div>
            <div className="text-xs text-blue-200">
              Mở túi đồ
            </div>
          </div>
        </MotionButton>

        {/* Run Action */}
        <MotionButton
          onClick={onRun}
          disabled={isProcessing}
          className={`
            flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium
            bg-red-700 hover:bg-red-600 text-white hover:shadow-lg transform hover:scale-105
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
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
        </MotionWrapper>
      ) : (
        /* Desktop Layout - Always visible */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {/* Attack Actions */}
          {combatant.attacks.map((attack, index) => (
            <MotionButton
              key={index}
              data-attack-index={index}
              onClick={() => handleAttack(index)}
              onTouchStart={(e: React.TouchEvent) => handleTouchStart(e, index)}
              onTouchEnd={(e: React.TouchEvent) => handleTouchEnd(e, index)}
              onTouchCancel={handleTouchCancel}
              disabled={isProcessing || enemies.length === 0 || hasPerformedAction}
              className={getActionButtonClass(isProcessing || enemies.length === 0)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sword className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">{attack.name}</div>
                <div className="text-xs text-gray-400">
                  +{attack.attackBonus} to hit, {attack.damage}
                </div>
              </div>
            </MotionButton>
          ))}

          {/* Defend Action */}
          <MotionButton
            onClick={onDefend}
            disabled={isProcessing || hasPerformedAction}
            className={getActionButtonClass(isProcessing)}
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

          {/* Inventory Action */}
          <MotionButton
            onClick={onInventory}
            disabled={isProcessing || hasPerformedAction}
            className={`
              flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium
              ${hasPerformedAction 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50' 
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg transform hover:scale-105'
              }
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Package className="w-5 h-5" />
            <div className="text-left">
              <div className="font-medium">Túi Đồ</div>
              <div className="text-xs text-blue-200">
                Mở túi đồ
              </div>
            </div>
          </MotionButton>

          {/* Run Action */}
          <MotionButton
            onClick={onRun}
            disabled={isProcessing}
            className={`
              flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium
              bg-red-700 hover:bg-red-600 text-white hover:shadow-lg transform hover:scale-105
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
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
      )}

      {/* Quick Actions Bar - Only when collapsed on mobile */}
      {isMobileMode && isCollapsed && (
        <MotionWrapper
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-lg p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Hành động nhanh:</span>
            </div>
            <div className="flex items-center space-x-2">
              {/* Quick Attack Button */}
              {combatant.attacks.length > 0 && (
                <button
                  onClick={() => handleAttack(0)}
                  disabled={isProcessing || enemies.length === 0 || hasPerformedAction}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors text-sm"
                >
                  <Sword className="w-4 h-4" />
                  <span>{combatant.attacks[0].name}</span>
                </button>
              )}
              
              {/* Quick Defend Button */}
              <button
                onClick={onDefend}
                disabled={isProcessing || hasPerformedAction}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors text-sm"
              >
                <Shield className="w-4 h-4" />
                <span>Phòng thủ</span>
              </button>
            </div>
          </div>
        </MotionWrapper>
      )}

      {/* Status Indicators - Always Visible */}
      {/* Selected Target Display */}
      {selectedTarget && (
        <MotionWrapper
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-900/20 border border-yellow-400/50 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-300">
              Mục tiêu đã chọn: {enemies.find(e => e.id === selectedTarget)?.name}
            </span>
            <button
              onClick={() => onSelectTarget(null)}
              className="ml-auto text-yellow-400 hover:text-yellow-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </MotionWrapper>
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-green-900/20 border border-green-400/50 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-300">
              Tất cả kẻ thù đã bị đánh bại!
            </span>
          </div>
        </MotionWrapper>
      )}
    </div>
  );
}
