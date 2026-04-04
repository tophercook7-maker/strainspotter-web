'use client'

import { ButtonBase, Box, Typography } from '@mui/material'
import { ReactNode } from 'react'

type GlassIconButtonProps = {
  label: string
  icon: ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  accent?: string
}

export default function GlassIconButton({
  label,
  icon,
  onClick,
  href,
  disabled = false,
  accent = 'rgba(255,255,255,0.08)',
}: GlassIconButtonProps) {
  const content = (
    <Box
      sx={{
        width: '100%',
        minHeight: 120,
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.2,
        px: 2,
        py: 2.5,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: accent,
          borderRadius: '20px 20px 0 0',
        },
        '&:hover': {
          background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.22)',
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 32px rgba(0,0,0,0.3), 0 0 20px ${accent}22`,
        },
        '&:active': {
          transform: 'scale(0.97)',
        },
      }}
    >
      {/* Icon circle */}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '14px',
          display: 'grid',
          placeItems: 'center',
          background: accent,
          color: 'white',
          fontSize: 26,
          boxShadow: `0 4px 12px ${accent}44`,
        }}
      >
        {icon}
      </Box>

      {/* Label inside the button */}
      <Typography
        component="span"
        sx={{
          color: 'white',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.02em',
          textAlign: 'center',
          lineHeight: 1.2,
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}
      >
        {label}
      </Typography>
    </Box>
  )

  const btnSx = {
    borderRadius: '20px',
    width: '100%',
    display: 'block',
  }

  if (href) {
    return (
      <ButtonBase href={href} disabled={disabled} sx={btnSx}>
        {content}
      </ButtonBase>
    )
  }

  return (
    <ButtonBase onClick={onClick} disabled={disabled} sx={btnSx}>
      {content}
    </ButtonBase>
  )
}
