# ClearButton – Usage Guide

A glass morphism button component with transparent background, subtle borders, and backdrop blur effects.

## Basic Usage

```tsx
import ClearButton from '@/components/ui/ClearButton'

<ClearButton onClick={handleScan}>
  Scan Image
</ClearButton>
```

## Props

Extends all MUI `ButtonProps` with:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Button content |
| `onClick` | `function` | - | Click handler |
| `disabled` | `boolean` | `false` | Disable the button |
| `fullWidth` | `boolean` | `false` | Make button full width |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size |
| `startIcon` | `ReactNode` | - | Icon before text |
| `endIcon` | `ReactNode` | - | Icon after text |
| `sx` | `object` | `{}` | Custom MUI styles |

## Examples

### With Loading State

```tsx
import ClearButton from '@/components/ui/ClearButton'
import CircularProgress from '@mui/material/CircularProgress'

<ClearButton
  onClick={handleScan}
  disabled={isScanning}
  startIcon={
    isScanning ? <CircularProgress size={18} color="inherit" /> : undefined
  }
>
  {isScanning ? 'Scanning...' : 'Scan Image'}
</ClearButton>
```

### With Icons

```tsx
import AddIcon from '@mui/icons-material/Add'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

// Leading icon
<ClearButton startIcon={<AddIcon />} onClick={handleAdd}>
  Add Item
</ClearButton>

// Trailing icon
<ClearButton endIcon={<ArrowForwardIcon />} onClick={handleNext}>
  Next
</ClearButton>

// Icon only
<ClearButton
  aria-label="Close"
  sx={{ minWidth: 40, width: 40, height: 40, padding: 0, borderRadius: '50%' }}
>
  <CloseIcon />
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
  onClick={handleCancel}
  sx={{
    opacity: 0.8,
    minWidth: 120,
    height: 48,
    borderRadius: 12,
  }}
>
  Cancel
</ClearButton>
```

### Size Variants

```tsx
<ClearButton size="small" onClick={handleEdit}>
  Edit
</ClearButton>

<ClearButton size="medium" onClick={handleSave}>
  Save
</ClearButton>

<ClearButton size="large" onClick={handleSubmit}>
  Submit
</ClearButton>
```

### Disabled State

```tsx
<ClearButton disabled onClick={handleAction}>
  Unavailable
</ClearButton>
```

### Compact Icon Button

```tsx
<ClearButton
  startIcon={<AddIcon />}
  sx={{
    padding: '8px 14px',
    borderRadius: 12,
  }}
>
  Add
</ClearButton>
```

## Styling

ClearButton uses CSS variables from `styles/glass.css`:

- `--glass-bg` - Background color
- `--glass-bg-hover` - Hover background
- `--glass-border` - Border color
- `--glass-border-hover` - Hover border color
- `--glass-text` - Text color
- `--glass-text-disabled` - Disabled text color
- `--glass-blur` - Backdrop blur amount
- `--glass-radius` - Border radius

### States

- **Default**: Transparent background with subtle border
- **Hover**: Lighter background, brighter border
- **Active**: Scales down to 0.97
- **Disabled**: Reduced opacity, transparent background

## Accessibility

```tsx
<ClearButton
  onClick={handleScan}
  aria-label="Run scan"
  aria-busy={isScanning}
  disabled={isScanning}
>
  {isScanning ? 'Scanning...' : 'Scan'}
</ClearButton>
```

## Real-World Example (Scanner Page)

```tsx
import ClearButton from '@/components/ui/ClearButton'
import CircularProgress from '@mui/material/CircularProgress'

<ClearButton
  onClick={handleAnalyzePlant}
  disabled={isScanning || images.length === 0}
  startIcon={
    isScanning ? <CircularProgress size={18} color="inherit" /> : undefined
  }
  aria-label="Run scan"
  aria-busy={isScanning}
  sx={{
    minWidth: 200,
    maxWidth: '28rem',
    height: 52,
  }}
>
  {isScanning ? 'Analyzing plant…' : 'Run Scan'}
</ClearButton>
```

## Button Hierarchy

Use `ClearButton` for:
- ✅ Secondary actions
- ✅ Cancel/dismiss actions
- ✅ Navigation buttons
- ✅ Tertiary actions

For primary CTAs, use `PrimaryButton` instead:

```tsx
import PrimaryButton from '@/components/ui/PrimaryButton'

<PrimaryButton type="submit" fullWidth>
  Create Account
</PrimaryButton>
```

## Related Components

- `PrimaryButton` - Solid button for primary actions
- `ConfirmModal` - Modal with ClearButton actions
