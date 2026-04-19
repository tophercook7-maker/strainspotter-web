'use client'

import { ButtonBase, Box, Typography } from '@mui/material'
import { ReactNode } from 'react'

type GlassIconButtonProps = {
  label: string
  icon: ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  gradient?: string
}

export default function GlassIconButton({
  label,
  icon,
  onClick,
  href,
  disabled = false,
  gradient = 'linear-gradient(135deg, rgba(76,175,80,0.5), rgba(27,94,32,0.7))',
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
      {/* iOS-style square icon */}
      <Box
        sx={{
          width: 62,
          height: 62,
          borderRadius: '16px',
          display: 'grid',
          placeItems: 'center',
          background: gradient,
          boxShadow: '0 4px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
            borderRadius: '16px 16px 0 0',
            pointerEvents: 'none',
          },
        }}
      >
        {icon}
      </Box>

      {/* Label below like iOS */}
      <Typography
        component="span"
        sx={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: 10.5,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.15,
          textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          maxWidth: 72,
        }}
      >
        {label}
      </Typography>
    </Box>
  )

  const btnSx = {
    borderRadius: '16px',
    p: 0.5,
    transition: 'transform 0.15s ease',
    '&:active': { transform: 'scale(0.92)' },
  }

  if (href) {
    return <ButtonBase href={href} disabled={disabled} sx={btnSx}>{content}</ButtonBase>
  }
  return <ButtonBase onClick={onClick} disabled={disabled} sx={btnSx}>{content}</ButtonBase>
}
