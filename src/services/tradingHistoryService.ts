import { WorldTime } from '../types';

export interface TradingLogEntry {
  id: string;
  type: 'buy' | 'sell';
  itemName: string;
  itemType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  location: string;
  merchantName?: string;
  timestamp: WorldTime;
  turn: number;
  notes?: string;
}

class TradingHistoryService {
  private static instance: TradingHistoryService;
  private readonly STORAGE_KEY = 'trading_history';
  private readonly MAX_ENTRIES = 200; // Giữ 200 giao dịch gần nhất

  static getInstance(): TradingHistoryService {
    if (!TradingHistoryService.instance) {
      TradingHistoryService.instance = new TradingHistoryService();
    }
    return TradingHistoryService.instance;
  }

  /**
   * Lưu giao dịch mua
   */
  saveBuyTransaction(
    itemName: string,
    itemType: string,
    quantity: number,
    unitPrice: number,
    totalPrice: number,
    location: string,
    merchantName?: string,
    timestamp?: WorldTime,
    turn?: number,
    notes?: string
  ): void {
    const entry: TradingLogEntry = {
      id: `buy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'buy',
      itemName,
      itemType,
      quantity,
      unitPrice,
      totalPrice,
      currency: 'gold',
      location,
      merchantName,
      timestamp: timestamp || this.getCurrentTime(),
      turn: turn || this.getCurrentTurn(),
      notes
    };

    this.saveEntry(entry);
  }

  /**
   * Lưu giao dịch bán
   */
  saveSellTransaction(
    itemName: string,
    itemType: string,
    quantity: number,
    unitPrice: number,
    totalPrice: number,
    location: string,
    merchantName?: string,
    timestamp?: WorldTime,
    turn?: number,
    notes?: string
  ): void {
    const entry: TradingLogEntry = {
      id: `sell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'sell',
      itemName,
      itemType,
      quantity,
      unitPrice,
      totalPrice,
      currency: 'gold',
      location,
      merchantName,
      timestamp: timestamp || this.getCurrentTime(),
      turn: turn || this.getCurrentTurn(),
      notes
    };

    this.saveEntry(entry);
  }

  /**
   * Lưu entry vào storage
   */
  private saveEntry(entry: TradingLogEntry): void {
    try {
      const existingHistory = this.getTradingHistory();
      const updatedHistory = [entry, ...existingHistory].slice(0, this.MAX_ENTRIES);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving trading history:', error);
    }
  }

  /**
   * Lấy lịch sử giao dịch
   */
  getTradingHistory(): TradingLogEntry[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading trading history:', error);
      return [];
    }
  }

  /**
   * Lấy lịch sử giao dịch theo filter
   */
  getFilteredTradingHistory(filter: {
    type?: 'buy' | 'sell';
    itemType?: string;
    location?: string;
    merchantName?: string;
    dateRange?: { start: WorldTime; end: WorldTime };
  }): TradingLogEntry[] {
    let history = this.getTradingHistory();

    if (filter.type) {
      history = history.filter(entry => entry.type === filter.type);
    }

    if (filter.itemType) {
      history = history.filter(entry => entry.itemType === filter.itemType);
    }

    if (filter.location) {
      history = history.filter(entry => entry.location === filter.location);
    }

    if (filter.merchantName) {
      history = history.filter(entry => entry.merchantName === filter.merchantName);
    }

    if (filter.dateRange) {
      history = history.filter(entry => {
        const entryTime = this.timeToMinutes(entry.timestamp);
        const startTime = this.timeToMinutes(filter.dateRange!.start);
        const endTime = this.timeToMinutes(filter.dateRange!.end);
        return entryTime >= startTime && entryTime <= endTime;
      });
    }

    return history;
  }

  /**
   * Lấy thống kê giao dịch
   */
  getTradingStats(): {
    totalBuy: number;
    totalSell: number;
    totalSpent: number;
    totalEarned: number;
    mostBoughtItem: string;
    mostSoldItem: string;
    favoriteMerchant: string;
  } {
    const history = this.getTradingHistory();
    
    const buyEntries = history.filter(entry => entry.type === 'buy');
    const sellEntries = history.filter(entry => entry.type === 'sell');
    
    const totalSpent = buyEntries.reduce((sum, entry) => sum + entry.totalPrice, 0);
    const totalEarned = sellEntries.reduce((sum, entry) => sum + entry.totalPrice, 0);
    
    // Tìm item được mua nhiều nhất
    const buyItemCounts = buyEntries.reduce((counts, entry) => {
      counts[entry.itemName] = (counts[entry.itemName] || 0) + entry.quantity;
      return counts;
    }, {} as Record<string, number>);
    
    const mostBoughtItem = Object.entries(buyItemCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Không có';
    
    // Tìm item được bán nhiều nhất
    const sellItemCounts = sellEntries.reduce((counts, entry) => {
      counts[entry.itemName] = (counts[entry.itemName] || 0) + entry.quantity;
      return counts;
    }, {} as Record<string, number>);
    
    const mostSoldItem = Object.entries(sellItemCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Không có';
    
    // Tìm merchant yêu thích
    const merchantCounts = history.reduce((counts, entry) => {
      if (entry.merchantName) {
        counts[entry.merchantName] = (counts[entry.merchantName] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);
    
    const favoriteMerchant = Object.entries(merchantCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Không có';
    
    return {
      totalBuy: buyEntries.length,
      totalSell: sellEntries.length,
      totalSpent,
      totalEarned,
      mostBoughtItem,
      mostSoldItem,
      favoriteMerchant
    };
  }

  /**
   * Xóa lịch sử giao dịch
   */
  clearTradingHistory(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing trading history:', error);
    }
  }

  /**
   * Lấy thời gian hiện tại
   */
  private getCurrentTime(): WorldTime {
    try {
      const worldData = JSON.parse(localStorage.getItem('world_gen_result') || '{}');
      return worldData.currentTime || {
        hour: 12,
        minute: 0,
        day: 1,
        month: 1,
        year: 1,
        dayOfWeek: 1
      };
    } catch {
      return {
        hour: 12,
        minute: 0,
        day: 1,
        month: 1,
        year: 1,
        dayOfWeek: 1
      };
    }
  }

  /**
   * Lấy turn hiện tại
   */
  private getCurrentTurn(): number {
    try {
      const turnData = JSON.parse(localStorage.getItem('turn_counter') || '{}');
      return turnData.turn || 1;
    } catch {
      return 1;
    }
  }

  /**
   * Chuyển đổi thời gian thành phút để so sánh
   */
  private timeToMinutes(time: WorldTime): number {
    return time.year * 365 * 24 * 60 + 
           time.month * 30 * 24 * 60 + 
           time.day * 24 * 60 + 
           time.hour * 60 + 
           time.minute;
  }
}

export const tradingHistoryService = TradingHistoryService.getInstance();
