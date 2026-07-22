import {
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import { ToastViewport, type ToastData } from '../components/Toast'

// Matches the .toast--leaving CSS transition duration in Toast.css — the
// toast is kept in state (with a "leaving" flag) for this long so the exit
// animation can play before it's actually removed.
const TOAST_EXIT_MS = 200

interface ShowToastOptions {
	message: string
	variant?: 'default' | 'error'
	iconUrl?: string | null
	actionLabel?: string
	onAction?: () => void
	durationMs?: number
}

interface ToastContextValue {
	showToast: (options: ShowToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextToastId = 0

export const ToastProvider = ({ children }: { children: ReactNode }) => {
	const [toasts, setToasts] = useState<ToastData[]>([])
	const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

	const remove = useCallback((id: number) => {
		setToasts((current) => current.filter((toast) => toast.id !== id))
	}, [])

	const dismiss = useCallback(
		(id: number) => {
			const timer = timers.current.get(id)
			if (timer) {
				clearTimeout(timer)
				timers.current.delete(id)
			}
			setToasts((current) =>
				current.map((toast) =>
					toast.id === id ? { ...toast, leaving: true } : toast,
				),
			)
			setTimeout(() => remove(id), TOAST_EXIT_MS)
		},
		[remove],
	)

	const showToast = useCallback(
		({
			message,
			variant = 'default',
			iconUrl,
			actionLabel,
			onAction,
			durationMs = 5000,
		}: ShowToastOptions) => {
			const id = nextToastId++
			setToasts((current) => [
				...current,
				{ id, message, variant, iconUrl, actionLabel, onAction },
			])
			timers.current.set(
				id,
				setTimeout(() => dismiss(id), durationMs),
			)
		},
		[dismiss],
	)

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			<ToastViewport toasts={toasts} onDismiss={dismiss} />
		</ToastContext.Provider>
	)
}

export const useToast = () => {
	const ctx = useContext(ToastContext)
	if (!ctx) throw new Error('useToast must be used within ToastProvider')
	return ctx
}
