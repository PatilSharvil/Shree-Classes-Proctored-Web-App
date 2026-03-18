const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class ExcelService {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.ensureDataDir();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Read Excel file from local disk
   */
  readLocalExcel(fileName) {
    const filePath = path.join(this.dataDir, `${fileName}.xlsx`);
    
    if (!fs.existsSync(filePath)) {
      logger.debug(`Local Excel file ${fileName}.xlsx not found`);
      return [];
    }

    try {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      logger.debug(`Read ${data.length} rows from ${fileName}.xlsx`);
      return data;
    } catch (error) {
      logger.error(`Error reading ${fileName}.xlsx:`, error);
      return [];
    }
  }

  /**
   * Write data to local Excel file
   */
  writeLocalExcel(fileName, data) {
    const filePath = path.join(this.dataDir, `${fileName}.xlsx`);
    
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      XLSX.writeFile(workbook, filePath);
      
      logger.info(`Wrote ${data.length} rows to ${fileName}.xlsx`);
      return true;
    } catch (error) {
      logger.error(`Error writing ${fileName}.xlsx:`, error);
      return false;
    }
  }

  /**
   * Append rows to existing Excel file
   */
  appendToExcel(fileName, newRows) {
    const existingData = this.readLocalExcel(fileName);
    const combinedData = [...existingData, ...newRows];
    return this.writeLocalExcel(fileName, combinedData);
  }

  /**
   * Sync local Excel to GitHub (via GitHubService)
   * This is called periodically by a background job
   */
  async syncToGitHub(githubService, sheetNames = null) {
    const sheets = {};
    
    if (sheetNames) {
      for (const name of sheetNames) {
        const data = this.readLocalExcel(name);
        sheets[name] = data;
      }
    } else {
      // Sync all Excel files
      const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.xlsx'));
      for (const file of files) {
        const name = path.basename(file, '.xlsx');
        const data = this.readLocalExcel(name);
        sheets[name] = data;
      }
    }

    return githubService.batchSync(sheets);
  }

  /**
   * Import Excel file (for bulk upload)
   */
  importFromBuffer(buffer, sheetName = 0) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[sheetName]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      logger.debug(`Imported ${data.length} rows from buffer`);
      return data;
    } catch (error) {
      logger.error(`Error importing Excel from buffer:`, error);
      throw error;
    }
  }

  /**
   * Export data to Excel buffer
   */
  exportToBuffer(data, fileName = 'export') {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }
}

module.exports = new ExcelService();
