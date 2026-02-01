import { Button, ButtonProps } from '@mui/material'
import { ReactNode } from 'react'

type PrimaryButtonProps = {
  children: ReactNode
} & ButtonProps

export default function PrimaryButton({
  children,
  onClick,
  startIcon,
  endIcon,
  disabled = false,
  fullWidth = false,
  size = 'medium',
  sx = {},
  ...props
}: PrimaryButtonProps) {
  return (
    <Button
      onClick={onClick}
      startIcon={startIcon}
      endIcon={endIcon}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      variant="contained"
      {...props}
      sx={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
        color: '#000',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        borderRadius: 'var(--glass-radius)',
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.02em',
        padding: '10px 18px',
        transition: 'all 0.18s ease',
        boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)',

        '&:hover': {
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 100%)',
          boxShadow: '0 6px 16px rgba(255, 255, 255, 0.15)',
          transform: 'translateY(-1px)',
        },

        '&:active': {
          transform: 'scale(0.97)',
        },

        '&.Mui-disabled': {
          color: 'rgba(0, 0, 0, 0.4)',
          background: 'rgba(255, 255, 255, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },

        ...sx,
      }}
    >
      {children}
    </Button>
  )
}
