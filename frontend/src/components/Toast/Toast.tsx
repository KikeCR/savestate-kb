import { X } from 'lucide-react'
import './Toast.css'

export interface ToastData {
	id: number
	message: string
	variant: 'default' | 'error'
	iconUrl?: string | null
	actionLabel?: string
	onAction?: () => void
	leaving?: boolean
}

interface ToastProps {
	toast: ToastData
	onDismiss: (id: number) => void
}

export const Toast = ({ toast, onDismiss }: ToastProps) => {
	const handleAction = () => {
		toast.onAction?.()
		onDismiss(toast.id)
	}

	return (
		<div
			className={`toast toast--${toast.variant}${toast.leaving ? ' toast--leaving' : ''}`}
			role="status"
		>
			{toast.iconUrl && (
				<img className="toast__icon" src={toast.iconUrl} alt="" />
			)}
			<span className="toast__message">{toast.message}</span>
			{toast.actionLabel && (
				<button type="button" className="toast__action" onClick={handleAction}>
					{toast.actionLabel}
				</button>
			)}
			<button
				type="button"
				className="toast__close"
				onClick={() => onDismiss(toast.id)}
				aria-label="Dismiss notification"
			>
				<X size={14} />
			</button>
		</div>
	)
}
