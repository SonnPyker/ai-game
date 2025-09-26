import { motion } from 'framer-motion';
import { Package, Calendar, Code, GitBranch } from 'lucide-react';

export function VersionInfo() {
  const version = "1.1.0";
  const now = new Date();
  const buildDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  const lastUpdate = now.toISOString().split('T')[0]; // YYYY-MM-DD format

  const updateLog = [
    {
      version: "1.1.0",
      date: now.toISOString().split('T')[0],
      changes: [
        "🎨 Loại bỏ hoàn toàn UI gradient, chuyển sang flat colors",
        "🗂️ Tách riêng Settings thành 3 tab: API Keys, Game Settings, Version & Info",
        "🎮 Thêm Game Settings với cài đặt âm thanh, hiệu suất, quản lý dữ liệu",
        "🔧 Cải thiện hệ thống quản lý API keys",
        "📱 Tối ưu hóa responsive design",
        "🎯 Loại bỏ nút 'Chơi mới' khỏi sidebar, chỉ bắt đầu từ trang chủ",
        "🔄 Cải thiện cơ chế refresh trang với các trường hợp ngoại lệ",
        "🔤 Cập nhật font chữ sang 'SVN-Determination Sans'",
        "📊 Tăng kích thước font chữ thường lên 16px",
        "🐛 Sửa lỗi TypeScript và tối ưu hóa build"
      ]
    },
    {
      version: "1.0.0",
      date: "2024-01-15",
      changes: [
        "🎮 Phát hành phiên bản đầu tiên",
        "✨ Tích hợp AI Gemini cho tạo thế giới và nhân vật",
        "🎨 Giao diện tối với thiết kế hiện đại",
        "🌍 Hệ thống tạo thế giới với AI",
        "👤 Tạo nhân vật thông minh",
        "💬 Chat game với AI",
        "⚙️ Cài đặt API key linh hoạt",
        "📱 Responsive design cho mọi thiết bị"
      ]
    }
  ];

  return (
    <motion.div
      className="glass-effect p-6 rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Thông Tin Phiên Bản</h3>
          <p className="text-sm text-gray-300">Version và lịch sử cập nhật</p>
        </div>
      </div>

      {/* Current Version Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Code className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Phiên bản</span>
          </div>
          <div className="text-xl font-bold text-white">{version}</div>
        </div>

        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-gray-300">Ngày build</span>
          </div>
          <div className="text-lg font-semibold text-white">{buildDate}</div>
        </div>

        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <GitBranch className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-300">Cập nhật cuối</span>
          </div>
          <div className="text-lg font-semibold text-white">{lastUpdate}</div>
        </div>
      </div>

      {/* Update Log */}
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">Lịch Sử Cập Nhật</h4>
        <div className="space-y-4">
          {updateLog.map((update, index) => (
            <motion.div
              key={update.version}
              className="bg-white/5 p-4 rounded-lg border border-white/10"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-blue-400">v{update.version}</span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-300">{update.date}</span>
                </div>
              </div>
              
              <ul className="space-y-2">
                {update.changes.map((change, changeIndex) => (
                  <li key={changeIndex} className="flex items-start space-x-2 text-sm text-gray-300">
                    <span className="text-primary-400 mt-1">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Technical Info */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h5 className="text-sm font-semibold text-blue-300 mb-2">Thông Tin Kỹ Thuật</h5>
        <div className="text-xs text-gray-300 space-y-1">
          <div>• Framework: React + TypeScript</div>
          <div>• AI Engine: Google Gemini API</div>
          <div>• Styling: Tailwind CSS</div>
          <div>• Animation: Framer Motion</div>
          <div>• Build Tool: Vite</div>
        </div>
      </div>
    </motion.div>
  );
}
