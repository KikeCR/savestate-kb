import { Toast, type ToastData } from './Toast'
import './Toast.css'

interface ToastViewportProps {
	toasts: ToastData[]
	onDismiss: (id: number) => void
}

export const ToastViewport = ({ toasts, onDismiss }: ToastViewportProps) => {
	if (toasts.length === 0) return null

	return (
		<div className="toast-viewport">
			{toasts.map((toast) => (
				<Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
			))}
		</div>
	)
}
