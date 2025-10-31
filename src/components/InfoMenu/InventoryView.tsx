import { useState, useMemo, useCallback } from 'react';
import { InventoryItem, SkillBook } from '../../types';
import { ItemCard } from './ItemCard';
import { SkillBookCard } from './SkillBookCard';
import { 
  Search, 
  SortAsc, 
  SortDesc,
  Package,
  Sword,
  Shield,
  Beaker,
  Star
} from 'lucide-react';

interface InventoryViewProps {
  inventory: (InventoryItem | SkillBook)[];
  onEquipItem?: (itemId: string) => void;
  onUnequipItem?: (itemId: string) => void;
  onDropItem?: (itemId: string) => void;
  onUseSkillBook?: (skillBook: SkillBook) => void;
}

type FilterType = 'all' | 'weapon' | 'armor' | 'consumable' | 'misc' | 'equipped' | 'skillbook';
type SortType = 'name' | 'type' | 'rarity' | 'quantity';

export function InventoryView({ 
  inventory, 
  onEquipItem, 
  onUnequipItem, 
  onDropItem,
  onUseSkillBook
}: InventoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and sort inventory
  const filteredAndSortedInventory = useMemo(() => {
    let filtered = inventory;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filter !== 'all') {
      if (filter === 'equipped') {
        filtered = filtered.filter(item => 'isEquipped' in item && item.isEquipped);
      } else if (filter === 'skillbook') {
        filtered = filtered.filter(item => 'skillType' in item);
      } else {
        filtered = filtered.filter(item => 'type' in item && item.type === filter);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'rarity':
          const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, unique: 5 };
          comparison = rarityOrder[b.rarity] - rarityOrder[a.rarity];
          break;
        case 'quantity':
          comparison = b.quantity - a.quantity;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [inventory, searchQuery, filter, sortBy, sortOrder]);

  // Get filter counts
  const filterCounts = useMemo(() => {
    return {
      all: inventory.length,
      weapon: inventory.filter(item => 'type' in item && item.type === 'weapon').length,
      armor: inventory.filter(item => 'type' in item && item.type === 'armor').length,
      consumable: inventory.filter(item => 'type' in item && item.type === 'consumable').length,
      skillbook: inventory.filter(item => 'skillType' in item).length,
      misc: inventory.filter(item => 'type' in item && item.type === 'misc').length,
      equipped: inventory.filter(item => 'isEquipped' in item && item.isEquipped).length
    };
  }, [inventory]);

  const handleSort = useCallback((newSortBy: SortType) => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  }, [sortBy]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilter('all');
    setSortBy('name');
    setSortOrder('asc');
  }, []);

  // Empty state
  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="w-16 h-16 text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">Túi đồ trống</h3>
        <p className="text-gray-400 text-sm max-w-sm">
          Bạn chưa có vật phẩm nào. Hãy khám phá thế giới để tìm kiếm những vật phẩm hữu ích!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm vật phẩm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
          />
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex flex-wrap gap-2">
          {/* Type Filters */}
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'all', label: 'Tất cả', icon: Package, count: filterCounts.all },
              { key: 'weapon', label: 'Vũ khí', icon: Sword, count: filterCounts.weapon },
              { key: 'armor', label: 'Trang bị', icon: Shield, count: filterCounts.armor },
              { key: 'consumable', label: 'Tiêu hao', icon: Beaker, count: filterCounts.consumable },
              { key: 'skillbook', label: 'Sách kỹ năng', icon: Star, count: filterCounts.skillbook },
              { key: 'misc', label: 'Khác', icon: Package, count: filterCounts.misc },
              { key: 'equipped', label: 'Đã trang bị', icon: Star, count: filterCounts.equipped }
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as FilterType)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filter === key
                    ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300'
                    : 'bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                <span className="text-xs opacity-75">({count})</span>
              </button>
            ))}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-sm text-gray-400">Sắp xếp:</span>
            {[
              { key: 'name', label: 'Tên' },
              { key: 'type', label: 'Loại' },
              { key: 'rarity', label: 'Độ hiếm' },
              { key: 'quantity', label: 'Số lượng' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key as SortType)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
                  sortBy === key
                    ? 'bg-gray-600/50 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>{label}</span>
                {sortBy === key && (
                  sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {(searchQuery || filter !== 'all' || sortBy !== 'name') && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>


      {/* Results Count */}
      <div className="text-sm text-gray-400">
        Hiển thị {filteredAndSortedInventory.length} / {inventory.length} vật phẩm
      </div>

      {/* Inventory Grid/List */}
      {filteredAndSortedInventory.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">Không tìm thấy vật phẩm nào phù hợp</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedInventory.map((item) => {
            if ('skillType' in item) {
              // Skill book
              return (
                <SkillBookCard
                  key={item.id}
                  skillBook={item}
                  onUse={onUseSkillBook}
                  onDrop={onDropItem}
                  size="large"
                  className="w-full"
                />
              );
            } else {
              // Regular item
              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEquip={onEquipItem}
                  onUnequip={onUnequipItem}
                  onDrop={onDropItem}
                  size="large"
                  className="w-full"
                />
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
