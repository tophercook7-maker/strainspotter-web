# Glass UI Component Library

A complete glass morphism design system for StrainSpotter.

## Components

### 🔘 ClearButton
**Secondary/outlined glass button with transparent background**

```tsx
import ClearButton from '@/components/ui/ClearButton'

<ClearButton onClick={handleAction}>
  Click Me
</ClearButton>
```

[Full Documentation →](./ClearButton.md)

**Use for:**
- Secondary actions
- Cancel/dismiss buttons
- Navigation actions
- Tertiary CTAs

---

### ⚪ PrimaryButton
**Solid button for high-emphasis actions**

```tsx
import PrimaryButton from '@/components/ui/PrimaryButton'

<PrimaryButton type="submit" fullWidth>
  Submit
</PrimaryButton>
```

**Use for:**
- Form submissions
- Primary CTAs
- Create/Save actions
- High-emphasis actions

---

### 💬 ConfirmModal
**Modal dialog with glass styling and ClearButton actions**

```tsx
import ConfirmModal from '@/components/ui/ConfirmModal'

<ConfirmModal
  open={showModal}
  title="Confirm Action"
  message="Are you sure you want to proceed?"
  confirmText="Yes, proceed"
  cancelText="Cancel"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

**Use for:**
- Confirmation dialogs
- Alert messages
- User prompts
- Destructive action confirmations

---

## Design System

### CSS Variables (`styles/glass.css`)

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.04);
  --glass-bg-hover: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.25);
  --glass-border-hover: rgba(255, 255, 255, 0.45);
  --glass-text: rgba(255, 255, 255, 0.92);
  --glass-text-disabled: rgba(255, 255, 255, 0.35);
  --glass-blur: 12px;
  --glass-radius: 14px;
}
```

### Usage in Custom Components

```tsx
<div
  style={{
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(var(--glass-blur))',
    borderRadius: 'var(--glass-radius)',
  }}
>
  Custom glass element
</div>
```

---

## Button Hierarchy

### Primary Actions
Use `PrimaryButton` for the most important action on a page:
- Form submissions
- "Create", "Save", "Submit"
- Main CTAs

### Secondary Actions
Use `ClearButton` for supporting actions:
- "Cancel", "Back", "Skip"
- Navigation
- Less important actions

### Visual Hierarchy Example

```tsx
<div style={{ display: 'flex', gap: 12 }}>
  {/* Primary - stands out */}
  <PrimaryButton onClick={handleSave}>
    Save Changes
  </PrimaryButton>
  
  {/* Secondary - subtle */}
  <ClearButton onClick={handleCancel} sx={{ opacity: 0.8 }}>
    Cancel
  </ClearButton>
</div>
```

---

## Common Patterns

### Loading Button
```tsx
import CircularProgress from '@mui/material/CircularProgress'

<ClearButton
  onClick={handleAction}
  disabled={isLoading}
  startIcon={
    isLoading ? <CircularProgress size={18} color="inherit" /> : undefined
  }
>
  {isLoading ? 'Loading…' : 'Submit'}
</ClearButton>
```

### Icon Button
```tsx
import AddIcon from '@mui/icons-material/Add'

<ClearButton startIcon={<AddIcon />} onClick={handleAdd}>
  Add Item
</ClearButton>
```

### Full Width
```tsx
<ClearButton fullWidth onClick={handleSubmit}>
  Submit
</ClearButton>
```

### Custom Styling
```tsx
<ClearButton
  onClick={handleAction}
  sx={{
    minWidth: 200,
    height: 48,
    borderRadius: 12,
  }}
>
  Custom
</ClearButton>
```

---

## Implementation Status

### ✅ Completed
- [x] Glass CSS variables system
- [x] ClearButton component
- [x] PrimaryButton component
- [x] ConfirmModal component
- [x] Scanner page integration
- [x] Single-image confirmation modal
- [x] Documentation (ClearButton.md)
- [x] TypeScript types
- [x] Accessibility (aria-labels, aria-busy)
- [x] Legacy GlassButton removed

### 📋 Current State
All primary buttons are using the glass UI system. Native `<button>` elements remain for:
- Toggle/collapse buttons (WikiPanel, CollapsibleSection)
- Navigation back buttons (TopNav, PageHeader)
- Icon buttons (GardenIcon)

These are intentionally kept as native buttons since they're not primary CTAs and have specific styling needs.

---

## File Structure

```
components/ui/
├── ClearButton.tsx       # Secondary glass button
├── ClearButton.md        # Full documentation
├── PrimaryButton.tsx     # Primary solid button
├── ConfirmModal.tsx      # Glass modal component
└── README.md            # This file

styles/
└── glass.css            # CSS variables

app/
├── globals.css          # Imports glass.css
└── layout.tsx           # Loads globals.css
```

---

## Browser Support

- ✅ Chrome/Edge (Chromium)
- ✅ Safari (WebkitBackdropFilter included)
- ✅ Firefox
- ✅ Mobile browsers

---

## Accessibility

All components follow WCAG 2.1 AA standards:
- ✅ Minimum 44px touch targets
- ✅ Proper ARIA labels
- ✅ Keyboard navigation
- ✅ Focus indicators
- ✅ Screen reader support
- ✅ Color contrast (tested on dark backgrounds)

---

## Next Steps (Optional)

### Potential Additions
Only add if there's a real use case:

1. **ClearButtonDanger** - Red variant for destructive actions
2. **ClearIconButton** - Dedicated icon-only button component
3. **ClearButtonGroup** - Grouped button component
4. **Toast/Snackbar** - Glass-styled notifications

### Performance
- All components are client-side rendered
- CSS variables enable instant theme updates
- No runtime CSS-in-JS overhead (uses MUI's sx prop)

---

## Support

For questions or issues:
1. Check [ClearButton.md](./ClearButton.md) for detailed examples
2. Review this README for patterns
3. Inspect existing implementations in `app/garden/scanner/page.tsx`

---

**Status:** ✅ Production Ready

The glass UI system is complete and deployed. All primary CTAs use the glass button components with consistent styling, accessibility, and UX patterns.
