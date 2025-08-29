import { useState } from "react"

export interface Toast {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: "default" | "destructive"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export type ToastActionElement = React.ReactElement
export type ToastProps = Toast

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = ({ ...props }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { id, ...props }
    setToasts((prev) => [...prev, newToast])
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }

  const dismiss = (toastId?: string) => {
    setToasts((prev) => 
      toastId ? prev.filter((t) => t.id !== toastId) : []
    )
  }

  return {
    toast,
    dismiss,
    toasts,
  }
}

// Export toast function directly for convenience
export const toast = (() => {
  const toastFunction: ((props: Omit<Toast, "id">) => void) | null = null
  
  return (props: Omit<Toast, "id">) => {
    if (toastFunction) {
      toastFunction(props)
    } else {
      console.warn('Toast function not initialized')
    }
  }
})()