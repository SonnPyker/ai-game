import { Character, WorldData } from '../types';

/**
 * Currency System Service
 * Quản lý hệ thống tiền tệ dựa theo world data
 */
class CurrencyService {
  private static instance: CurrencyService;

  private constructor() {}

  public static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  /**
   * Lấy tên tiền tệ chính từ world data
   * @param worldData Dữ liệu thế giới
   * @returns Tên tiền tệ chính
   */
  public getCurrencyName(worldData: WorldData): string {
    // Kiểm tra cấu trúc world data thực tế
    if (worldData.economy && worldData.economy.currencies && worldData.economy.currencies.length > 0) {
      // Lấy currency đầu tiên từ economy.currencies
      return worldData.economy.currencies[0];
    }
    
    if (worldData.currencies && worldData.currencies.length > 0) {
      // Tìm currency chính (isMain: true)
      const mainCurrency = worldData.currencies.find(currency => currency.isMain);
      if (mainCurrency) {
        return mainCurrency.name;
      }

      // Nếu không có main currency, lấy currency đầu tiên
      return worldData.currencies[0].name;
    }

    return 'Vàng'; // Default currency name
  }

  /**
   * Lấy tên tiền tệ phụ từ world data
   * @param worldData Dữ liệu thế giới
   * @returns Tên tiền tệ phụ
   */
  public getSecondaryCurrencyName(worldData: WorldData): string {
    // Kiểm tra cấu trúc world data thực tế
    if (worldData.economy && worldData.economy.currencies && worldData.economy.currencies.length > 1) {
      // Lấy currency thứ hai từ economy.currencies
      return worldData.economy.currencies[1];
    }
    
    if (worldData.currencies && worldData.currencies.length > 1) {
      // Lấy currency thứ hai
      return worldData.currencies[1].name;
    }

    return 'Bạc'; // Default secondary currency name
  }

  /**
   * Tính số tiền ban đầu dựa theo độ khó thế giới
   * @param worldData Dữ liệu thế giới
   * @returns Số tiền ban đầu
   */
  public getInitialCurrency(worldData: WorldData): number {
    const difficulty = worldData.difficulty?.toLowerCase() || 'trung bình';
    
    let minAmount: number;
    let maxAmount: number;

    switch (difficulty) {
      case 'dễ':
        minAmount = 100;
        maxAmount = 200;
        break;
      case 'trung bình':
        minAmount = 50;
        maxAmount = 150;
        break;
      case 'khó':
        minAmount = 10;
        maxAmount = 50;
        break;
      case 'cực khó':
        minAmount = 5;
        maxAmount = 30;
        break;
      default:
        // Fallback cho các giá trị khác
        minAmount = 50;
        maxAmount = 150;
        break;
    }

    // Random số tiền trong khoảng
    return Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
  }

  /**
   * Thêm tiền cho character
   * @param character Character cần thêm tiền
   * @param amount Số tiền cần thêm
   * @returns Số tiền hiện tại sau khi thêm
   */
  public addCurrency(character: Character, amount: number): number {
    if (amount <= 0) {
      return character.currency || 0;
    }

    const currentCurrency = character.currency || 0;
    const newCurrency = currentCurrency + amount;
    
    character.currency = newCurrency;
    return newCurrency;
  }

  /**
   * Trừ tiền cho character
   * @param character Character cần trừ tiền
   * @param amount Số tiền cần trừ
   * @returns true nếu trừ thành công, false nếu không đủ tiền
   */
  public removeCurrency(character: Character, amount: number): boolean {
    if (amount <= 0) {
      return true;
    }

    const currentCurrency = character.currency || 0;
    
    if (currentCurrency < amount) {
      return false; // Không đủ tiền
    }

    character.currency = currentCurrency - amount;
    return true;
  }

  /**
   * Kiểm tra character có đủ tiền không
   * @param character Character cần kiểm tra
   * @param amount Số tiền cần kiểm tra
   * @returns true nếu đủ tiền
   */
  public hasEnoughCurrency(character: Character, amount: number): boolean {
    const currentCurrency = character.currency || 0;
    return currentCurrency >= amount;
  }

  /**
   * Lấy số tiền hiện tại của character
   * @param character Character cần kiểm tra
   * @returns Số tiền hiện tại
   */
  public getCurrentCurrency(character: Character): number {
    return character.currency || 0;
  }

  /**
   * Khởi tạo currency cho character mới
   * @param character Character cần khởi tạo
   * @param worldData Dữ liệu thế giới
   */
  public initializeCharacter(character: Character, worldData: WorldData): void {
    character.currency = this.getInitialCurrency(worldData);
    character.secondaryCurrency = this.getInitialSecondaryCurrency(worldData);
  }

  /**
   * Tính số tiền phụ ban đầu dựa theo độ khó thế giới
   * @param worldData Dữ liệu thế giới
   * @returns Số tiền phụ ban đầu
   */
  public getInitialSecondaryCurrency(worldData: WorldData): number {
    const difficulty = worldData.difficulty?.toLowerCase() || 'trung bình';
    
    let minAmount: number;
    let maxAmount: number;

    switch (difficulty) {
      case 'dễ':
        minAmount = 200;
        maxAmount = 400;
        break;
      case 'trung bình':
        minAmount = 100;
        maxAmount = 300;
        break;
      case 'khó':
        minAmount = 20;
        maxAmount = 100;
        break;
      case 'cực khó':
        minAmount = 10;
        maxAmount = 60;
        break;
      default:
        minAmount = 100;
        maxAmount = 300;
        break;
    }

    return Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
  }

  /**
   * Thêm tiền phụ cho character
   * @param character Character cần thêm tiền
   * @param amount Số tiền cần thêm
   * @returns Số tiền phụ hiện tại sau khi thêm
   */
  public addSecondaryCurrency(character: Character, amount: number): number {
    if (amount <= 0) {
      return character.secondaryCurrency || 0;
    }

    const currentCurrency = character.secondaryCurrency || 0;
    const newCurrency = currentCurrency + amount;
    
    character.secondaryCurrency = newCurrency;
    return newCurrency;
  }

  /**
   * Lấy số tiền phụ hiện tại của character
   * @param character Character cần kiểm tra
   * @returns Số tiền phụ hiện tại
   */
  public getCurrentSecondaryCurrency(character: Character): number {
    return character.secondaryCurrency || 0;
  }

  /**
   * Format số tiền phụ với tên currency
   * @param amount Số tiền
   * @param worldData Dữ liệu thế giới
   * @returns Chuỗi hiển thị tiền tệ phụ
   */
  public formatSecondaryCurrency(amount: number, worldData: WorldData): string {
    const currencyName = this.getSecondaryCurrencyName(worldData);
    return `${amount.toLocaleString()} ${currencyName}`;
  }

  /**
   * Format số tiền với tên currency
   * @param amount Số tiền
   * @param worldData Dữ liệu thế giới
   * @returns Chuỗi hiển thị tiền tệ
   */
  public formatCurrency(amount: number, worldData: WorldData): string {
    const currencyName = this.getCurrencyName(worldData);
    return `${amount.toLocaleString()} ${currencyName}`;
  }

  /**
   * Lấy thông tin currency của character
   * @param character Character cần kiểm tra
   * @param worldData Dữ liệu thế giới
   * @returns Thông tin currency chi tiết
   */
  public getCurrencyInfo(character: Character, worldData: WorldData): {
    current: number;
    currencyName: string;
    formatted: string;
  } {
    const current = this.getCurrentCurrency(character);
    const currencyName = this.getCurrencyName(worldData);
    const formatted = this.formatCurrency(current, worldData);

    return {
      current,
      currencyName,
      formatted
    };
  }
}

// Export singleton instance
export const currencyService = CurrencyService.getInstance();
