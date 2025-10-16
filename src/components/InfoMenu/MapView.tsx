import { useState, useMemo } from 'react';
import { MapPin, Info, Navigation, Clock } from 'lucide-react';
import { WorldData, Location, WorldTime } from '../../types';
import { locationService } from '../../services/locationService';
import { locationSyncService } from '../../services/locationSyncService';

interface MapViewProps {
  worldData: WorldData;
  currentLocationId: string;
  onLocationClick: (locationId: string) => void;
  selectedLocationId?: string | null;
  worldTime: WorldTime;
}

interface GridCell {
  x: number;
  y: number;
  location?: Location;
  isCurrentLocation: boolean;
  isNearby: boolean;
}

export function MapView({ worldData, currentLocationId, onLocationClick, selectedLocationId }: MapViewProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [travelPath, setTravelPath] = useState<{ x: number; y: number }[]>([]);

  // Tạo grid 15x15 với locations
  const grid = useMemo(() => {
    const locations = worldData.locations || [];
    const currentLocation = locationService.getLocationById(currentLocationId);
    const nearbyLocations = currentLocation ? 
      locationService.getLocationsInRadius(currentLocationId, 2) : [];

    const grid: GridCell[][] = [];
    
    for (let y = 0; y < 15; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < 15; x++) {
        const location = locations.find(loc => 
          loc.gridPosition.x === x && loc.gridPosition.y === y
        );
        
        row.push({
          x,
          y,
          location,
          isCurrentLocation: location?.id === currentLocationId,
          isNearby: nearbyLocations.some(nearby => nearby.id === location?.id)
        });
      }
      grid.push(row);
    }
    
    return grid;
  }, [worldData.locations, currentLocationId]);

  const handleLocationClick = (location: Location) => {
    setSelectedLocation(location);
    
    // Tính toán đường đi nếu không phải vị trí hiện tại
    if (location.id !== currentLocationId) {
      const path = locationService.getTravelPath(currentLocationId, location.id);
      setTravelPath(path);
    } else {
      setTravelPath([]);
    }
    
    // Không gọi onLocationClick ở đây nữa - chỉ chọn địa điểm
  };

  const handleTravelToLocation = (location: Location) => {
    // Gọi onLocationClick để paste message vào input
    onLocationClick(location.id);
  };

  const getLocationIcon = (location: Location) => {
    if (location.type === 'story') {
      return <MapPin className="w-3 h-3" />;
    } else {
      return <MapPin className="w-3 h-3" />;
    }
  };

  const getLocationColor = (cell: GridCell) => {
    if (!cell.location) return '';
    
    // Use locationSyncService for enhanced shop detection with fallback
    const isShop = locationSyncService.isShopLocation(cell.location);
    
    
    if (cell.isCurrentLocation) {
      return 'bg-green-500 text-white border-2 border-green-300 shadow-lg';
    } else if (cell.isNearby) {
      return 'bg-blue-400 text-white border-2 border-blue-200 shadow-md';
    } else if (isShop) {
      return 'bg-yellow-500 text-white border-2 border-yellow-300 shadow-md';
    } else if (cell.location.type === 'story') {
      return 'bg-red-500 text-white border-2 border-red-300 shadow-md';
    } else {
      return 'bg-blue-500 text-white border-2 border-blue-300 shadow-md';
    }
  };

  const getTravelInfo = (location: Location) => {
    if (location.id === currentLocationId) return null;
    
    const travelInfo = locationService.getTravelInfo(currentLocationId, location.id);
    return travelInfo;
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Bản Đồ Thế Giới
        </h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded border border-green-400"></div>
              <span className="text-white">Vị trí hiện tại</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded border border-red-400"></div>
              <span className="text-white">Địa điểm cốt truyện</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded border border-blue-400"></div>
              <span className="text-white">Địa điểm phụ</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded border border-yellow-400"></div>
              <span className="text-white">Cửa hàng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Grid */}
      <div className="bg-gray-900/50 rounded-lg p-4">
        <div className="max-w-full mx-auto">
          <div 
            className="relative"
            style={{
              width: '300px', // 15 * 20px
              height: '300px', // 15 * 20px
            }}
          >
            {/* Grid Lines */}
            <div className="absolute inset-0">
              {/* Vertical Lines */}
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={`v-${i}`}
                  className="absolute bg-gray-600"
                  style={{
                    left: `${i * 20}px`,
                    top: 0,
                    width: '1px',
                    height: '100%'
                  }}
                />
              ))}
              {/* Horizontal Lines */}
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={`h-${i}`}
                  className="absolute bg-gray-600"
                  style={{
                    top: `${i * 20}px`,
                    left: 0,
                    height: '1px',
                    width: '100%'
                  }}
                />
              ))}
            </div>
            
            {/* Travel Path Lines */}
            {travelPath.length > 1 && travelPath.map((point, index) => {
              // Bỏ qua điểm cuối cùng vì không có điểm tiếp theo để nối
              if (index === travelPath.length - 1) return null;
              
              const nextPoint = travelPath[index + 1];
              const isHorizontal = point.y === nextPoint.y;
              const isVertical = point.x === nextPoint.x;
              const isDiagonal = point.x !== nextPoint.x && point.y !== nextPoint.y;
              
              // Tính toán vị trí và kích thước của đường nối
              let lineStyle: React.CSSProperties = {};
              
              if (isHorizontal) {
                // Đường ngang - đi chính xác trên grid line
                const startX = Math.min(point.x, nextPoint.x) * 20;
                const width = Math.abs(nextPoint.x - point.x) * 20;
                lineStyle = {
                  left: `${startX}px`,
                  top: `${point.y * 20 - 1}px`, // -1px để nằm chính xác trên grid line
                  width: `${width}px`,
                  height: '2px',
                };
              } else if (isVertical) {
                // Đường dọc - đi chính xác trên grid line
                const startY = Math.min(point.y, nextPoint.y) * 20;
                const height = Math.abs(nextPoint.y - point.y) * 20;
                lineStyle = {
                  left: `${point.x * 20 - 1}px`, // -1px để nằm chính xác trên grid line
                  top: `${startY}px`,
                  width: '2px',
                  height: `${height}px`,
                };
              } else if (isDiagonal) {
                // Đường chéo - vẽ 2 đoạn ngang và dọc
                
                return (
                  <div key={`path-${index}`}>
                    {/* Đoạn ngang */}
                    <div
                      className="absolute bg-white shadow-lg"
                      style={{
                        left: `${Math.min(point.x, nextPoint.x) * 20}px`,
                        top: `${point.y * 20 - 1}px`,
                        width: `${Math.abs(nextPoint.x - point.x) * 20}px`,
                        height: '2px',
                      }}
                    />
                    {/* Đoạn dọc */}
                    <div
                      className="absolute bg-white shadow-lg"
                      style={{
                        left: `${nextPoint.x * 20 - 1}px`,
                        top: `${Math.min(point.y, nextPoint.y) * 20}px`,
                        width: '2px',
                        height: `${Math.abs(nextPoint.y - point.y) * 20}px`,
                      }}
                    />
                  </div>
                );
              }
              
              return (
                <div
                  key={`path-${index}`}
                  className="absolute bg-white shadow-lg"
                  style={lineStyle}
                />
              );
            })}

            {/* Location Markers */}
            {grid.map((row, y) => 
              row.map((cell, x) => {
                if (!cell.location) return null;
                
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`
                      absolute w-6 h-6 rounded-full flex items-center justify-center cursor-pointer
                      ${getLocationColor(cell)}
                    `}
                    style={{
                      left: `${x * 20 - 3}px`, // Center on grid intersection
                      top: `${y * 20 - 3}px`,
                    }}
                    onClick={() => handleLocationClick(cell.location!)}
                    title={cell.location.name}
                  >
                    {getLocationIcon(cell.location)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Location Details */}
      {selectedLocation && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Thông Tin Địa Điểm
          </h4>
          
          {(() => {
            const location = selectedLocation;
            if (!location) return null;
            
            const travelInfo = getTravelInfo(location);
            const isCurrentLocation = location.id === currentLocationId;
            
            return (
              <div className="space-y-3">
                <div>
                  <h5 className="text-white font-medium">{location.name}</h5>
                  <p className="text-gray-300 text-sm mt-1">{location.description}</p>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                <span className={`px-2 py-1 rounded text-xs ${
                  location.type === 'shop' || location.locationType === 'shop' || location.id.startsWith('loc_shop')
                    ? 'bg-yellow-500/20 text-yellow-300' 
                    : location.type === 'story' 
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {location.type === 'shop' || location.locationType === 'shop' || location.id.startsWith('loc_shop') ? 'Cửa hàng' :
                   location.type === 'story' ? 'Cốt truyện chính' : 
                   'Địa điểm phụ'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-300">{location.role}</span>
                </div>
                
                {travelInfo && (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Navigation className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {travelInfo.distance} bước ({travelInfo.travelMinutes} phút)
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {Math.floor(travelInfo.travelMinutes / 60)}h {travelInfo.travelMinutes % 60}m
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {isCurrentLocation && (
                  <div className="text-green-400 text-sm font-medium">
                    ✓ Bạn đang ở đây
                  </div>
                )}
                
                <div className="flex space-x-2 mt-3">
                  {!isCurrentLocation && travelInfo && (
                    <button
                      onClick={() => handleTravelToLocation(location)}
                      className={`flex-1 text-white py-2 px-4 rounded transition-colors ${
                        selectedLocationId === location.id
                          ? 'bg-green-600 hover:bg-green-700 ring-2 ring-green-400'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      title={selectedLocationId === location.id ? 'Click để hủy chọn' : ''}
                    >
                      {selectedLocationId === location.id 
                        ? '✓ Đã chọn - click để hủy' 
                        : `Di chuyển đến ${location.name}`
                      }
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedLocation(null);
                      setTravelPath([]);
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Current Location Info */}
      {(() => {
        const currentLocation = locationService.getLocationById(currentLocationId);
        if (!currentLocation) return null;
        
        return (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Vị Trí Hiện Tại
            </h4>
            
            <div className="space-y-2">
              <div>
                <h5 className="text-white font-medium">{currentLocation.name}</h5>
                <p className="text-gray-300 text-sm">{currentLocation.description}</p>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <span className={`px-2 py-1 rounded text-xs ${
                  currentLocation.type === 'shop' || currentLocation.locationType === 'shop' || currentLocation.id.startsWith('loc_shop')
                    ? 'bg-yellow-500/20 text-yellow-300' 
                    : currentLocation.type === 'story' 
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {currentLocation.type === 'shop' || currentLocation.locationType === 'shop' || currentLocation.id.startsWith('loc_shop') ? 'Cửa hàng' :
                   currentLocation.type === 'story' ? 'Cốt truyện chính' : 
                   'Địa điểm phụ'}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-300">{currentLocation.role}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
