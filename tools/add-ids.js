#!/usr/bin/env node

/**
 * Add unique ID fields to steps in config-onboarding.json
 * IDs are inferred from step names and converted to camelCase
 * ID is placed as the first attribute in each step object
 */

const fs = require('fs');
const path = require('path');

// Convert string to camelCase
function toCamelCase(str) {
  return str
    // Remove special characters except spaces
    .replace(/[^a-zA-Z0-9\s]/g, '')
    // Split by spaces
    .split(/\s+/)
    // Capitalize first letter of each word except the first
    .map((word, index) => {
      if (!word) return '';
      if (index === 0) {
        // First word: lowercase first letter
        return word.charAt(0).toLowerCase() + word.slice(1);
      }
      // Other words: capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

// Ensure ID starts with a letter
function ensureValidId(id) {
  if (!id) return 'step';
  if (!/^[a-zA-Z]/.test(id)) {
    return 'step' + id.charAt(0).toUpperCase() + id.slice(1);
  }
  return id;
}

// Generate unique ID from name
function generateId(name, usedIds) {
  let baseId = toCamelCase(name);
  baseId = ensureValidId(baseId);

  // Handle duplicates
  let id = baseId;
  let counter = 2;
  while (usedIds.has(id)) {
    id = baseId + counter;
    counter++;
  }

  usedIds.add(id);
  return id;
}

// Reorder object to put id first
function reorderWithIdFirst(step, id) {
  const newStep = { id };

  // Copy all other properties
  for (const key in step) {
    if (key !== 'id') {
      newStep[key] = step[key];
    }
  }

  return newStep;
}

// Main function
function addIdsToConfig(configPath) {
  console.log(`Reading ${configPath}...`);

  // Read config file
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!config.steps || !Array.isArray(config.steps)) {
    console.error('Error: No steps array found in config');
    process.exit(1);
  }

  const usedIds = new Set();
  let addedCount = 0;
  let skippedCount = 0;

  // Process each step
  config.steps = config.steps.map((step, index) => {
    const stepNum = index + 1;

    let id;
    if (step.id) {
      // Step already has an ID - keep it but reorder
      id = step.id;
      console.log(`Step ${stepNum} ("${step.name}"): Already has ID "${id}"`);
      usedIds.add(step.id);
      skippedCount++;
    } else {
      // Generate ID from name
      id = generateId(step.name, usedIds);
      console.log(`Step ${stepNum} ("${step.name}"): Generated ID "${id}"`);
      addedCount++;
    }

    // Always return with id first (reorder all steps)
    return reorderWithIdFirst(step, id);
  });

  // Write back to file
  console.log(`\nWriting updated config to ${configPath}...`);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

  console.log('\nSummary:');
  console.log(`  Total steps: ${config.steps.length}`);
  console.log(`  IDs added: ${addedCount}`);
  console.log(`  IDs already present: ${skippedCount}`);
  console.log('\nDone!');
}

// Run the script
const configPath = process.argv[2] || 'config-onboarding.json';

if (!fs.existsSync(configPath)) {
  console.error(`Error: Config file not found: ${configPath}`);
  console.error('\nUsage: node add-ids.js [config-file.json]');
  process.exit(1);
}

try {
  addIdsToConfig(configPath);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
