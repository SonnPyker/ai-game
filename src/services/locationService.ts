import { Location, PlayerLocation, WorldTime, WorldData, MerchantShop } from '../types';
import { worldTimeService } from './worldTimeService';
import { merchantService } from './merchantService';

class LocationService {
  private static instance: LocationService;
  private cachedWorldData: any = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Khởi tạo vị trí ban đầu của người chơi dựa vào world data, scenario và opening message
   */
  initializePlayerLocation(
    worldData: WorldData, 
    scenario: any, 
    openingMessage: string
  ): string {
    const locations = worldData.locations || [];
    
    if (locations.length === 0) {
      console.warn('Không có locations trong world data');
      return '';
    }

    // Tìm location được đề cập trong opening message
    const mentionedLocation = this.findLocationInText(openingMessage, locations);
    if (mentionedLocation) {
      return mentionedLocation.id;
    }

    // Tìm location được đề cập trong scenario
    if (scenario && scenario.openingSeed) {
      const scenarioLocation = this.findLocationInText(scenario.openingSeed, locations);
      if (scenarioLocation) {
        return scenarioLocation.id;
      }
    }

    // Fallback: chọn location đầu tiên có type 'story'
    const storyLocation = locations.find(loc => loc.type === 'story');
    if (storyLocation) {
      return storyLocation.id;
    }

    // Fallback cuối cùng: location đầu tiên
    return locations[0].id;
  }

  /**
   * Tìm location được đề cập trong text
   */
  private findLocationInText(text: string, locations: Location[]): Location | null {
    const lowerText = text.toLowerCase();
    
    for (const location of locations) {
      const locationName = location.name.toLowerCase();
      if (lowerText.includes(locationName)) {
        return location;
      }
    }
    
    return null;
  }

  /**
   * Lấy vị trí hiện tại của người chơi
   */
  getCurrentLocation(): PlayerLocation | null {
    try {
      const saved = localStorage.getItem('player_location');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Lỗi load player location:', error);
      return null;
    }
  }

  /**
   * Lưu vị trí hiện tại của người chơi
   */
  savePlayerLocation(locationData: PlayerLocation): void {
    try {
      localStorage.setItem('player_location', JSON.stringify(locationData));
    } catch (error) {
      console.error('Lỗi save player location:', error);
    }
  }

  /**
   * Xóa vị trí hiện tại của người chơi (dùng khi reset game)
   */
  clearPlayerLocation(): void {
    try {
      localStorage.removeItem('player_location');
    } catch (error) {
      console.error('Lỗi clear player location:', error);
    }
  }

  /**
   * Di chuyển đến location mới
   */
  moveToLocation(
    locationId: string, 
    currentTime: WorldTime, 
    turnCounter: number
  ): { newTime: WorldTime; travelMinutes: number } {
    const currentLocation = this.getCurrentLocation();
    const targetLocation = this.getLocationById(locationId);
    
    if (!targetLocation) {
      throw new Error(`Không tìm thấy location với ID: ${locationId}`);
    }

    // Tính thời gian di chuyển dựa trên số bước
    let travelMinutes = 0;
    if (currentLocation && currentLocation.currentLocationId !== locationId) {
      const path = this.getTravelPath(currentLocation.currentLocationId, locationId);
      const numberOfSteps = path.length > 0 ? path.length - 1 : 0;
      travelMinutes = numberOfSteps * 30; // Mỗi bước = 30 phút
    }

    // Cập nhật thời gian
    const newTime = worldTimeService.advanceMinutes(currentTime, travelMinutes);

    // Cập nhật player location
    const newPlayerLocation: PlayerLocation = {
      currentLocationId: locationId,
      locationHistory: [
        ...(currentLocation?.locationHistory || []),
        {
          locationId,
          arrivedAt: newTime,
          turn: turnCounter
        }
      ]
    };

    this.savePlayerLocation(newPlayerLocation);

    return { newTime, travelMinutes };
  }

  /**
   * Lấy danh sách locations trong bán kính
   */
  getLocationsInRadius(locationId: string, radius: number): Location[] {
    const worldData = this.getWorldData();
    const locations = worldData.locations || [];
    const centerLocation = this.getLocationById(locationId);
    
    if (!centerLocation) {
      return [];
    }

    return locations.filter((location: any) => {
      if (location.id === locationId) return false;
      
      const distance = this.calculateDistanceBetweenPositions(
        centerLocation.gridPosition,
        location.gridPosition
      );
      
      return distance <= radius;
    });
  }


  /**
   * Tính khoảng cách Euclidean giữa hai vị trí grid (cho getLocationsInRadius)
   */
  private calculateDistanceBetweenPositions(
    pos1: { x: number; y: number }, 
    pos2: { x: number; y: number }
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }


  /**
   * Tính toán đường đi đơn giản sử dụng khoảng cách Manhattan
   */
  private findShortestPathWithRoute(start: { x: number; y: number }, end: { x: number; y: number }): { distance: number; path: { x: number; y: number }[] } {
    // Nếu cùng vị trí
    if (start.x === end.x && start.y === end.y) {
      return { distance: 0, path: [start] };
    }

    // Sử dụng khoảng cách Manhattan đơn giản
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const distance = dx + dy; // Manhattan distance

    // Tạo đường đi đơn giản (di chuyển theo trục X trước, sau đó theo trục Y)
    const path: { x: number; y: number }[] = [];
    
    // Thêm điểm bắt đầu
    path.push({ x: start.x, y: start.y });
    
    // Di chuyển theo trục X
    let currentX = start.x;
    while (currentX !== end.x) {
      currentX += currentX < end.x ? 1 : -1;
      path.push({ x: currentX, y: start.y });
    }
    
    // Di chuyển theo trục Y
    let currentY = start.y;
    while (currentY !== end.y) {
      currentY += currentY < end.y ? 1 : -1;
      path.push({ x: end.x, y: currentY });
    }

    return { distance, path };
  }





  /**
   * Lấy location theo ID
   */
  getLocationById(locationId: string): Location | null {
    const worldData = this.getWorldData();
    const locations = worldData.locations || [];
    return locations.find((loc: any) => loc.id === locationId) || null;
  }

  /**
   * Lấy tất cả locations
   */
  getAllLocations(): Location[] {
    const worldData = this.getWorldData();
    return worldData.locations || [];
  }


  /**
   * Lấy world data từ localStorage với caching
   */
  private getWorldData(): any {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cachedWorldData && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedWorldData;
    }
    
    try {
      const worldData = localStorage.getItem('world_gen_result');
      const parsedData = worldData ? JSON.parse(worldData) : { locations: [] };
      
      // Cache the data
      this.cachedWorldData = parsedData;
      this.cacheTimestamp = now;
      
      return parsedData;
    } catch (error) {
      console.error('Lỗi load world data:', error);
      return { locations: [] };
    }
  }

  /**
   * Validate và sửa chữa grid positions nếu cần
   */
  validateAndFixGridPositions(locations: Location[]): Location[] {
    const fixedLocations = [...locations];
    const usedPositions = new Set<string>();
    
    for (let i = 0; i < fixedLocations.length; i++) {
      const location = fixedLocations[i];
      const positionKey = `${location.gridPosition.x},${location.gridPosition.y}`;
      
      // Nếu vị trí đã được sử dụng, tìm vị trí mới
      if (usedPositions.has(positionKey)) {
        const newPosition = this.findAvailablePosition(usedPositions);
        fixedLocations[i] = {
          ...location,
          gridPosition: newPosition
        };
        usedPositions.add(`${newPosition.x},${newPosition.y}`);
      } else {
        usedPositions.add(positionKey);
      }
    }
    
    return fixedLocations;
  }

  /**
   * Tìm vị trí trống trên grid
   */
  private findAvailablePosition(usedPositions: Set<string>): { x: number; y: number } {
    const gridSize = 15;
    
    // Tìm vị trí trống gần trung tâm
    for (let radius = 0; radius < gridSize / 2; radius++) {
      for (let x = 7 - radius; x <= 7 + radius; x++) {
        for (let y = 7 - radius; y <= 7 + radius; y++) {
          if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            const positionKey = `${x},${y}`;
            if (!usedPositions.has(positionKey)) {
              return { x, y };
            }
          }
        }
      }
    }
    
    // Fallback: vị trí ngẫu nhiên
    return {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    };
  }

  /**
   * Tạo câu di chuyển để paste vào chat input
   */
  generateTravelMessage(locationId: string): string {
    const location = this.getLocationById(locationId);
    if (!location) {
      return '';
    }
    
    return `Bạn di chuyển đến ${location.name}`;
  }


  /**
   * Lấy đường đi giữa hai locations
   */
  getTravelPath(fromLocationId: string, toLocationId: string): { x: number; y: number }[] {
    const fromLoc = this.getLocationById(fromLocationId);
    const toLoc = this.getLocationById(toLocationId);
    
    if (!fromLoc || !toLoc) {
      return [];
    }

    const result = this.findShortestPathWithRoute(fromLoc.gridPosition, toLoc.gridPosition);
    return result.path;
  }

  /**
   * Lấy thông tin di chuyển (số bước, thời gian)
   */
  getTravelInfo(fromLocationId: string, toLocationId: string): {
    distance: number; // Số bước
    travelMinutes: number;
    canTravel: boolean;
    pathType: string;
  } {
    const fromLoc = this.getLocationById(fromLocationId);
    const toLoc = this.getLocationById(toLocationId);

    if (!fromLoc || !toLoc) {
      return { distance: 0, travelMinutes: 0, canTravel: false, pathType: 'Không xác định' };
    }

    const { path } = this.findShortestPathWithRoute(fromLoc.gridPosition, toLoc.gridPosition);

    const numberOfSteps = path.length > 0 ? path.length - 1 : 0; // Số bước = số điểm trên đường đi - 1 (điểm xuất phát)
    const travelMinutes = numberOfSteps * 30; // 30 phút mỗi bước

    // Xác định loại đường đi
    let pathType = 'Đường thẳng';
    if (numberOfSteps > 0) {
      const dx = Math.abs(toLoc.gridPosition.x - fromLoc.gridPosition.x);
      const dy = Math.abs(toLoc.gridPosition.y - fromLoc.gridPosition.y);
      if (dx > 0 && dy > 0) {
        pathType = 'Đường chéo';
      } else if (dx > 0 || dy > 0) {
        pathType = 'Đường thẳng';
      }
    }

    return {
      distance: numberOfSteps, // Trả về số bước
      travelMinutes,
      canTravel: true, // Luôn có thể di chuyển nếu location tồn tại
      pathType
    };
  }

  /**
   * Khởi tạo merchant shops cho tất cả shop locations
   */
  public initializeMerchantShops(locations: Location[]): void {
    const shopLocations = locations.filter(loc => loc.locationType === 'shop');
    
    for (const location of shopLocations) {
      // Kiểm tra xem shop đã tồn tại chưa
      const existingShop = merchantService.getMerchantShopByLocation(location.id);
      if (!existingShop) {
        // Shop sẽ được tạo bằng AI khi player mở shop
      }
    }
  }

  /**
   * Lấy merchant shop theo location ID
   */
  public getMerchantShopByLocation(locationId: string): MerchantShop | null {
    return merchantService.getMerchantShopByLocation(locationId);
  }

  /**
   * Kiểm tra xem location có phải là shop không
   */
  public isShopLocation(locationId: string): boolean {
    const location = this.getLocationById(locationId);
    return location?.locationType === 'shop';
  }

  /**
   * Lấy tất cả shop locations
   */
  public getShopLocations(): Location[] {
    const worldData = this.getWorldData();
    const locations = worldData.locations || [];
    return locations.filter((loc: Location) => loc.locationType === 'shop');
  }

  /**
   * Kiểm tra và restock tất cả shops (CHỈ DÙNG AI)
   */
  public async checkAndRestockAllShops(currentTime: WorldTime): Promise<void> {
    await merchantService.checkAndRestockShops(currentTime);
  }
}

export const locationService = LocationService.getInstance();
