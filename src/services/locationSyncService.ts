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
        'type', // ! CRITICAL: Đồng bộ type để đảm bảo shop locations có type: "shop"
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
            (syncedLocation as any)[prop] = (originalLocation as any)[prop];
          }
        }
      });

      // Đặc biệt quan trọng: Đảm bảo locationType được giữ nguyên
      if (originalLocation.locationType && syncedLocation.locationType !== originalLocation.locationType) {
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

    // Kiểm tra type trực tiếp
    if (location.type === 'shop') return true;

    // Kiểm tra ID pattern
    if (location.id && location.id.startsWith('loc_shop')) return true;

    // Kiểm tra tên - mở rộng danh sách từ khóa
    if (location.name) {
      const name = location.name.toLowerCase();
      const shopKeywords = [
        'chợ', 'cửa hàng', 'tiệm', 'shop', 'market', 'store', 
        'bazaar', 'boutique', 'emporium', 'outlet', 'mart',
        'trading post', 'merchant', 'vendor', 'trader'
      ];
      if (shopKeywords.some(keyword => name.includes(keyword))) return true;
    }

    // Fallback: Kiểm tra world data gốc
    try {
      const originalLocation = locationService.getLocationById(location.id);
      if (originalLocation && originalLocation.locationType === 'shop') {
        return true;
      }
    } catch (error) {
      // Silently handle errors
    }

    return false;
  }

  /**
   * Đồng bộ tất cả locations trong world data
   * Đảm bảo không có location nào bị mất locationType và type đúng
   */
  public validateAndSyncAllLocations(worldData: any): any {
    if (!worldData || !worldData.locations) {
      return worldData;
    }

    const syncedWorldData = { ...worldData };
    let fixedCount = 0;
    
    syncedWorldData.locations = worldData.locations.map((location: any) => {
      // Đảm bảo mỗi location có đầy đủ thuộc tính cần thiết
      const syncedLocation = { ...location };

      // Kiểm tra xem location có phải là shop dựa trên tên và mô tả
      const isShopByName = this.isShopLocation(location);

      // Nếu location có ID bắt đầu bằng 'loc_shop' nhưng không có locationType
      if (location.id && location.id.startsWith('loc_shop') && !location.locationType) {
        syncedLocation.locationType = 'shop';
        fixedCount++;
      }

      // ! CRITICAL: Đảm bảo shop locations có type: "shop" thay vì "secondary"
      if (location.id && location.id.startsWith('loc_shop')) {
        if (syncedLocation.type !== 'shop') {
          syncedLocation.type = 'shop';
          fixedCount++;
        }
        if (syncedLocation.locationType !== 'shop') {
          syncedLocation.locationType = 'shop';
          fixedCount++;
        }
      }

      // ! NEW: Tự động sửa các địa điểm có tên shop nhưng type sai
      if (isShopByName && syncedLocation.type !== 'shop') {
        syncedLocation.type = 'shop';
        syncedLocation.locationType = 'shop';
        fixedCount++;
      }

      return syncedLocation;
    });

    if (fixedCount > 0) {
    }

    return syncedWorldData;
  }

  /**
   * Kiểm tra và báo cáo tình trạng phân loại địa điểm
   */
  public validateLocationClassification(worldData: any): {
    totalLocations: number;
    shopLocations: number;
    misclassifiedShops: any[];
    validShops: any[];
  } {
    if (!worldData || !worldData.locations) {
      return { totalLocations: 0, shopLocations: 0, misclassifiedShops: [], validShops: [] };
    }

    const locations = worldData.locations;
    const misclassifiedShops: any[] = [];
    const validShops: any[] = [];

    locations.forEach((location: any) => {
      const isShopByName = this.isShopLocation(location);
      const isShopByType = location.type === 'shop' || location.locationType === 'shop';

      if (isShopByName) {
        if (isShopByType) {
          validShops.push(location);
        } else {
          misclassifiedShops.push(location);
        }
      }
    });

    return {
      totalLocations: locations.length,
      shopLocations: validShops.length + misclassifiedShops.length,
      misclassifiedShops,
      validShops
    };
  }
}

export const locationSyncService = LocationSyncService.getInstance();
