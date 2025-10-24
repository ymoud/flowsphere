# HTTP Sequence Config Editor - Bootstrap 5 Version

Visual editor for creating and editing `apiseq.sh` configuration files, built with Bootstrap 5.

## Overview

This is a Bootstrap 5 implementation of the HTTP Sequence Config Editor. It provides a modern, responsive UI using Bootstrap's components and utilities while maintaining full compatibility with the original functionality.

## Key Features

- **Bootstrap 5 Integration**: Modern UI using Bootstrap 5.3.2
- **Responsive Design**: Mobile-friendly layout with Bootstrap's grid system
- **Bootstrap Icons**: Icon library for enhanced visual elements
- **Same Functionality**: All features from the original editor
- **Shared JavaScript**: Uses the same modular JavaScript files as the original

## Structure

```
config-editor-bootstrap5/
├── index.html          # Main HTML file with Bootstrap 5
├── README.md           # This file
├── css/
│   └── styles.css      # Original styles + Bootstrap-specific overrides
└── js/
    └── bootstrap-modal-bridge.js  # Bootstrap modal adapter

Note: All other JavaScript files are shared with the original editor:
- References ../config-editor/js/*.js (no duplication)
- Only bootstrap-modal-bridge.js is unique to this version
```

## Usage

### Open Directly in Browser

```bash
# From project root
start config-editor-bootstrap5/index.html       # Windows
open config-editor-bootstrap5/index.html        # macOS
xdg-open config-editor-bootstrap5/index.html    # Linux
```

### Via Web Server

```bash
# Python
python -m http.server 8000
# Then visit: http://localhost:8000/config-editor-bootstrap5/

# Node.js (with http-server)
npx http-server
```

## What Was Fixed?

### CSS Compatibility Issue

**Problem**: Initial version had minimal CSS that didn't include styles for JavaScript-generated HTML elements.

**Solution**:
- Imported ALL original CSS classes (`.section`, `.form-group`, `.key-value-row`, `.step-item`, etc.)
- JavaScript generates HTML that relies on these specific class names
- Bootstrap CSS only used for outer layout (header, cards, grid)
- Custom CSS preserved for all dynamically generated content

### Modal System

**Problem**: Original uses custom modal system, but Bootstrap 5 modal in HTML for "New Config" dialog.

**Solution**:
- Created `bootstrap-modal-bridge.js` to adapt modal functions
- Uses Bootstrap 5 Modal API for the "New Config" dialog
- Other modals (condition, validation, prompt, header) remain custom (generated dynamically)

## What's Different from the Original?

### UI/UX Changes

1. **Bootstrap Components**:
   - Cards for layout structure
   - Bootstrap buttons with icons
   - Bootstrap form controls
   - Bootstrap modal for "New Config" dialog
   - Responsive grid system

2. **Bootstrap Icons**:
   - Folder, file, and UI action icons
   - Replaces custom SVG icons where appropriate

3. **Color Scheme**:
   - Uses Bootstrap's default color palette
   - Primary color: Bootstrap blue (#0d6efd)
   - Maintains dark code preview panel

4. **Responsive Behavior**:
   - Better mobile support with Bootstrap grid
   - Collapsible panels on smaller screens

### Technical Implementation

- **CDN Resources**: Bootstrap 5.3.2 and Bootstrap Icons loaded from CDN
- **Custom CSS**: Full original styles in `css/styles.css` plus Bootstrap-specific overrides:
  - All original CSS classes (`.section`, `.form-group`, `.btn`, etc.)
  - Custom modals for dynamically generated dialogs
  - Autocomplete dropdown styling
  - JSON preview panel
  - Template selection cards
  - Bootstrap-specific layout adjustments

- **JavaScript**: Uses the same modular JavaScript as the original editor plus one bridge file:
  - `bootstrap-modal-bridge.js` - Adapts "New Config" modal to Bootstrap 5 API
  - Implements `createNew()`, `closeNewConfigModal()`, `selectTemplate()`, `confirmNewConfig()`
  - All other functionality unchanged
  - Dynamically generated modals use custom CSS styling

## Features

All features from the original editor are supported:

- ✅ Visual form-based editing
- ✅ Auto-save to localStorage
- ✅ Live JSON preview with copy-to-clipboard
- ✅ Template-based config creation (Empty, Simple, OAuth, User Input)
- ✅ Postman collection import
- ✅ Intelligent autocomplete for `{{ }}` syntax
- ✅ Global variables management
- ✅ Default headers and validations
- ✅ Step builder with conditions, validations, prompts
- ✅ Collapsible sections
- ✅ File upload/download

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires ES6 support, LocalStorage, and modern CSS features.

## Comparison: Original vs Bootstrap 5

| Aspect | Original | Bootstrap 5 |
|--------|----------|-------------|
| CSS Framework | Custom CSS (16KB) | Bootstrap 5 CDN + Original CSS |
| Icons | Custom SVG | Bootstrap Icons |
| Layout | CSS Grid | Bootstrap Grid + Flexbox |
| Buttons | Custom classes | Bootstrap button classes |
| Forms | Custom styling | Bootstrap form controls |
| Modals | Custom implementation | Hybrid (Bootstrap + Custom) |
| JavaScript | 9 files (105KB) | Shared + 1 adapter (3KB) |
| Total Size | ~121KB | ~48KB (shared JS) |
| Mobile Support | Good | Excellent |
| Customization | Full control | Bootstrap constraints |

## Development Notes

### Updating the JavaScript

JavaScript files are **shared** with the original editor - no copying needed!

- Updates to `config-editor/js/*.js` automatically apply to both versions
- Only `bootstrap-modal-bridge.js` is unique to the Bootstrap version
- This ensures consistency and reduces maintenance

### Custom CSS Organization

The `css/styles.css` file is organized into sections:

1. **Empty State**: Initial view styling
2. **Template Options**: Template selection cards
3. **JSON Preview**: Dark code preview panel
4. **Sections**: Collapsible section styling
5. **Step Cards**: Individual step forms
6. **Variables/Headers**: Item list styling
7. **Badges**: HTTP method and status badges
8. **Autocomplete**: Dropdown suggestion styling
9. **Modals**: Custom modal system for dynamic modals
10. **Forms**: Input and form group styling
11. **Responsive**: Mobile breakpoints

### Modal System

The editor uses a **hybrid modal approach**:

- **Bootstrap Modal**: Used for the "New Config" modal (defined in HTML)
- **Custom Modals**: Used for dynamically generated modals (condition, validation, prompt, header)
  - These are created by JavaScript and use custom CSS
  - Styled to match Bootstrap's look and feel
  - Use `.modal.active` class for visibility

## Known Limitations

1. **Mixed Modal System**: Some modals use Bootstrap, others use custom implementation
2. **CDN Dependency**: Requires internet connection for Bootstrap CSS/JS (can be downloaded and hosted locally if needed)
3. **File Size**: Slightly larger page load due to Bootstrap framework (but likely cached from other sites)

## Future Enhancements

Potential improvements for future versions:

- [ ] Convert all dynamic modals to Bootstrap modal API
- [ ] Add Bootstrap tooltips and popovers
- [ ] Use Bootstrap's offcanvas for mobile menu
- [ ] Implement Bootstrap toast notifications
- [ ] Add dark mode toggle using Bootstrap themes
- [ ] Use Bootstrap's validation styles for form validation

## License

Same as the parent project.

## Support

For issues, questions, or contributions, please refer to the main project repository.
