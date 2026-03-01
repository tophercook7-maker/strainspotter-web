import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { ReactNode } from 'react'
import ClearButton from './ClearButton'

type ConfirmModalProps = {
  open: boolean
  title: string
  message: string | ReactNode
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}

export default function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: ConfirmModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        sx: {
          background: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--glass-radius)',
          color: 'var(--glass-text)',
          minWidth: 320,
          maxWidth: 480,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, fontSize: '1.125rem' }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
        {typeof message === 'string' ? <p>{message}</p> : message}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <ClearButton onClick={onCancel} sx={{ opacity: 0.8 }}>
          {cancelText}
        </ClearButton>
        <ClearButton onClick={onConfirm}>
          {confirmText}
        </ClearButton>
      </DialogActions>
    </Dialog>
  )
}
