import { useState, useCallback } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary'
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  onConfirm: () => void
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        isOpen: true,
        onConfirm: () => {
          setState((prev) => ({ ...prev, isOpen: false }))
          resolve(true)
        },
      })
    })
  }, [])

  const handleCancel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  return {
    confirm,
    confirmProps: {
      isOpen: state.isOpen,
      title: state.title,
      message: state.message,
      confirmText: state.confirmText,
      cancelText: state.cancelText,
      confirmVariant: state.confirmVariant,
      onConfirm: state.onConfirm,
      onCancel: handleCancel,
    },
  }
}