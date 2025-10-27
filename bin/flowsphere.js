#!/usr/bin/env node

/**
 * FlowSphere CLI
 * Command-line interface for HTTP sequence runner
 */

const path = require('path');
const fs = require('fs');
const { runSequence } = require('../lib/executor');
const { promptSaveLog } = require('../lib/logger');

// Parse command-line arguments
const args = process.argv.slice(2);

// Show help
function showHelp() {
  console.log(`
FlowSphere - HTTP Sequence Runner

USAGE:
  flowsphere <config-file> [options]
  flowsphere studio
  flowsphere --version
  flowsphere --help

COMMANDS:
  <config-file>        Path to JSON config file to execute
  studio               Launch visual config editor in browser

OPTIONS:
  --start-step <n>     Start execution from step n (1-indexed)
  --version            Show version number
  --help               Show this help message

EXAMPLES:
  flowsphere config.json
  flowsphere examples/config-simple.json
  flowsphere config.json --start-step 5
  flowsphere studio

For more information, visit: https://github.com/yourusername/flowsphere
`);
}

// Show version
function showVersion() {
  const packageJson = require('../package.json');
  console.log(`FlowSphere v${packageJson.version}`);
}

// Launch studio
async function launchStudio() {
  console.log('Launching FlowSphere Studio...\n');

  const express = require('express');
  const open = require('open');

  const app = express();
  const studioPath = path.join(__dirname, '../studio');

  // Check if studio folder exists
  if (!fs.existsSync(studioPath)) {
    console.error('Error: Studio folder not found.');
    console.error('The config editor should be in: ' + studioPath);
    process.exit(1);
  }

  app.use(express.static(studioPath));

  // Use port 0 to get a random available port
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const url = `http://localhost:${port}`;

    console.log(`🎨 FlowSphere Studio running at: ${url}`);
    console.log('Press Ctrl+C to stop\n');

    // Open browser
    try {
      await open(url);
    } catch (error) {
      console.error('Could not open browser automatically. Please open the URL manually.');
    }
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\nStopping FlowSphere Studio...');
    server.close(() => {
      console.log('Goodbye!');
      process.exit(0);
    });
  });
}

// Main CLI logic
async function main() {
  // No arguments - show help
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];

  // Handle special commands
  if (command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    showVersion();
    process.exit(0);
  }

  if (command === 'studio') {
    await launchStudio();
    return;
  }

  // Otherwise, treat first argument as config file path
  const configPath = path.resolve(command);

  // Check if config file exists
  if (!fs.existsSync(configPath)) {
    console.error(`Error: Config file not found: ${configPath}`);
    process.exit(1);
  }

  // Parse options
  let startStep = 0;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--start-step' && args[i + 1]) {
      startStep = parseInt(args[i + 1]) - 1; // Convert to 0-indexed
      i++; // Skip next argument
    }
  }

  // Run the sequence
  try {
    const result = await runSequence(configPath, {
      startStep,
      enableDebug: false
    });

    // Prompt to save log
    if (result.success) {
      await promptSaveLog(result.executionLog, configPath);
      process.exit(0);
    } else {
      await promptSaveLog(result.executionLog, configPath);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\nFatal error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
