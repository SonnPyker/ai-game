import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sword, 
  Shield, 
  Zap, 
  Package, 
  ArrowRight, 
  Target,
  RotateCcw,
  AlertTriangle,
  X
} from 'lucide-react';
import { Combatant } from '../../services/combatService';

interface ActionMenuProps {
  combatant: Combatant | null;
  enemies: Combatant[];
  onAttack: (attackIndex: number, targetId?: string) => void;
  onDefend: () => void;
  onUseItem?: (itemId: string, targetId?: string) => void;
  onRun: () => void;
  isProcessing: boolean;
  selectedTarget?: string | null;
  onSelectTarget: (targetId: string | null) => void;
}

export function ActionMenu({
  combatant,
  enemies,
  onAttack,
  onDefend,
  onUseItem,
  onRun,
  isProcessing,
  selectedTarget,
  onSelectTarget
}: ActionMenuProps) {
  const [showTargetSelection, setShowTargetSelection] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'attack';
    attackIndex: number;
  } | null>(null);

  if (!combatant) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
        <p className="text-gray-400">Không có dữ liệu combatant</p>
      </div>
    );
  }

  const handleAttack = (attackIndex: number) => {
    if (enemies.length === 0) return;
    
    if (enemies.length === 1) {
      // Only one enemy, attack directly
      onAttack(attackIndex, enemies[0].id);
    } else {
      // Multiple enemies, show target selection
      setPendingAction({ type: 'attack', attackIndex });
      setShowTargetSelection(true);
    }
  };

  const handleTargetSelect = (targetId: string) => {
    if (pendingAction?.type === 'attack') {
      onAttack(pendingAction.attackIndex, targetId);
    }
    setPendingAction(null);
    setShowTargetSelection(false);
    onSelectTarget(null);
  };

  const handleCancelTargetSelection = () => {
    setPendingAction(null);
    setShowTargetSelection(false);
    onSelectTarget(null);
  };

  const getActionButtonClass = (isDisabled: boolean = false) => {
    const baseClass = "flex items-center justify-center space-x-2 p-4 rounded-lg transition-all duration-200 font-medium";
    
    if (isDisabled) {
      return `${baseClass} bg-gray-700 text-gray-500 cursor-not-allowed`;
    }
    
    return `${baseClass} bg-gray-700 hover:bg-gray-600 text-white hover:shadow-lg transform hover:scale-105`;
  };

  return (
    <div className="space-y-4">
      {/* Target Selection Modal */}
      {showTargetSelection && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCancelTargetSelection}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Chọn Mục Tiêu
            </h3>
            
            <div className="space-y-2">
              {enemies.map((enemy) => (
                <button
                  key={enemy.id}
                  onClick={() => handleTargetSelect(enemy.id)}
                  className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{enemy.name}</div>
                      <div className="text-sm text-gray-400">
                        HP: {enemy.health.current}/{enemy.health.max} | AC: {enemy.armorClass}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
            
            <button
              onClick={handleCancelTargetSelection}
              className="w-full mt-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              Hủy
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Attack Actions */}
        {combatant.attacks.map((attack, index) => (
          <motion.button
            key={index}
            onClick={() => handleAttack(index)}
            disabled={isProcessing || enemies.length === 0}
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
          </motion.button>
        ))}

        {/* Defend Action */}
        <motion.button
          onClick={onDefend}
          disabled={isProcessing}
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
        </motion.button>

        {/* Use Item Action */}
        <motion.button
          onClick={() => onUseItem?.('', '')}
          disabled={isProcessing}
          className={getActionButtonClass(isProcessing)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Package className="w-5 h-5" />
          <div className="text-left">
            <div className="font-medium">Sử Dụng Đồ</div>
            <div className="text-xs text-gray-400">
              Mở túi đồ
            </div>
          </div>
        </motion.button>

        {/* Run Action */}
        <motion.button
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
        </motion.button>
      </div>

      {/* Selected Target Display */}
      {selectedTarget && (
        <motion.div
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
        </motion.div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-blue-900/20 border border-blue-400/50 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RotateCcw className="w-4 h-4 text-blue-400" />
            </motion.div>
            <span className="text-sm text-blue-300">
              Đang xử lý hành động...
            </span>
          </div>
        </motion.div>
      )}

      {/* No Enemies Warning */}
      {enemies.length === 0 && (
        <motion.div
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
        </motion.div>
      )}
    </div>
  );
}
