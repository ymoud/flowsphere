#!/usr/bin/env node

/**
 * Test script to verify structure vs value validation separation
 */

const { validateConfig } = require('../lib/config-validator');

// Test config with both structure and value errors
const testConfig = {
  "defaults": {
    "baseUrl": "https://api.example.com"
  },
  "nodes": [
    {
      "id": "node-1",
      "name": "Valid node",
      "method": "GET",
      "url": "/users/1"
    },
    {
      "id": "node-1",  // VALUE ERROR: Duplicate ID
      "name": "Duplicate ID node",
      "method": "GET",
      "url": "/posts/1"
    },
    {
      "id": "node-2",
      "name": "Bad reference",
      "method": "GET",
      "url": "/users/{{ .responses.nonexistent.id }}"  // VALUE ERROR: Non-existent node reference
    },
    {
      "id": "node-3",
      "name": "Missing method",  // STRUCTURE ERROR: Missing method field
      "url": "/posts/1"
    }
  ]
};

console.log('Testing validator category separation...\n');

// Test 1: Full validation (both structure + value)
console.log('=== Test 1: Full Validation (structure + value) ===');
const fullResult = validateConfig(testConfig);
console.log(`Errors found: ${fullResult.errors.length}`);
fullResult.errors.forEach((err, idx) => {
  console.log(`  ${idx + 1}. [${err.category || 'uncategorized'}] ${err.message}`);
});

// Test 2: Structure only
console.log('\n=== Test 2: Structure Only Validation ===');
const structureResult = validateConfig(testConfig, { structureOnly: true });
console.log(`Errors found: ${structureResult.errors.length}`);
structureResult.errors.forEach((err, idx) => {
  console.log(`  ${idx + 1}. [${err.category || 'uncategorized'}] ${err.message}`);
});

// Test 3: Values only
console.log('\n=== Test 3: Values Only Validation ===');
const valuesResult = validateConfig(testConfig, { valuesOnly: true });
console.log(`Errors found: ${valuesResult.errors.length}`);
valuesResult.errors.forEach((err, idx) => {
  console.log(`  ${idx + 1}. [${err.category || 'uncategorized'}] ${err.message}`);
});

console.log('\n=== Expected Results ===');
console.log('Full validation: Should find all errors (structure + value)');
console.log('Structure only: Should find only "Missing method" error');
console.log('Values only: Should find only "Duplicate ID" and "Non-existent reference" errors');
