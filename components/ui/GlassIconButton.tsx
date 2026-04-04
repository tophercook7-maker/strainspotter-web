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
        minHeight: 88,
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.8,
        px: 1.5,
        py: 1.5,
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
          height: '2px',
          background: accent,
          borderRadius: '16px 16px 0 0',
        },
        '&:hover': {
          background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.22)',
          transform: 'translateY(-3px)',
          boxShadow: `0 8px 24px rgba(0,0,0,0.3), 0 0 16px ${accent}22`,
        },
        '&:active': {
          transform: 'scale(0.97)',
        },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          display: 'grid',
          placeItems: 'center',
          background: accent,
          color: 'white',
          boxShadow: `0 3px 8px ${accent}44`,
        }}
      >
        {icon}
      </Box>

      {/* Label */}
      <Typography
        component="span"
        sx={{
          color: 'white',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.02em',
          textAlign: 'center',
          lineHeight: 1.15,
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {label}
      </Typography>
    </Box>
  )

  const btnSx = {
    borderRadius: '16px',
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
