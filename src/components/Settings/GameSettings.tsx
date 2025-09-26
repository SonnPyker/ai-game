import { motion } from 'framer-motion';
import { Gamepad2, Zap } from 'lucide-react';

export function GameSettings() {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Game Settings */}
      <motion.div
        className="glass-effect p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Cài Đặt Game</h3>
            <p className="text-sm text-gray-300">Tùy chỉnh trải nghiệm chơi game</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Âm Thanh</h4>
              <p className="text-sm text-gray-300">Bật/tắt âm thanh trong game</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Animations</h4>
              <p className="text-sm text-gray-300">Bật/tắt hiệu ứng chuyển động</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Auto-save</h4>
              <p className="text-sm text-gray-300">Tự động lưu tiến trình game</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Dark Mode</h4>
              <p className="text-sm text-gray-300">Giao diện tối (luôn bật)</p>
            </div>
            <div className="flex items-center space-x-2 text-green-400">
              <Zap className="w-4 h-4" />
              <span className="text-sm">Đã bật</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Performance Settings */}
      <motion.div
        className="glass-effect p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h3 className="text-xl font-semibold text-white mb-4">Cài Đặt Hiệu Suất</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Chất Lượng Đồ Họa</h4>
              <p className="text-sm text-gray-300">Điều chỉnh chất lượng hiển thị</p>
            </div>
            <select className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="high">Cao</option>
              <option value="medium" selected>Trung bình</option>
              <option value="low">Thấp</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Giới Hạn FPS</h4>
              <p className="text-sm text-gray-300">Giới hạn khung hình mỗi giây</p>
            </div>
            <select className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="60" selected>60 FPS</option>
              <option value="120">120 FPS</option>
              <option value="unlimited">Không giới hạn</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Data Management */}
      <motion.div
        className="glass-effect p-6 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="text-xl font-semibold text-white mb-4">Quản Lý Dữ Liệu</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Lưu Game Tự Động</h4>
              <p className="text-sm text-gray-300">Tự động lưu sau mỗi 5 turn</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
