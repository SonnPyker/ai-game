class ImageStorageService {
  private static instance: ImageStorageService;
  private dbName: string = 'GameImageDB';
  private dbVersion: number = 1;
  private storeName: string = 'images';
  private maxImages: number = 100;
  private db: IDBDatabase | null = null;

  private constructor() {
    this.initDB();
  }

  public static getInstance(): ImageStorageService {
    if (!ImageStorageService.instance) {
      ImageStorageService.instance = new ImageStorageService();
    }
    return ImageStorageService.instance;
  }

  // Initialize IndexedDB
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('ImageStorageService: Using IndexedDB for image storage');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'filename' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Save image to IndexedDB
  async saveImage(base64Data: string, filename: string): Promise<string> {
    try {
      if (!this.db) {
        await this.initDB();
      }
      
      // Remove data URL prefix if present
      const base64Content = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Create file path
      const filepath = `indexeddb://${filename}`;
      
      // Store in IndexedDB
      const imageData = {
        filename: filename,
        filepath: filepath,
        base64: base64Content,
        timestamp: Date.now(),
        size: base64Content.length
      };
      
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put(imageData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Clean up old images
      await this.cleanupOldImages();
      
      return filepath;
    } catch (error) {
      console.error('Failed to save image:', error);
      throw new Error('Không thể lưu ảnh');
    }
  }

  // Load image from IndexedDB
  async loadImage(filepath: string): Promise<string | null> {
    try {
      if (!this.db) {
        await this.initDB();
      }
      
      const filename = filepath.replace('indexeddb://', '');
      if (!filename) return null;
      
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const imageData = await new Promise<any>((resolve, reject) => {
        const request = store.get(filename);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!imageData) return null;
      
      return `data:image/png;base64,${imageData.base64}`;
    } catch (error) {
      console.error('Failed to load image:', error);
      return null;
    }
  }

  // Get image URL for display (base64 data URL)
  async getImageUrl(filepath: string): Promise<string | null> {
    return await this.loadImage(filepath);
  }

  // List all saved images
  async listImages(): Promise<string[]> {
    try {
      if (!this.db) {
        await this.initDB();
      }
      
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      
      const images = await new Promise<string[]>((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => {
          const results = request.result
            .sort((a, b) => b.timestamp - a.timestamp) // Newest first
            .map(item => item.filepath);
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
      
      return images;
    } catch (error) {
      console.error('Failed to list images:', error);
      return [];
    }
  }

  // Delete image
  async deleteImage(filepath: string): Promise<void> {
    try {
      if (!this.db) {
        await this.initDB();
      }
      
      const filename = filepath.replace('indexeddb://', '');
      if (!filename) return;
      
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(filename);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }

  // Clean up old images (keep last maxImages)
  async cleanupOldImages(): Promise<void> {
    try {
      const images = await this.listImages();
      
      if (images.length > this.maxImages) {
        const imagesToDelete = images.slice(this.maxImages);
        
        for (const imagePath of imagesToDelete) {
          await this.deleteImage(imagePath);
        }
        
        console.log(`Cleaned up ${imagesToDelete.length} old images`);
      }
    } catch (error) {
      console.error('Failed to cleanup old images:', error);
    }
  }

  // Get image data by filepath
  // private async getImageData(filepath: string): Promise<any> {
  //   try {
  //     if (!this.db) {
  //       await this.initDB();
  //     }
      
  //     const filename = filepath.replace('indexeddb://', '');
  //     if (!filename) return null;
      
  //     const transaction = this.db!.transaction([this.storeName], 'readonly');
  //     const store = transaction.objectStore(this.storeName);
      
  //     return await new Promise<any>((resolve, reject) => {
  //       const request = store.get(filename);
  //       request.onsuccess = () => resolve(request.result);
  //       request.onerror = () => reject(request.error);
  //     });
  //   } catch (error) {
  //     return null;
  //   }
  // }

  // Get storage usage info
  async getStorageInfo(): Promise<{ totalImages: number; totalSize: number; maxImages: number }> {
    try {
      if (!this.db) {
        await this.initDB();
      }
      
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const allImages = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const totalImages = allImages.length;
      const totalSize = allImages.reduce((sum, img) => sum + (img.size || 0), 0);
      
      return {
        totalImages,
        totalSize,
        maxImages: this.maxImages
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { totalImages: 0, totalSize: 0, maxImages: this.maxImages };
    }
  }

  // Clear all images
  async clearAllImages(): Promise<void> {
    try {
      if (!this.db) {
        await this.initDB();
      }
      
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      console.log('Cleared all images from IndexedDB');
    } catch (error) {
      console.error('Failed to clear all images:', error);
    }
  }

  // Set max images limit
  setMaxImages(max: number): void {
    this.maxImages = Math.max(1, max);
  }
}

export const imageStorageService = ImageStorageService.getInstance();
