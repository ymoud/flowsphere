// ========================================
// AUTOCOMPLETE FUNCTIONALITY
// ========================================

function initAutocomplete() {
    // Create dropdown element if it doesn't exist
    if (!autocompleteDropdown) {
        autocompleteDropdown = document.createElement('div');
        autocompleteDropdown.className = 'autocomplete-dropdown';
        document.body.appendChild(autocompleteDropdown);
    }

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (autocompleteDropdown && !autocompleteDropdown.contains(e.target) && e.target !== autocompleteTarget) {
            hideAutocomplete();
        }
    });
}

function attachAutocompleteToInput(input, stepIndex = null, mode = 'template') {
    // Store the mode on the input element
    input.dataset.autocompleteMode = mode;

    input.addEventListener('input', function(e) {
        if (mode === 'jq') {
            handleJqAutocompleteInput(e.target);
        } else {
            handleAutocompleteInput(e.target, stepIndex);
        }
    });

    input.addEventListener('keydown', function(e) {
        if (!autocompleteDropdown || !autocompleteDropdown.classList.contains('show')) {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            autocompleteSelectedIndex = Math.min(autocompleteSelectedIndex + 1, autocompleteSuggestions.length - 1);
            updateAutocompleteSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            autocompleteSelectedIndex = Math.max(autocompleteSelectedIndex - 1, -1);
            updateAutocompleteSelection();
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (autocompleteSelectedIndex >= 0 && autocompleteSelectedIndex < autocompleteSuggestions.length) {
                e.preventDefault();
                selectAutocompleteSuggestion(autocompleteSuggestions[autocompleteSelectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hideAutocomplete();
        }
    });

    // Handle blur with slight delay to allow clicking on dropdown
    input.addEventListener('blur', function(e) {
        setTimeout(() => {
            if (autocompleteTarget === e.target) {
                hideAutocomplete();
            }
        }, 200);
    });
}

function handleAutocompleteInput(input, stepIndex) {
    const value = input.value;
    const cursorPos = input.selectionStart;

    // Find if cursor is after "{{" and before "}}"
    const beforeCursor = value.substring(0, cursorPos);
    const lastOpenBrace = beforeCursor.lastIndexOf('{{');

    if (lastOpenBrace === -1) {
        hideAutocomplete();
        return;
    }

    const afterLastBrace = beforeCursor.substring(lastOpenBrace + 2);
    const hasCloseBrace = afterLastBrace.includes('}}');

    if (hasCloseBrace) {
        hideAutocomplete();
        return;
    }

    // Get the partial text after "{{"
    const partialText = afterLastBrace.trim();

    // Store the stepIndex for this autocomplete session
    autocompleteStepIndex = stepIndex;

    // Build suggestions
    const suggestions = buildAutocompleteSuggestions(partialText, stepIndex);

    if (suggestions.length > 0) {
        showAutocomplete(input, suggestions, lastOpenBrace + 2);
    } else {
        hideAutocomplete();
    }
}

function buildAutocompleteSuggestions(partialText, stepIndex) {
    const suggestions = [];

    if (!config) return suggestions;

    // Count dots in partialText to determine nesting level
    const dotCount = (partialText.match(/\./g) || []).length;

    // Category: Basic Syntax (only show when starting fresh or typing first level)
    // Don't show if user has already typed a complete keyword like ".responses." (2+ dots)
    if (partialText.length <= 3 && dotCount < 2) {
        const basicSuggestions = [];

        // Add dynamic variables ($guid, $timestamp)
        const guidSyntax = ' $guid';
        const timestampSyntax = ' $timestamp';
        if (guidSyntax.toLowerCase().includes(partialText.toLowerCase()) || partialText === '') {
            basicSuggestions.push({
                text: guidSyntax,
                display: '$guid',
                hint: 'Generate unique UUID',
                category: 'Basic Syntax'
            });
        }
        if (timestampSyntax.toLowerCase().includes(partialText.toLowerCase()) || partialText === '') {
            basicSuggestions.push({
                text: timestampSyntax,
                display: '$timestamp',
                hint: 'Current Unix timestamp',
                category: 'Basic Syntax'
            });
        }

        // Add .vars if there are variables
        if (config.variables && Object.keys(config.variables).length > 0) {
            const varSyntax = ' .vars.';
            // Only match if suggestion starts with what user typed
            if (varSyntax.toLowerCase().startsWith(partialText.toLowerCase()) || partialText === '') {
                basicSuggestions.push({
                    text: varSyntax,
                    display: '.vars.<variableName>',
                    hint: 'Access global variables',
                    category: 'Basic Syntax'
                });
            }
        }

        // Add .responses if there are previous steps
        if (config.steps && config.steps.length > 0 && stepIndex !== null && stepIndex > 0) {
            const respNamedSyntax = ' .responses.';
            // Only match if suggestion starts with what user typed
            if (respNamedSyntax.toLowerCase().startsWith(partialText.toLowerCase()) || partialText === '') {
                basicSuggestions.push({
                    text: respNamedSyntax,
                    display: '.responses.<stepId>.<field>',
                    hint: 'Access previous step response by ID',
                    category: 'Basic Syntax'
                });
            }
        }

        // Add .input if there are prompts
        if (stepIndex !== null && config.steps && config.steps[stepIndex]) {
            const step = config.steps[stepIndex];
            if (step.prompts && Object.keys(step.prompts).length > 0) {
                const inputSyntax = ' .input.';
                // Only match if suggestion starts with what user typed
                if (inputSyntax.toLowerCase().startsWith(partialText.toLowerCase()) || partialText === '') {
                    basicSuggestions.push({
                        text: inputSyntax,
                        display: '.input.<variableName>',
                        hint: 'Access user input from prompts',
                        category: 'Basic Syntax'
                    });
                }
            }
        }

        if (basicSuggestions.length > 0) {
            suggestions.push({ isCategory: true, name: 'Basic Syntax' });
            suggestions.push(...basicSuggestions);
        }
    }

    // Category: Global Variables
    if (config.variables && Object.keys(config.variables).length > 0) {
        const varSuggestions = [];
        for (const [key, value] of Object.entries(config.variables)) {
            const suggestion = ` .vars.${key}`;
            if (suggestion.toLowerCase().includes(partialText.toLowerCase()) || partialText === '') {
                varSuggestions.push({
                    text: suggestion,
                    display: `.vars.${key}`,
                    hint: `Global variable: ${JSON.stringify(value)}`,
                    category: 'Global Variables'
                });
            }
        }
        if (varSuggestions.length > 0) {
            suggestions.push({ isCategory: true, name: 'Global Variables' });
            suggestions.push(...varSuggestions);
        }
    }

    // Category: Response References
    if (config.steps && config.steps.length > 0 && stepIndex !== null) {
        const respSuggestions = [];

        // Add named references (by step ID)
        for (let i = 0; i < Math.min(stepIndex, config.steps.length); i++) {
            const step = config.steps[i];
            if (step.id) {
                const namedRef = ` .responses.${step.id}`;

                if (namedRef.toLowerCase().includes(partialText.toLowerCase()) || partialText === '') {
                    respSuggestions.push({
                        text: namedRef + '.',
                        display: `.responses.${step.id}.<field>`,
                        hint: `Response from step: ${step.name || step.id}`,
                        category: 'Response References'
                    });
                }
            }
        }

        if (respSuggestions.length > 0) {
            suggestions.push({ isCategory: true, name: 'Response References' });
            suggestions.push(...respSuggestions);
        }
    }

    // Category: User Input (from current step's prompts)
    if (stepIndex !== null && config.steps && config.steps[stepIndex]) {
        const step = config.steps[stepIndex];
        if (step.prompts && Object.keys(step.prompts).length > 0) {
            const inputSuggestions = [];
            for (const key of Object.keys(step.prompts)) {
                const suggestion = ` .input.${key}`;
                if (suggestion.toLowerCase().includes(partialText.toLowerCase()) || partialText === '') {
                    inputSuggestions.push({
                        text: suggestion,
                        display: `.input.${key}`,
                        hint: `User input: ${step.prompts[key]}`,
                        category: 'User Input'
                    });
                }
            }
            if (inputSuggestions.length > 0) {
                suggestions.push({ isCategory: true, name: 'User Input (Current Step)' });
                suggestions.push(...inputSuggestions);
            }
        }
    }

    return suggestions;
}

// ========================================
// JQ AUTOCOMPLETE (for jsonpath fields)
// ========================================

function handleJqAutocompleteInput(input) {
    const value = input.value;
    const cursorPos = input.selectionStart;

    // Build jq suggestions based on current context
    const suggestions = buildJqSuggestions(value, cursorPos);

    if (suggestions.length > 0) {
        showJqAutocomplete(input, suggestions);
    } else {
        hideAutocomplete();
    }
}

function buildJqSuggestions(value, cursorPos) {
    const suggestions = [];

    // Get text before cursor to understand context
    const beforeCursor = value.substring(0, cursorPos);
    const afterCursor = value.substring(cursorPos);

    // Only show suggestions if field is empty or user just typed something
    // Check if we should show suggestions (typing at start, after space, or after pipe)
    const lastChar = beforeCursor.slice(-1);
    const isEmpty = beforeCursor.trim() === '';
    const afterPipe = beforeCursor.trim().endsWith('|');
    const afterSpace = lastChar === ' ' && !isEmpty;

    // Show suggestions when: empty field, after pipe, or field is short
    if (isEmpty || afterPipe || beforeCursor.length <= 2) {
        // Common Pattern 1: Filter array by field value
        suggestions.push({
            text: '.[] | select(.field == "value")',
            display: '.[] | select(.field == "value")',
            hint: 'Find items in array where field equals value',
            category: 'Common Patterns',
            isTemplate: true
        });

        // Common Pattern 2: Count matching items
        suggestions.push({
            text: '[.[] | select(.field == "value")] | length',
            display: '[.[] | select(...)] | length',
            hint: 'Count items matching condition',
            category: 'Common Patterns',
            isTemplate: true
        });

        // Common Pattern 3: Check field length
        suggestions.push({
            text: '.field | length',
            display: '.field | length',
            hint: 'Get length of array or string field',
            category: 'Common Patterns',
            isTemplate: true
        });

        // Format with categories
        if (suggestions.length > 0) {
            const withCategory = [{ isCategory: true, name: 'Common jq Patterns' }];
            return withCategory.concat(suggestions);
        }
    }

    return suggestions;
}

function showJqAutocomplete(input, suggestions) {
    // Reuse existing showAutocomplete but don't require {{ }}
    showAutocomplete(input, suggestions, 0);
}

function getCaretCoordinates(input) {
    const position = input.selectionStart;

    if (input.tagName === 'TEXTAREA') {
        // Create mirror div for textarea
        const div = document.createElement('div');
        const computed = window.getComputedStyle(input);
        const isFirefox = window.mozInnerScreenX != null;

        // Copy all CSS properties
        div.style.position = 'absolute';
        div.style.top = '0px';
        div.style.left = '-9999px';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordWrap = 'break-word';

        // Transfer CSS properties
        const properties = [
            'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
            'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
            'borderStyle', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
            'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform',
            'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize'
        ];

        properties.forEach(prop => {
            div.style[prop] = computed[prop];
        });

        // Firefox needs this
        if (isFirefox) {
            if (input.scrollHeight > parseInt(computed.height)) {
                div.style.overflowY = 'scroll';
            }
        } else {
            div.style.overflow = 'hidden';
        }

        document.body.appendChild(div);

        // Get text before caret
        const textContent = input.value.substring(0, position);
        div.textContent = textContent;

        // Create span at caret position
        const span = document.createElement('span');
        span.textContent = input.value.substring(position) || '.';
        div.appendChild(span);

        const coordinates = {
            top: span.offsetTop - input.scrollTop,
            left: span.offsetLeft - input.scrollLeft
        };

        document.body.removeChild(div);

        return coordinates;
    } else {
        // For single-line input
        const div = document.createElement('div');
        const computed = window.getComputedStyle(input);

        div.style.position = 'absolute';
        div.style.top = '0px';
        div.style.left = '-9999px';
        div.style.whiteSpace = 'nowrap';

        // Transfer CSS properties
        const properties = [
            'boxSizing', 'width',
            'borderLeftWidth', 'borderRightWidth',
            'paddingLeft', 'paddingRight',
            'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
            'fontFamily', 'letterSpacing'
        ];

        properties.forEach(prop => {
            div.style[prop] = computed[prop];
        });

        document.body.appendChild(div);

        // Get text before caret
        const textContent = input.value.substring(0, position);
        div.textContent = textContent;

        // Create span at caret position
        const span = document.createElement('span');
        span.textContent = input.value.substring(position) || '.';
        div.appendChild(span);

        const coordinates = {
            top: parseInt(computed.height) - 5,
            left: span.offsetLeft - input.scrollLeft
        };

        document.body.removeChild(div);

        return coordinates;
    }
}

function showAutocomplete(input, suggestions, bracePosition) {
    if (!autocompleteDropdown) return;

    autocompleteTarget = input;
    autocompleteSuggestions = suggestions.filter(s => !s.isCategory);
    autocompleteSelectedIndex = -1;

    // Build dropdown HTML
    let html = '';
    let currentCategory = null;

    for (const suggestion of suggestions) {
        if (suggestion.isCategory) {
            html += `<div class="autocomplete-category">${suggestion.name}</div>`;
        } else {
            html += `
                <div class="autocomplete-item" data-text="${suggestion.text.replace(/"/g, '&quot;')}">
                    <div class="autocomplete-item-main">${escapeHtml(suggestion.display)}</div>
                    <div class="autocomplete-item-hint">${escapeHtml(suggestion.hint)}</div>
                </div>
            `;
        }
    }

    autocompleteDropdown.innerHTML = html;

    // Make dropdown visible first (but position off-screen) so browser can calculate dimensions
    autocompleteDropdown.style.visibility = 'hidden';
    autocompleteDropdown.classList.add('show');

    // Use requestAnimationFrame to ensure DOM is laid out before calculating position
    requestAnimationFrame(() => {
        // Position dropdown at caret (text cursor)
        const rect = input.getBoundingClientRect();
        const caretPos = getCaretCoordinates(input);
        const inputStyle = window.getComputedStyle(input);
        const lineHeight = parseInt(inputStyle.lineHeight) || parseInt(inputStyle.fontSize) * 1.2 || 18;

        // Calculate absolute position
        // For textarea, add lineHeight to position below the current line
        // For input, caretPos.top already accounts for the input height
        let top, left;

        if (input.tagName === 'TEXTAREA') {
            top = rect.top + window.scrollY + caretPos.top + lineHeight + 2;
            left = rect.left + window.scrollX + caretPos.left;
        } else {
            top = rect.top + window.scrollY + caretPos.top;
            left = rect.left + window.scrollX + caretPos.left;
        }

        // Get actual dropdown height after layout
        const dropdownHeight = autocompleteDropdown.offsetHeight;
        const dropdownWidth = 250;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Adjust if goes off right edge
        if (left + dropdownWidth > window.scrollX + viewportWidth) {
            left = Math.max(10, window.scrollX + viewportWidth - dropdownWidth - 10);
        }

        // Adjust if goes off bottom edge (use actual height instead of max height)
        if (top + dropdownHeight > window.scrollY + viewportHeight) {
            // Position above caret instead
            if (input.tagName === 'TEXTAREA') {
                top = rect.top + window.scrollY + caretPos.top - dropdownHeight - 2;
            } else {
                top = rect.top + window.scrollY - dropdownHeight - 2;
            }
        }

        autocompleteDropdown.style.top = top + 'px';
        autocompleteDropdown.style.left = left + 'px';
        autocompleteDropdown.style.visibility = 'visible';

        // Add click handlers after positioning
        const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            item.addEventListener('click', () => {
                const text = item.getAttribute('data-text');
                selectAutocompleteSuggestion({ text });
            });
        });
    });
}

function updateAutocompleteSelection() {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
        if (index === autocompleteSelectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

function selectAutocompleteSuggestion(suggestion) {
    if (!autocompleteTarget || !suggestion) return;

    const input = autocompleteTarget;
    const mode = input.dataset.autocompleteMode || 'template';

    // Handle jq mode differently - just replace entire value
    if (mode === 'jq') {
        input.value = suggestion.text;
        const newCursorPos = suggestion.text.length;
        input.setSelectionRange(newCursorPos, newCursorPos);

        // Trigger change event
        input.dispatchEvent(new Event('change', { bubbles: true }));

        hideAutocomplete();
        input.focus();
        return;
    }

    // Template mode - existing logic
    const value = input.value;
    const cursorPos = input.selectionStart;

    // Find the "{{" before cursor
    const beforeCursor = value.substring(0, cursorPos);
    const lastOpenBrace = beforeCursor.lastIndexOf('{{');

    if (lastOpenBrace === -1) return;

    // Replace from "{{" to cursor with "{{ suggestion }}"
    const before = value.substring(0, lastOpenBrace);
    const after = value.substring(cursorPos);

    // Check if closing brackets already exist immediately after cursor (on same line)
    // Only check up to the next newline or end of string to avoid false positives from other lines
    const nextNewline = after.indexOf('\n');
    const afterCurrentLine = nextNewline === -1 ? after : after.substring(0, nextNewline);
    const hasClosingBrackets = afterCurrentLine.trimStart().startsWith('}}');

    // Check if suggestion ends with "." (expects more input)
    const expectsMoreInput = suggestion.text.trimEnd().endsWith('.');

    // If closing brackets exist, remove leading whitespace from after to avoid double spaces
    const afterCleaned = hasClosingBrackets ? after.trimStart() : after;

    // Add trailing space if closing brackets already exist and suggestion is complete
    const trailingSpace = (hasClosingBrackets && !expectsMoreInput) ? ' ' : '';

    // Only add closing brackets if they don't exist and suggestion is complete
    const closingBrackets = (hasClosingBrackets || expectsMoreInput) ? '' : ' }}';
    const newValue = before + '{{' + suggestion.text + trailingSpace + closingBrackets + afterCleaned;

    input.value = newValue;

    // Set cursor position after the inserted text
    const newCursorPos = lastOpenBrace + 2 + suggestion.text.length + trailingSpace.length + closingBrackets.length;
    input.setSelectionRange(newCursorPos, newCursorPos);

    // Trigger change event
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Always hide autocomplete after selection
    // If user types "." next, the input event will trigger autocomplete again
    hideAutocomplete();

    input.focus();
}

function hideAutocomplete() {
    if (autocompleteDropdown) {
        autocompleteDropdown.classList.remove('show');
        autocompleteDropdown.innerHTML = '';
    }
    autocompleteTarget = null;
    autocompleteSelectedIndex = -1;
    autocompleteSuggestions = [];
    autocompleteStepIndex = null;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function attachAutocompleteToAllInputs() {
    if (!config) return;

    // Attach to global variable inputs
    const varInputs = document.querySelectorAll('#globalVariablesContainer input[type="text"]');
    varInputs.forEach(input => {
        attachAutocompleteToInput(input, null);
    });

    // Attach to default header inputs
    const headerInputs = document.querySelectorAll('#defaultHeadersContainer input[type="text"]');
    headerInputs.forEach(input => {
        attachAutocompleteToInput(input, null);
    });

    // Attach to baseUrl input
    const baseUrlInput = document.getElementById('baseUrl');
    if (baseUrlInput) {
        attachAutocompleteToInput(baseUrlInput, null);
    }

    // Attach to all step inputs
    if (config.steps) {
        config.steps.forEach((step, stepIndex) => {
            // Find all inputs and textareas within this step
            const stepInputs = document.querySelectorAll(`#stepsList .step-item:nth-child(${stepIndex + 1}) input[type="text"], #stepsList .step-item:nth-child(${stepIndex + 1}) textarea`);
            stepInputs.forEach(input => {
                // Skip inputs that shouldn't have autocomplete (like step name)
                const skipPlaceholders = ['Describe this step', 'uniqueStepId'];
                if (!skipPlaceholders.includes(input.placeholder)) {
                    attachAutocompleteToInput(input, stepIndex);
                }
            });
        });
    }
}

// Initialize autocomplete on page load
initAutocomplete();
