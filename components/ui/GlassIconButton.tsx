import { ButtonBase, Box, Typography } from '@mui/material'
import { ReactNode } from 'react'

type GlassIconButtonProps = {
  label: string
  icon: ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  size?: number
}

export default function GlassIconButton({
  label,
  icon,
  onClick,
  href,
  disabled = false,
  size = 64,
}: GlassIconButtonProps) {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
      }}
    >
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '999px',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--glass-text)',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          transition: 'all 0.18s ease',
        }}
      >
        {icon}
      </Box>

      <Typography
        component="span"
        sx={{
          color: 'var(--glass-text)',
          fontSize: 12,
          fontWeight: 600,
          textShadow: '0 1px 2px rgba(0,0,0,0.45)',
          lineHeight: 1.1,
        }}
      >
        {label}
      </Typography>
    </Box>
  )

  if (href) {
    return (
      <ButtonBase
        href={href}
        disabled={disabled}
        sx={{ borderRadius: 999, '&:active': { transform: 'scale(0.98)' } }}
      >
        {content}
      </ButtonBase>
    )
  }

  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{ borderRadius: 999, '&:active': { transform: 'scale(0.98)' } }}
    >
      {content}
    </ButtonBase>
  )
}
