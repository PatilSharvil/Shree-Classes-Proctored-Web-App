const XLSX = require('xlsx');
const env = require('../config/env');
const logger = require('../utils/logger');

class GitHubService {
  constructor() {
    this.octokit = null;
    this.owner = env.githubOwner;
    this.repo = env.githubRepo;
    this.branch = env.githubBranch;
    this.excelPath = env.excelPath;
    this.fileCache = new Map();
    this.lastFetchTime = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Only initialize Octokit if real credentials are configured
    if (this.isConfigured()) {
      const { Octokit } = require('octokit');
      this.octokit = new Octokit({ auth: env.githubToken });
    } else {
      logger.warn('GitHub sync is DISABLED — GITHUB_TOKEN or GITHUB_OWNER not configured in .env. This is OK for local development.');
    }
  }

  /**
   * Check if GitHub credentials are properly configured (not placeholders)
   */
  isConfigured() {
    const token = env.githubToken || '';
    const owner = env.githubOwner || '';
    const isPlaceholder = (v) => !v || v.includes('your-') || v.includes('placeholder') || v.trim() === '';
    return !isPlaceholder(token) && !isPlaceholder(owner);
  }


  /**
   * Get file content from GitHub
   */
  async getFile(filePath) {
    if (!this.isConfigured() || !this.octokit) return null;

    const cacheKey = filePath;
    const cached = this.fileCache.get(cacheKey);
    const now = new Date();

    // Return cached version if still valid
    if (cached && this.lastFetchTime.get(cacheKey)) {
      const age = now - this.lastFetchTime.get(cacheKey);
      if (age < this.CACHE_TTL) {
        logger.debug(`Using cached ${filePath}`);
        return cached;
      }
    }

    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        ref: this.branch
      });

      // Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      this.fileCache.set(cacheKey, content);
      this.lastFetchTime.set(cacheKey, now);

      logger.debug(`Fetched ${filePath} from GitHub`);
      return { content, sha: data.sha };
    } catch (error) {
      if (error.status === 404) {
        logger.debug(`File ${filePath} not found, will create`);
        return null;
      }
      logger.error(`Error fetching ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Update or create file in GitHub
   */
  async updateFile(filePath, content, message, sha = null) {
    if (!this.isConfigured() || !this.octokit) return null;

    try {
      const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch: this.branch
      });

      // Update cache
      this.fileCache.set(filePath, content);
      this.lastFetchTime.set(filePath, new Date());

      logger.info(`Updated ${filePath} in GitHub`);
      return data;
    } catch (error) {
      logger.error(`Error updating ${filePath}:`, error);
      
      // Handle conflict - fetch latest and retry once
      if (error.status === 409) {
        logger.warn(`Conflict on ${filePath}, fetching latest...`);
        const latest = await this.getFile(filePath);
        if (latest) {
          return this.updateFile(filePath, content, message, latest.sha);
        }
      }
      throw error;
    }
  }

  /**
   * Read CSV file and parse to JSON
   */
  async readCsv(sheetName) {
    const filePath = `${this.excelPath}/${sheetName}.csv`;
    const fileData = await this.getFile(filePath);

    if (!fileData) {
      logger.debug(`CSV file ${sheetName}.csv not found, returning empty array`);
      return [];
    }

    // Parse CSV
    const workbook = XLSX.read(fileData.content, { type: 'string', raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    logger.debug(`Read ${data.length} rows from ${sheetName}.csv`);
    return data;
  }

  /**
   * Write data to CSV file
   */
  async writeCsv(sheetName, data, commitMessage = null) {
    const filePath = `${this.excelPath}/${sheetName}.csv`;
    
    // Create CSV buffer from JSON
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    // Convert string to base64
    const content = Buffer.from(csvContent, 'utf-8').toString('base64');

    // Get current sha if exists
    const current = await this.getFile(filePath);
    const message = commitMessage || `Update ${sheetName}.csv - ${new Date().toISOString()}`;

    await this.updateFile(filePath, content, message, current?.sha);
    logger.info(`Wrote ${data.length} rows to ${sheetName}.csv`);
  }

  /**
   * Batch sync - write multiple CSV files
   */
  async batchSync(sheets) {
    if (!this.isConfigured()) {
      logger.debug('GitHub sync skipped — not configured.');
      return {};
    }

    logger.info(`Batch syncing ${Object.keys(sheets).length} sheets...`);
    
    const results = {};
    for (const [sheetName, data] of Object.entries(sheets)) {
      try {
        await this.writeCsv(sheetName, data);
        results[sheetName] = { success: true };
      } catch (error) {
        logger.error(`Failed to sync ${sheetName}:`, error);
        results[sheetName] = { success: false, error: error.message };
      }
    }
    
    return results;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.fileCache.clear();
    this.lastFetchTime.clear();
  }
}

module.exports = new GitHubService();
