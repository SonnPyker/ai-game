// import { Location } from '../types';
import { locationService } from './locationService';

/**
 * Service để đồng bộ dữ liệu location giữa sceneState và world data
 * Đảm bảo locationType và các thuộc tính quan trọng được giữ nguyên
 */
class LocationSyncService {
  private static instance: LocationSyncService;

  static getInstance(): LocationSyncService {
    if (!LocationSyncService.instance) {
      LocationSyncService.instance = new LocationSyncService();
    }
    return LocationSyncService.instance;
  }

  /**
   * Đồng bộ location từ world data gốc vào sceneState
   * Đảm bảo các thuộc tính quan trọng như locationType được giữ nguyên
   */
  public syncLocationFromWorldData(locationId: string, sceneStateLocation: any): any {
    if (!locationId || !sceneStateLocation) {
      return sceneStateLocation;
    }

    try {
      const originalLocation = locationService.getLocationById(locationId);
      if (!originalLocation) {
        console.warn(`[LocationSync] Original location not found for ID: ${locationId}`);
        return sceneStateLocation;
      }

      // Tạo bản sao của sceneState location để không thay đổi trực tiếp
      const syncedLocation = { ...sceneStateLocation };

      // Đồng bộ các thuộc tính quan trọng từ world data gốc
      const criticalProperties = [
        'locationType',
        'id',
        'gridPosition',
        'nearbyLocations',
        'signatureNPCId',
        'signatureQuestId',
        'hasSignatureContent',
        'merchantShop'
      ];

      criticalProperties.forEach(prop => {
        if ((originalLocation as any)[prop] !== undefined) {
          if ((syncedLocation as any)[prop] !== (originalLocation as any)[prop]) {
            console.log(`🔄 [LocationSync] Syncing ${prop} for ${originalLocation.name}: ${(syncedLocation as any)[prop]} → ${(originalLocation as any)[prop]}`);
            (syncedLocation as any)[prop] = (originalLocation as any)[prop];
          }
        }
      });

      // Đặc biệt quan trọng: Đảm bảo locationType được giữ nguyên
      if (originalLocation.locationType && syncedLocation.locationType !== originalLocation.locationType) {
        console.log(`🚨 [LocationSync] CRITICAL: Restoring locationType for ${originalLocation.name}: ${syncedLocation.locationType} → ${originalLocation.locationType}`);
        syncedLocation.locationType = originalLocation.locationType;
      }

      return syncedLocation;
    } catch (error) {
      console.error('[LocationSync] Error syncing location:', error);
      return sceneStateLocation;
    }
  }

  /**
   * Kiểm tra xem location có phải là shop không với fallback
   */
  public isShopLocation(location: any): boolean {
    if (!location) return false;

    // Kiểm tra locationType trực tiếp
    if (location.locationType === 'shop') return true;

    // Kiểm tra ID pattern
    if (location.id && location.id.startsWith('loc_shop')) return true;

    // Kiểm tra tên
    if (location.name) {
      const name = location.name.toLowerCase();
      const shopKeywords = ['chợ', 'cửa hàng', 'tiệm', 'shop', 'market', 'store'];
      if (shopKeywords.some(keyword => name.includes(keyword))) return true;
    }

    // Fallback: Kiểm tra world data gốc
    try {
      const originalLocation = locationService.getLocationById(location.id);
      if (originalLocation && originalLocation.locationType === 'shop') {
        console.log(`🔄 [LocationSync] Using original world data for shop detection: ${location.name}`);
        return true;
      }
    } catch (error) {
      // Silently handle errors
    }

    return false;
  }

  /**
   * Đồng bộ tất cả locations trong world data
   * Đảm bảo không có location nào bị mất locationType
   */
  public validateAndSyncAllLocations(worldData: any): any {
    if (!worldData || !worldData.locations) {
      return worldData;
    }

    const syncedWorldData = { ...worldData };
    syncedWorldData.locations = worldData.locations.map((location: any) => {
      // Đảm bảo mỗi location có đầy đủ thuộc tính cần thiết
      const syncedLocation = { ...location };

      // Nếu location có ID bắt đầu bằng 'loc_shop' nhưng không có locationType
      if (location.id && location.id.startsWith('loc_shop') && !location.locationType) {
        console.log(`🔄 [LocationSync] Adding missing locationType for shop: ${location.name}`);
        syncedLocation.locationType = 'shop';
      }

      return syncedLocation;
    });

    return syncedWorldData;
  }
}

export const locationSyncService = LocationSyncService.getInstance();
