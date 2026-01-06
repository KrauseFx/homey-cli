'use strict';

const fs = require('node:fs');
const path = require('node:path');
const AthomCloudAPI = require('homey-api/lib/AthomCloudAPI');
const { getStorePath, ensureConfigDir } = require('../config');

class FileStorageAdapter extends AthomCloudAPI.StorageAdapter {
  constructor({ filePath } = {}) {
    super();
    this.filePath = filePath || getStorePath();
  }

  async get() {
    try {
      if (!fs.existsSync(this.filePath)) return {};
      const raw = fs.readFileSync(this.filePath, 'utf8');
      if (!raw.trim()) return {};
      return JSON.parse(raw);
    } catch (err) {
      const message = `Failed to read credentials store at ${this.filePath}: ${err.message}`;
      const error = new Error(message);
      error.cause = err;
      throw error;
    }
  }

  async set(value) {
    ensureConfigDir();
    const payload = value && typeof value === 'object' ? value : {};
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.filePath);
  }
}

module.exports = {
  FileStorageAdapter,
};
