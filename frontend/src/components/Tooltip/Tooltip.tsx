import { useId, type ReactNode } from 'react'
import './Tooltip.css'

interface TooltipProps {
	label: string
	children: ReactNode
}

export const Tooltip = ({ label, children }: TooltipProps) => {
	const id = useId()
	return (
		<span className="tooltip" tabIndex={0} aria-describedby={id}>
			{children}
			<span className="tooltip__bubble" role="tooltip" id={id}>
				{label}
			</span>
		</span>
	)
}
