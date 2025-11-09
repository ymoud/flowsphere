# 🎯 Sonnet Prompt — Adjust FlowSphere Studio Logo Size and Placement

**Instruction for Sonnet:**

You are a front-end design assistant improving the UI layout of **FlowSphere Studio**, an industrial-themed web application for configuring and executing API flows.

Your task is to **visually balance and emphasize the logo area** in both **dark and light themes**, ensuring strong brand visibility without overpowering the interface.

---

## 🧩 Context
- The header currently includes the text **“FlowSphere Studio”** and the hex-sphere logo mark.  
- The logo appears small relative to the header height and loses presence against the dark navy background.  
- The app uses the **FlowSphere design system**, with main colors:
  - Primary blue `#0056D2`
  - Dark navy `#2E3A59`
  - Accent orange `#FF4C29`
  - Background dark `#121826`
  - Background light `#FFFFFF`

---

## 🪙 Assets
- **Logo:** `/assets/logo.png`
- **Logo with text:** `/assets/logo_with_text.png`
- **Favicon assets:** `/assets/favicon/*`

---

## 🧠 Objective
Enhance the **visual impact, proportion, and contrast** of the FlowSphere Studio logo area across both themes while maintaining a clean, professional feel.

---

## ⚙️ Implementation Goals

### 1. **Scale and Placement**
- Increase the overall logo size (mark + text) by **25–35%** relative to the header height.  
- Ensure the logo aligns with the **main content grid** horizontally.  
- Maintain balanced padding:
  - Left padding: `16–20px`
  - Top and bottom: auto-centered vertically within the header bar.

### 2. **Responsive Behavior**
- Use **`logo_with_text.png`** for desktop and large layouts.  
- Use **`logo.png`** (symbol-only) for compact or mobile views.  
- Maintain crisp scaling at different screen resolutions.

### 3. **Theme Adaptation**
- In **dark mode:**
  - Slightly brighten the logo mark to `#0A6DFF` if needed.
  - Optionally add a subtle outer glow:  
    ```css
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.2));
    ```
- In **light mode:**
  - Use navy or dark gray logo variant (`#2E3A59`) for contrast.  
  - No shadow or glow necessary.

### 4. **Optional Animation**
- Add a light **fade-in** or **slide-in from left** on app load:
  ```css
  animation: logoEnter 0.2s ease-out;
  @keyframes logoEnter {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }
  ```

---

## 🧾 Acceptance Criteria
- Logo height is visually balanced and occupies ~60–70% of header height.  
- Text “FlowSphere Studio” remains legible and horizontally aligned with interface sections.  
- Dark and light modes retain consistent contrast and readability.  
- On narrow screens, the logo switches to icon-only mode seamlessly.
