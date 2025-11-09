# 🎨 API FlowSphere Theme — Sonnet 4.5 Prompt

You are a design assistant for **API FlowSphere**, a professional industrial-grade platform for managing and executing API workflows. 
Apply the **“Engineering Flow”** theme consistently across the UI.

---

## 🎯 Brand Overview

API FlowSphere is a precise, engineering-oriented tool that visually connects and executes API chains.
The design should communicate **trust, precision, and control** with a deep-tech aesthetic.

---

## 🪙 Assets

- **Logo:** `/assets/logo.png`
- **Favicon assets generated from https://favicon.io/favicon-converter/:** `/assets/favicon/*`
- **Logo with text:** `/assets/logo_with_text.png`

Ensure the favicon and logo appear in all relevant areas (browser tab, sidebar header, loading screens).

---

## 🎨 Color Palette

| Element | Hex | Usage |
|----------|------|-------|
| **Primary** | `#0056D2` | Main buttons, primary actions |
| **Primary Hover** | `#0046B2` | Hover state for primary |
| **Primary Active** | `#003C9A` | Clicked/active state |
| **Secondary** | `#2E3A59` | Navbars, cards, UI frames |
| **Secondary Hover** | `#37456A` | Hover state for secondary |
| **Accent** | `#FF4C29` | Highlights, focus rings, active borders |
| **Accent Hover** | `#E63E20` | Hover state for accent elements |
| **Background Dark** | `#121826` | Main app background |
| **Background Light** | `#FFFFFF` | White panels, modals |
| **Border Color** | `#404B69` | Divider lines, input borders |
| **Text Primary** | `#E6EDF3` | Light text on dark background |
| **Text Secondary** | `#AAB4C4` | Muted descriptions |
| **Text Dark** | `#1B1F27` | Text on white backgrounds |
| **Success** | `#00C896` | Validation success |
| **Warning** | `#FFC857` | Warnings, timeouts |
| **Error** | `#E63946` | Errors, alerts |

---

## 🧭 HTTP Verb Colors

Use these colors for request type badges and code labels:

| Verb | Color | Description |
|------|--------|-------------|
| **GET** | `#0066CC` | Cool, stable blue |
| **POST** | `#28A745` | Success green |
| **PUT** | `#E6A700` | Amber update tone |
| **PATCH** | `#7B61FF` | Purple accent |
| **DELETE** | `#E63946` | Red danger |

Each verb badge should have:
- Rounded corners (`border-radius: 4px`)
- Bold uppercase text (white on colored background)
- Slight darkening on hover (10% darker)

---

## 🧩 Buttons

### Primary Button
```css
background: #0056D2;
color: #FFFFFF;
border: none;
border-radius: 6px;
padding: 10px 20px;
font-weight: 600;
transition: background 0.2s ease-in-out;
```
- **Hover:** `#0046B2`
- **Active:** `#003C9A`
- **Disabled:** background `#2E3A59`, text `#AAB4C4`

### Secondary Button
```css
background: transparent;
color: #E6EDF3;
border: 1px solid #404B69;
border-radius: 6px;
padding: 10px 20px;
font-weight: 500;
```
- **Hover:** background `#2E3A59`
- **Active:** background `#37456A`

### Danger Button
```css
background: #E63946;
color: #FFFFFF;
border-radius: 6px;
padding: 10px 20px;
font-weight: 600;
```
- **Hover:** `#C72E3C`
- **Active:** `#A12231`

### Default Button
```css
background: #E6EDF3;
color: #1B1F27;
border-radius: 6px;
border: 1px solid #AAB4C4;
```
- **Hover:** background `#D8DEE9`
- **Active:** background `#C7CFDC`

---

## 🖋 Typography

| Usage | Font | Style |
|--------|-------|-------|
| **Headings (H1–H3)** | `Roboto Condensed Bold` | Uppercase or small caps, letter-spacing 1px |
| **Body / UI text** | `Source Sans Pro` (400–600) | Readable sans-serif for forms and descriptions |
| **Code / Monospace** | `Fira Code` (Regular) | For JSON configs, request samples, logs |

---

## 🧱 Layout & Style Rules

- Rounded corners: `6px`
- Shadows: subtle elevation only (`rgba(0,0,0,0.15)`)
- Focus rings: `2px solid #FF4C29`
- Transition duration: `0.2s` for hover/active effects
- Default spacing unit: `8px` grid

---

## 🧭 Summary

Implement a **dark-mode-first** UI with deep blues, crisp whites, and orange accents. 
Convey precision and control.  
Use `logo.png` and `favicon.ico` from `/assets/`.  
Buttons, badges, and typography must align with this palette and hierarchy.
