// Global application state
let config = null;
let fileName = 'config.json';
let openStepIndices = new Set(); // Track which steps are currently open

// Autocomplete state
let autocompleteDropdown = null;
let autocompleteTarget = null;
let autocompleteSelectedIndex = -1;
let autocompleteSuggestions = [];
let autocompleteStepIndex = null; // Track the step index for current autocomplete session
