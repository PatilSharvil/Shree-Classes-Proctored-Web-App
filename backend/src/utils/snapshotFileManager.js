const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Snapshot File Manager
 * Handles saving, retrieving, and cleaning up proctoring snapshot images
 * Stores images as files on disk instead of in database
 */
class SnapshotFileManager {
  constructor() {
    this.baseDir = path.join(__dirname, '../../data/proctoring-snapshots');
    this.ensureBaseDir();
  }

  /**
   * Ensure base directory exists
   */
  ensureBaseDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      logger.info(`[SnapshotManager] Created base directory: ${this.baseDir}`);
    }
  }

  /**
   * Generate file path for a snapshot
   * Organizes by year-month for better management
   */
  generateFilePath(snapshotId, detectionType) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dir = path.join(this.baseDir, yearMonth);
    
    // Ensure month directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fileName = `${snapshotId}_${detectionType}.jpg`;
    return path.join(dir, fileName);
  }

  /**
   * Save base64 image data to file
   * Returns file path and size
   */
  saveImage(base64Data, filePath) {
    try {
      // Remove data URL prefix if present
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
      
      const buffer = Buffer.from(base64Image, 'base64');
      fs.writeFileSync(filePath, buffer);
      
      const stats = fs.statSync(filePath);
      
      logger.info(`[SnapshotManager] Saved snapshot: ${filePath} (${(stats.size / 1024).toFixed(2)} KB)`);
      
      return {
        success: true,
        filePath,
        fileSize: stats.size
      };
    } catch (error) {
      logger.error(`[SnapshotManager] Error saving snapshot:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Read image file and return as base64
   */
  readImage(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      logger.error(`[SnapshotManager] Error reading snapshot:`, error);
      return null;
    }
  }

  /**
   * Delete snapshot file
   */
  deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`[SnapshotManager] Deleted snapshot: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`[SnapshotManager] Error deleting snapshot:`, error);
      return false;
    }
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return stats.size;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clean up expired snapshots
   * Deletes files that are past their expiration date
   */
  cleanupExpired(expiredFilePaths) {
    let deletedCount = 0;
    let freedSpace = 0;

    for (const filePath of expiredFilePaths) {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.baseDir, filePath);
      
      if (this.deleteFile(fullPath)) {
        deletedCount++;
        freedSpace += this.getFileSize(fullPath);
      }
    }

    logger.info(`[SnapshotManager] Cleanup: Deleted ${deletedCount} files, freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      deletedCount,
      freedSpace
    };
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    try {
      let totalFiles = 0;
      let totalSize = 0;

      const walkDir = (dir) => {
        if (!fs.existsSync(dir)) return;
        
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          
          if (file.isDirectory()) {
            walkDir(fullPath);
          } else if (file.name.endsWith('.jpg')) {
            totalFiles++;
            totalSize += fs.statSync(fullPath).size;
          }
        }
      };

      walkDir(this.baseDir);

      return {
        totalFiles,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        baseDir: this.baseDir
      };
    } catch (error) {
      logger.error(`[SnapshotManager] Error getting storage stats:`, error);
      return {
        totalFiles: 0,
        totalSize: 0,
        totalSizeMB: '0',
        baseDir: this.baseDir
      };
    }
  }

  /**
   * Get all snapshot files
   */
  getAllSnapshotFiles() {
    const snapshots = [];

    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          walkDir(fullPath);
        } else if (file.name.endsWith('.jpg')) {
          const stats = fs.statSync(fullPath);
          snapshots.push({
            filePath: fullPath,
            fileName: file.name,
            fileSize: stats.size,
            createdAt: stats.birthtime
          });
        }
      }
    };

    walkDir(this.baseDir);
    return snapshots;
  }
}

module.exports = new SnapshotFileManager();
