// Drag and Drop Handler for Step Reordering
// Implements HTML5 Drag and Drop API for reordering steps in the config editor

// Global state for drag operation
let draggedStepIndex = null;
let dragOverStepIndex = null;
let dropIndicator = null;
let positionIndicator = null; // Badge showing target position number
let animatingStepToIndex = null; // Track target index for fade-in animation after reorder
let autoScrollInterval = null; // Track auto-scroll timer
let scrollContainer = null; // Reference to the scrollable container
let currentScrollSpeed = 0; // Current auto-scroll speed

/**
 * Initialize drag and drop event listeners for all step items
 * Called after renderSteps() completes
 */
function initStepDragAndDrop() {
    const stepsAccordion = document.getElementById('stepsAccordion');
    if (!stepsAccordion) return;

    // Find the scrollable container (the card-body that contains editorContent)
    scrollContainer = document.querySelector('.card-body.overflow-auto');

    // Attach dragover listener to the accordion container itself
    // This hides indicators when dragging over empty space (gaps between steps)
    stepsAccordion.addEventListener('dragover', handleAccordionDragOver);

    // Attach listeners to ALL accordion items (both draggable and non-draggable)
    // This ensures we can hide indicators when hovering over expanded steps
    const allStepItems = stepsAccordion.querySelectorAll('.accordion-item');

    allStepItems.forEach((item, index) => {
        // Remove any existing listeners to prevent duplicates
        item.removeEventListener('dragstart', handleDragStart);
        item.removeEventListener('dragover', handleDragOver);
        item.removeEventListener('dragenter', handleDragEnter);
        item.removeEventListener('dragleave', handleDragLeave);
        item.removeEventListener('drop', handleDrop);
        item.removeEventListener('dragend', handleDragEnd);

        // Attach new listeners to all items
        // dragstart and dragend will only work on draggable items (browser handles this)
        // But dragover/enter/leave/drop need to work on all items to hide indicators properly
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
    });
}

/**
 * Handle drag start event
 * Store dragged step index and set visual feedback
 */
function handleDragStart(event) {
    const item = event.currentTarget;
    draggedStepIndex = parseInt(item.getAttribute('data-step-index'));

    // Set data transfer (required for Firefox)
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', item.innerHTML);

    // Add visual feedback
    setTimeout(() => {
        item.classList.add('dragging');
    }, 0);

    // Create drop indicator and position badge
    createDropIndicator();
    createPositionIndicator();
}

/**
 * Handle drag over the accordion container (empty space between steps)
 * Hides indicators when not over a specific step
 */
function handleAccordionDragOver(event) {
    // Check if we're directly over the accordion container (not a step item)
    if (event.target.id === 'stepsAccordion' || event.target.classList.contains('accordion')) {
        event.preventDefault();
        hideDropIndicator();
        event.dataTransfer.dropEffect = 'none';
    }
    // If we're over a step item, let the item's handler deal with it
    // (it will stop propagation)
}

/**
 * Handle drag over event
 * Allow drop and show visual indicator
 */
function handleDragOver(event) {
    event.preventDefault(); // Allow drop
    event.stopPropagation(); // Stop event from bubbling to accordion container

    const item = event.currentTarget;
    const targetIndex = parseInt(item.getAttribute('data-step-index'));

    // Skip if dragging over self
    if (draggedStepIndex === targetIndex) {
        hideDropIndicator();
        event.dataTransfer.dropEffect = 'none';
        return;
    }

    // Skip if target item is not draggable (expanded step)
    const isDraggable = item.getAttribute('draggable') === 'true';
    if (!isDraggable) {
        hideDropIndicator();
        event.dataTransfer.dropEffect = 'none';
        return;
    }

    event.dataTransfer.dropEffect = 'move';

    // Calculate drop position (top or bottom half)
    const rect = item.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isTopHalf = event.clientY < midpoint;

    // Position and show the drop indicator
    positionDropIndicator(item, isTopHalf);

    // Handle auto-scrolling when near edges
    handleAutoScroll(event);

    dragOverStepIndex = targetIndex;
}

/**
 * Handle drag enter event
 * Add hover state to target step
 */
function handleDragEnter(event) {
    event.preventDefault();
}

/**
 * Handle drag leave event
 * Remove hover state from target step
 */
function handleDragLeave(event) {
    // Indicator will be hidden/repositioned by dragover on the next item
    // or by dragend if leaving the accordion entirely
}

/**
 * Handle drop event
 * Reorder steps in config and update UI
 */
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const item = event.currentTarget;
    const targetIndex = parseInt(item.getAttribute('data-step-index'));

    // Don't allow drops on non-draggable items (expanded steps)
    const isDraggable = item.getAttribute('draggable') === 'true';
    if (!isDraggable) {
        hideDropIndicator();
        stopAutoScroll();
        // Trigger dragend manually to provide visual feedback
        const stepsAccordion = document.getElementById('stepsAccordion');
        if (stepsAccordion && draggedStepIndex !== null) {
            const draggedElement = stepsAccordion.querySelectorAll('.accordion-item')[draggedStepIndex];
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
            }
        }
        draggedStepIndex = null;
        removeDropIndicator();
        return;
    }

    // Calculate actual drop position based on cursor position
    const rect = item.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isTopHalf = event.clientY < midpoint;

    // Simple drop position logic:
    // - Top half: insert before target
    // - Bottom half: insert after target
    const finalIndex = isTopHalf ? targetIndex : targetIndex + 1;

    // Hide drop indicator
    hideDropIndicator();

    // Stop auto-scrolling
    stopAutoScroll();

    // Calculate adjusted index to check if reorder is actually needed
    // (Same logic as in reorderSteps)
    const adjustedToIndex = draggedStepIndex < finalIndex ? finalIndex - 1 : finalIndex;

    // Perform reorder if position actually changed
    if (draggedStepIndex !== adjustedToIndex) {
        // IMPORTANT: Capture draggedStepIndex in a local variable
        // because dragend event will reset it to null before setTimeout fires!
        const capturedFromIndex = draggedStepIndex;
        const capturedToIndex = finalIndex;

        // Get the dragged element
        const stepsAccordion = document.getElementById('stepsAccordion');
        const draggedElement = stepsAccordion?.querySelectorAll('.accordion-item')[draggedStepIndex];

        if (draggedElement) {
            // Add fade-out animation
            draggedElement.classList.remove('dragging');
            draggedElement.classList.add('step-fade-out');

            // Wait for fade-out animation to complete, then reorder
            setTimeout(() => {
                reorderSteps(capturedFromIndex, capturedToIndex);
            }, 250); // Match animation duration
        } else {
            // Fallback: reorder immediately if element not found
            reorderSteps(capturedFromIndex, capturedToIndex);
        }
    } else {
        // No reorder needed, just clean up dragging class
        const stepsAccordion = document.getElementById('stepsAccordion');
        const draggedElement = stepsAccordion?.querySelectorAll('.accordion-item')[draggedStepIndex];
        if (draggedElement) {
            draggedElement.classList.remove('dragging');
        }
    }
}

/**
 * Handle drag end event
 * Clean up visual feedback and reset state
 */
function handleDragEnd(event) {
    const item = event.currentTarget;
    item.classList.remove('dragging');

    // Remove all drag indicators from all items
    const stepsAccordion = document.getElementById('stepsAccordion');
    if (stepsAccordion) {
        const allItems = stepsAccordion.querySelectorAll('.accordion-item');
        allItems.forEach(item => {
            item.classList.remove('dragging');
        });
    }

    // Remove drop indicator
    removeDropIndicator();

    // Stop auto-scrolling
    stopAutoScroll();

    // Reset state
    draggedStepIndex = null;
    dragOverStepIndex = null;
}

/**
 * Reorder steps in config array
 * @param {number} fromIndex - Source index
 * @param {number} toIndex - Target index
 */
function reorderSteps(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;

    // Adjust toIndex if dragging downward (since we remove first)
    const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;

    // Remove step from old position
    const [movedStep] = config.nodes.splice(fromIndex, 1);

    // Insert at new position
    config.nodes.splice(adjustedToIndex, 0, movedStep);

    // Update openStepIndices Set
    updateOpenStepIndices(fromIndex, adjustedToIndex);

    // Track the target index for fade-in animation
    animatingStepToIndex = adjustedToIndex;

    // Persist and refresh UI
    saveToLocalStorage();
    renderSteps();
    updatePreview();

    // Apply fade-in animation to the moved step
    setTimeout(() => {
        applyFadeInAnimation();
    }, 0);
}

/**
 * Update the Set of open step indices after reordering
 * @param {number} fromIndex - Original position
 * @param {number} toIndex - New position
 */
function updateOpenStepIndices(fromIndex, toIndex) {
    const wasSourceOpen = openStepIndices.has(fromIndex);

    // Create new Set with updated indices
    const newOpenIndices = new Set();

    openStepIndices.forEach(index => {
        if (index === fromIndex) {
            // Move dragged step's open state to new position
            if (wasSourceOpen) {
                newOpenIndices.add(toIndex);
            }
        } else if (fromIndex < toIndex) {
            // Dragged down: shift steps between fromIndex and toIndex up
            if (index > fromIndex && index <= toIndex) {
                newOpenIndices.add(index - 1);
            } else {
                newOpenIndices.add(index);
            }
        } else {
            // Dragged up: shift steps between toIndex and fromIndex down
            if (index >= toIndex && index < fromIndex) {
                newOpenIndices.add(index + 1);
            } else {
                newOpenIndices.add(index);
            }
        }
    });

    // Replace global Set
    openStepIndices.clear();
    newOpenIndices.forEach(i => openStepIndices.add(i));
}

/**
 * Create the drop indicator element
 */
function createDropIndicator() {
    // Remove existing indicator if present
    removeDropIndicator();

    // Create new indicator
    dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator';

    // Add to the steps accordion container
    const stepsAccordion = document.getElementById('stepsAccordion');
    if (stepsAccordion) {
        // Make stepsAccordion position relative for absolute positioning
        stepsAccordion.style.position = 'relative';
        stepsAccordion.appendChild(dropIndicator);
    }
}

/**
 * Position the drop indicator at the target location
 * @param {HTMLElement} targetItem - The step item to position relative to
 * @param {boolean} isTopHalf - Whether to show indicator above (true) or below (false) the target
 */
function positionDropIndicator(targetItem, isTopHalf) {
    if (!dropIndicator) return;

    const stepsAccordion = document.getElementById('stepsAccordion');
    if (!stepsAccordion) return;

    const accordionRect = stepsAccordion.getBoundingClientRect();
    const itemRect = targetItem.getBoundingClientRect();

    // Calculate position relative to accordion container
    let topPosition;
    if (isTopHalf) {
        // Position at top of target item
        topPosition = itemRect.top - accordionRect.top;
    } else {
        // Position at bottom of target item
        topPosition = itemRect.bottom - accordionRect.top;
    }

    // Apply position and show indicator
    dropIndicator.style.top = `${topPosition}px`;
    dropIndicator.classList.add('show');

    // Calculate and show target position number
    const targetIndex = parseInt(targetItem.getAttribute('data-step-index'));
    const finalIndex = isTopHalf ? targetIndex : targetIndex + 1;

    // Adjust for the fact that we'll remove the dragged item first
    // (same logic as in reorderSteps function)
    const adjustedFinalIndex = draggedStepIndex < finalIndex ? finalIndex - 1 : finalIndex;

    updatePositionIndicator(topPosition, adjustedFinalIndex);
}

/**
 * Hide the drop indicator
 */
function hideDropIndicator() {
    if (dropIndicator) {
        dropIndicator.classList.remove('show');
    }
    if (positionIndicator) {
        positionIndicator.classList.remove('show');
    }
}

/**
 * Remove the drop indicator from DOM
 */
function removeDropIndicator() {
    if (dropIndicator && dropIndicator.parentNode) {
        dropIndicator.parentNode.removeChild(dropIndicator);
    }
    dropIndicator = null;

    if (positionIndicator && positionIndicator.parentNode) {
        positionIndicator.parentNode.removeChild(positionIndicator);
    }
    positionIndicator = null;
}

/**
 * Create the position indicator badge
 */
function createPositionIndicator() {
    // Remove existing indicator if present
    if (positionIndicator && positionIndicator.parentNode) {
        positionIndicator.parentNode.removeChild(positionIndicator);
    }

    // Create new indicator
    positionIndicator = document.createElement('div');
    positionIndicator.className = 'position-indicator';

    // Add to the steps accordion container
    const stepsAccordion = document.getElementById('stepsAccordion');
    if (stepsAccordion) {
        stepsAccordion.appendChild(positionIndicator);
    }
}

/**
 * Update the position indicator with the target position number
 * @param {number} topPosition - Top position in pixels relative to accordion container
 * @param {number} targetPosition - The target position number (0-indexed, will display as 1-indexed)
 */
function updatePositionIndicator(topPosition, targetPosition) {
    if (!positionIndicator) return;

    // Update text (show 1-indexed position to user)
    positionIndicator.textContent = `Position ${targetPosition + 1}`;

    // Position the indicator at the same vertical position as the drop line
    positionIndicator.style.top = `${topPosition}px`;

    // Show the indicator
    positionIndicator.classList.add('show');
}

/**
 * Apply fade-in animation to the step at the target index
 */
function applyFadeInAnimation() {
    if (animatingStepToIndex === null) return;

    const stepsAccordion = document.getElementById('stepsAccordion');
    if (!stepsAccordion) return;

    const stepItems = stepsAccordion.querySelectorAll('.accordion-item');
    const targetStep = stepItems[animatingStepToIndex];

    if (targetStep) {
        // Add fade-in class
        targetStep.classList.add('step-fade-in');

        // Remove the class after animation completes to allow future animations
        setTimeout(() => {
            targetStep.classList.remove('step-fade-in');
            animatingStepToIndex = null;
        }, 300); // Match fade-in animation duration
    } else {
        animatingStepToIndex = null;
    }
}

/**
 * Handle auto-scrolling when dragging near edges
 * @param {DragEvent} event - The drag event
 */
function handleAutoScroll(event) {
    if (!scrollContainer) return;

    const SCROLL_ZONE = 80; // Distance from edge to trigger scrolling (px)
    const MAX_SCROLL_SPEED = 15; // Maximum scroll speed (px per frame)

    const containerRect = scrollContainer.getBoundingClientRect();
    const cursorY = event.clientY;

    // Calculate distance from edges
    const distanceFromTop = cursorY - containerRect.top;
    const distanceFromBottom = containerRect.bottom - cursorY;

    currentScrollSpeed = 0;

    if (distanceFromTop < SCROLL_ZONE && distanceFromTop > 0) {
        // Near top edge - scroll up
        const intensity = 1 - (distanceFromTop / SCROLL_ZONE);
        currentScrollSpeed = -intensity * MAX_SCROLL_SPEED;
    } else if (distanceFromBottom < SCROLL_ZONE && distanceFromBottom > 0) {
        // Near bottom edge - scroll down
        const intensity = 1 - (distanceFromBottom / SCROLL_ZONE);
        currentScrollSpeed = intensity * MAX_SCROLL_SPEED;
    }

    if (currentScrollSpeed !== 0) {
        // Start scrolling if not already started
        if (!autoScrollInterval) {
            autoScrollInterval = setInterval(() => {
                if (scrollContainer && currentScrollSpeed !== 0) {
                    scrollContainer.scrollTop += currentScrollSpeed;
                }
            }, 16); // ~60fps
        }
    } else {
        // Stop scrolling if not near edges
        stopAutoScroll();
    }
}

/**
 * Stop auto-scrolling
 */
function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    currentScrollSpeed = 0;
}

// Export to global scope
window.initStepDragAndDrop = initStepDragAndDrop;
