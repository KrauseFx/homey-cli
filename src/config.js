'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function getConfigDir() {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'homey-cli');
}

function getStorePath() {
  return path.join(getConfigDir(), 'credentials.json');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

function ensureConfigDir() {
  fs.mkdirSync(getConfigDir(), { recursive: true });
}

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch (err) {
    const message = `Failed to read JSON from ${filePath}: ${err.message}`;
    const error = new Error(message);
    error.cause = err;
    throw error;
  }
}

function writeJson(filePath, value) {
  ensureConfigDir();
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function loadConfig() {
  return readJson(getConfigPath()) || {};
}

function saveConfig(config) {
  writeJson(getConfigPath(), config);
}

module.exports = {
  getConfigDir,
  getStorePath,
  getConfigPath,
  ensureConfigDir,
  readJson,
  writeJson,
  loadConfig,
  saveConfig,
};
