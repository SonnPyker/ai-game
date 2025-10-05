import { motion } from 'framer-motion';
import { Package, Calendar, Code, GitBranch } from 'lucide-react';

export function VersionInfo() {
  const version = "3.0.0";
  const now = new Date();
  const buildDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  const lastUpdate = now.toISOString().split('T')[0]; // YYYY-MM-DD format

const updateLog = [
    {
      version: "3.0.0",
      date: now.toISOString().split('T')[0],
      changes: [
        "🗺️ Hệ thống bản đồ hoàn chỉnh với grid 15x15",
        "📍 Tối thiểu 5 địa điểm cốt truyện + 2-3 địa điểm phụ",
        "🚶 Cơ chế di chuyển với A* pathfinding algorithm",
        "⏰ Tính thời gian di chuyển chính xác (30 phút/ô)",
        "🎯 Hiển thị đường đi với số thứ tự trên bản đồ",
        "🔄 Tách biệt chọn địa điểm và di chuyển",
        "💬 Auto-paste message di chuyển vào chat input",
        "🏷️ Tag đặc biệt cho hành động di chuyển",
        "📊 Đồng bộ thời gian di chuyển với lịch sử hành động",
        "🎮 Tab 'Bản Đồ' mới trong InfoMenu",
        "🔧 Tối ưu hóa performance với caching",
        "🧹 Dọn dẹp console logs và code optimization"
      ]
    },
    {
      version: "2.6.0",
      date: "2025-01-01",
      changes: [
        "🤖 Hệ thống gợi ý hành động AI thông minh",
        "📋 Lịch sử hành động với thu/mở từng mục",
        "💾 Tích hợp Action Suggestions & Log vào Save System",
        "🔄 Lưu và khôi phục gợi ý hành động và lịch sử",
        "📜 SCC Journal với lịch sử tóm tắt có thể thu gọn",
        "🎯 Cải thiện hệ thống từ chối side quest",
        "🤖 AI không nhắc lại quest đã từ chối",
        "📝 Auto-fill chat input khi accept/decline quest",
        "🔧 Đồng bộ turnCounter giữa SCC và game state",
        "📊 Hiển thị quest đã từ chối trong QuestTracker",
        "🔄 Migration system hỗ trợ quest system",
        "✨ Cải thiện UX và performance tổng thể"
      ]
    },
    {
      version: "1.3.2",
      date: "2025-01-01",
      changes: [
        "🎯 Hệ thống Quest hoàn chỉnh với Main & Side Quests",
        "📜 Progressive quest objectives (hiện từng bước một)",
        "🔒 Quest bị khóa ẩn objectives và rewards",
        "🎬 Quest mở đầu độc lập, unlock Act 1 khi hoàn thành",
        "💪 Thêm Health & Mana cho nhân vật (nhân x10)",
        "📊 Hiển thị Health/Mana với thanh tiến độ trong InfoMenu",
        "🧮 Auto-calculate modifiers theo cơ chế DnD",
        "🔄 Flow unlock quest: Mở đầu → Act 1 → Act 2 → ...",
        "🐛 Fix duplicate side quest khi accept",
        "✨ Cải thiện quest detection và generation"
      ]
    },
    {
      version: "1.3.1",
      date: "2025-01-01",
      changes: [
        "📊 Thêm InfoMenu với thông tin game chi tiết",
        "🎮 Hiển thị thông tin nhân vật: chỉ số, kỹ năng, tính cách",
        "🌍 Hiển thị thông tin thế giới: phe phái, địa điểm, quy tắc",
        "📋 Menu thông tin với 7 sections: Nhân Vật, Thế Giới, Phe Phái, Địa Điểm, Thực Thể, Quy Tắc, Nhiệm Vụ",
        "📌 Tính năng ghim menu để theo dõi real-time",
        "🎨 UI responsive với animation mượt mà",
        "⚙️ Xóa Game Settings tab khỏi cài đặt",
        "🔧 Tối ưu hóa layout và performance",
        "📱 Cải thiện trải nghiệm người dùng"
      ]
    },
    {
      version: "1.3.0",
      date: "2024-12-19",
      changes: [
        "🎯 Thêm tính năng Nội dung 18+ với 2 mức độ: An toàn & Tả thực",
        "🔒 Age-gate confirmation cho lần đầu kích hoạt nội dung 18+",
        "📋 Tab 'Khởi tạo' mới để quản lý flow tạo game",
        "🚫 Logic disable bảo vệ flow: không thể bỏ qua các bước bắt buộc",
        "📝 Hiển thị tên thế giới và nhân vật trong tab Khởi tạo",
        "❓ HelpTooltip thay thế text area hướng dẫn, tiết kiệm không gian UI",
        "📐 Layout mở rộng: WorldBuilder và CharacterCreation full width",
        "🎭 Sửa lỗi Opening Message không tuân theo ngôi kể đã cài đặt",
        "📊 Thêm trường narration vào world_gen_result schema",
        "❌ Loại bỏ câu hỏi trực tiếp trong Opening Message",
        "🎨 UI cải thiện với visual feedback cho trạng thái disabled",
        "⚡ Tối ưu hóa prompt và AI guidance cho nội dung 18+"
      ]
    },
    {
      version: "1.2.0",
      date: "2024-12-19",
      changes: [
        "💾 Hệ thống Save/Load hoàn chỉnh với Supabase + LocalStorage",
        "☁️ 3 slot Cloud Save với đồng bộ real-time",
        "💻 3 slot Local Save cho offline gaming",
        "🔄 Cơ chế sync thông minh giữa Cloud và Local",
        "⚡ UI Save/Load được tối ưu với thông tin chi tiết",
        "🎮 Tách biệt hoàn toàn Cloud và Local saves",
        "🗑️ Xóa bỏ class nhân vật không cần thiết",
        "🧹 Dọn dẹp code và tối ưu hóa bundle size",
        "🐛 Sửa lỗi [object Object] trong hiển thị save",
        "✨ Cải thiện UX với thông tin thế giới và nhân vật"
      ]
    },
    {
      version: "1.1.0",
      date: "2025-09-25",
      changes: [
        "🎨 Loại bỏ hoàn toàn UI gradient, chuyển sang flat colors",
        "🗂️ Tách riêng Settings thành 3 tab: API Keys, Game Settings, Version & Info",
        "🎮 Thêm Game Settings với cài đặt âm thanh, hiệu suất, quản lý dữ liệu",
        "🔧 Cải thiện hệ thống quản lý API keys",
        "📱 Tối ưu hóa responsive design",
        "🎯 Loại bỏ nút 'Chơi mới' khỏi sidebar, chỉ bắt đầu từ trang chủ",
        "🔄 Cải thiện cơ chế refresh trang với các trường hợp ngoại lệ",
        "🔤 Cập nhật font chữ sang 'SVN-Determination Sans'",
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