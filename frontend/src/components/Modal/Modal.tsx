import { X } from 'lucide-react'
import { useEffect } from 'react'
import './Modal.css'

interface ModalProps {
	title: string
	onClose: () => void
	children: React.ReactNode
}

export const Modal = ({ title, onClose, children }: ModalProps) => {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handleKeyDown)
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			document.body.style.overflow = previousOverflow
		}
	}, [onClose])

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div
				className="modal"
				role="dialog"
				aria-modal="true"
				aria-label={title}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="modal__header">
					<h2>{title}</h2>
					<button
						type="button"
						className="modal__close"
						onClick={onClose}
						aria-label="Close"
					>
						<X size={18} />
					</button>
				</div>
				<div className="modal__body">{children}</div>
			</div>
		</div>
	)
}
