import { WorldTime } from '../types';

class WorldTimeService {
  private static instance: WorldTimeService;
  private timeInterval: any = null;
  private timeSpeed: number = 1; // 1 = real time, 2 = 2x speed, etc.

  private constructor() {}

  static getInstance(): WorldTimeService {
    if (!WorldTimeService.instance) {
      WorldTimeService.instance = new WorldTimeService();
    }
    return WorldTimeService.instance;
  }

  /**
   * Initialize world time from start year
   */
  initializeWorldTime(startYear: number): WorldTime {
    return {
      hour: 0,
      day: 1,
      month: 1,
      year: startYear,
      dayOfWeek: 1 // Monday (assuming world starts on Monday)
    };
  }

  /**
   * Advance time by specified hours
   */
  advanceTime(currentTime: WorldTime, hours: number): WorldTime {
    let newTime = { ...currentTime };
    newTime.hour += hours;

    // Handle hour overflow
    while (newTime.hour >= 24) {
      newTime.hour -= 24;
      newTime.day++;
      newTime.dayOfWeek = (newTime.dayOfWeek + 1) % 7;
    }

    // Handle day overflow (simplified - assuming all months have 30 days)
    while (newTime.day > 30) {
      newTime.day -= 30;
      newTime.month++;
    }

    // Handle month overflow
    while (newTime.month > 12) {
      newTime.month -= 12;
      newTime.year++;
    }

    return newTime;
  }

  /**
   * Format time for display
   */
  formatTime(time: WorldTime): string {
    const hourStr = time.hour.toString().padStart(2, '0');
    const dayStr = time.day.toString().padStart(2, '0');
    const monthStr = time.month.toString().padStart(2, '0');
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    
    return `${hourStr}:00 - ${dayNames[time.dayOfWeek]}, ${dayStr}/${monthStr}/${time.year}`;
  }

  /**
   * Get short time format
   */
  formatShortTime(time: WorldTime): string {
    const hourStr = time.hour.toString().padStart(2, '0');
    const dayStr = time.day.toString().padStart(2, '0');
    const monthStr = time.month.toString().padStart(2, '0');
    
    return `${hourStr}:00 ${dayStr}/${monthStr}/${time.year}`;
  }

  /**
   * Get time of day description
   */
  getTimeOfDay(time: WorldTime): string {
    if (time.hour >= 5 && time.hour < 12) return 'Sáng';
    if (time.hour >= 12 && time.hour < 17) return 'Chiều';
    if (time.hour >= 17 && time.hour < 21) return 'Tối';
    return 'Đêm';
  }

  /**
   * Get season based on month
   */
  getSeason(time: WorldTime): string {
    const month = time.month;
    if (month >= 3 && month <= 5) return 'Xuân';
    if (month >= 6 && month <= 8) return 'Hạ';
    if (month >= 9 && month <= 11) return 'Thu';
    return 'Đông';
  }

  /**
   * Calculate time difference in hours
   */
  getTimeDifference(time1: WorldTime, time2: WorldTime): number {
    const totalHours1 = time1.year * 365 * 24 + time1.month * 30 * 24 + time1.day * 24 + time1.hour;
    const totalHours2 = time2.year * 365 * 24 + time2.month * 30 * 24 + time2.day * 24 + time2.hour;
    return Math.abs(totalHours2 - totalHours1);
  }

  /**
   * Save time to localStorage
   */
  saveTime(worldId: string, time: WorldTime): void {
    localStorage.setItem(`world_time_${worldId}`, JSON.stringify(time));
  }

  /**
   * Load time from localStorage
   */
  loadTime(worldId: string): WorldTime | null {
    const saved = localStorage.getItem(`world_time_${worldId}`);
    return saved ? JSON.parse(saved) : null;
  }

  /**
   * Start automatic time progression (for future use)
   */
  startTimeProgression(worldId: string, onTimeUpdate: (time: WorldTime) => void): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }

    this.timeInterval = setInterval(() => {
      const currentTime = this.loadTime(worldId);
      if (currentTime) {
        const newTime = this.advanceTime(currentTime, this.timeSpeed);
        this.saveTime(worldId, newTime);
        onTimeUpdate(newTime);
      }
    }, 1000 / this.timeSpeed); // Update every second
  }

  /**
   * Stop automatic time progression
   */
  stopTimeProgression(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }
  }

  /**
   * Set time speed multiplier
   */
  setTimeSpeed(speed: number): void {
    this.timeSpeed = Math.max(0.1, Math.min(10, speed)); // Clamp between 0.1x and 10x
  }
}

export const worldTimeService = WorldTimeService.getInstance();
