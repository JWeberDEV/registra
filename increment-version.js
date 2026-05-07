#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function incrementVersion() {
  const changelogPath = path.join(__dirname, 'CHANGELOG.json');
  
  if (!fs.existsSync(changelogPath)) {
    console.error('CHANGELOG.json not found');
    process.exit(1);
  }
  
  const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
  const currentVersion = changelog.currentVersion;
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  // Increment minor version
  const newVersion = `${major}.${minor + 1}.${patch}`;
  
  // Prompt for changes if running interactively
  const changes = process.argv.slice(2);
  if (changes.length === 0) {
    console.log('Usage: node increment-version.js "Change description 1" "Change description 2" ...');
    console.log('Example: node increment-version.js "Added payment method selection" "Fixed sidebar navigation"');
    process.exit(1);
  }
  
  // Create new version entry
  const newVersionEntry = {
    version: newVersion,
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    changes: changes
  };
  
  // Update changelog
  changelog.currentVersion = newVersion;
  changelog.versions.unshift(newVersionEntry); // Add to beginning of array
  
  // Write back to file
  fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2), 'utf8');
  
  console.log(`Version incremented from ${currentVersion} to ${newVersion}`);
  console.log(`Changes added:`);
  changes.forEach(change => console.log(`  - ${change}`));
}

incrementVersion();