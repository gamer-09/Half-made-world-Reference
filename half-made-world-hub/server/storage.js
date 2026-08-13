const fs = require('fs');
const path = require('path');
const seed = require('./seed');
const relSeed = require('./seed-relationships');
const linkSeed = require('./seed-story-links');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'world.json');
const REL_FILE = path.join(DATA_DIR, 'relationships.json');
const LINK_FILE = path.join(DATA_DIR, 'story-links.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf-8');
  }
  if (!fs.existsSync(REL_FILE)) {
    fs.writeFileSync(REL_FILE, JSON.stringify(relSeed, null, 2), 'utf-8');
  }
  if (!fs.existsSync(LINK_FILE)) {
    fs.writeFileSync(LINK_FILE, JSON.stringify(linkSeed, null, 2), 'utf-8');
  }
}

function readJson(file, resetFn) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.error(`[storage] Failed to parse ${path.basename(file)}, reseeding:`, err.message);
    return resetFn();
  }
}

// --- Entries --------------------------------------------------------------
function loadWorld() {
  ensureDataFile();
  return readJson(DATA_FILE, resetWorld);
}

function saveWorld(world) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(world, null, 2), 'utf-8');
}

function resetWorld() {
  saveWorld(seed);
  return seed;
}

// --- Relationships --------------------------------------------------------
function loadRelationships() {
  ensureDataFile();
  return readJson(REL_FILE, resetRelationships);
}

function saveRelationships(list) {
  ensureDataFile();
  fs.writeFileSync(REL_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

function resetRelationships() {
  saveRelationships(relSeed);
  return relSeed;
}

// --- Story links ----------------------------------------------------------
function loadStoryLinks() {
  ensureDataFile();
  return readJson(LINK_FILE, resetStoryLinks);
}

function saveStoryLinks(list) {
  ensureDataFile();
  fs.writeFileSync(LINK_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

function resetStoryLinks() {
  saveStoryLinks(linkSeed);
  return linkSeed;
}

module.exports = {
  loadWorld,
  saveWorld,
  resetWorld,
  loadRelationships,
  saveRelationships,
  resetRelationships,
  loadStoryLinks,
  saveStoryLinks,
  resetStoryLinks,
  DATA_FILE,
  REL_FILE,
  LINK_FILE,
};
