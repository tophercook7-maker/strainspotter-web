import { Button, ButtonProps } from '@mui/material'
import { ReactNode } from 'react'

type ClearButtonProps = {
  children: ReactNode
} & ButtonProps

export default function ClearButton({
  children,
  onClick,
  startIcon,
  endIcon,
  disabled = false,
  fullWidth = false,
  size = 'medium',
  sx = {},
  ...props
}: ClearButtonProps) {
  return (
    <Button
      onClick={onClick}
      startIcon={startIcon}
      endIcon={endIcon}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      variant="outlined"
      {...props}
      sx={{
        color: 'var(--glass-text)',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        borderRadius: 'var(--glass-radius)',
        textTransform: 'none',
        fontWeight: 500,
        letterSpacing: '0.02em',
        padding: '10px 18px',
        transition: 'all 0.18s ease',

        '&:hover': {
          background: 'var(--glass-bg-hover)',
          borderColor: 'var(--glass-border-hover)',
        },

        '&:active': {
          transform: 'scale(0.97)',
        },

        '&.Mui-disabled': {
          color: 'var(--glass-text-disabled)',
          borderColor: 'var(--glass-border)',
          background: 'transparent',
        },

        ...sx,
      }}
    >
      {children}
    </Button>
  )
}
