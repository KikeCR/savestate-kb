import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import './ThinkingIndicator.css'

export const DEFAULT_THINKING_MESSAGES = [
	'Analyzing your library...',
	'Comparing genres and ratings...',
	'Consulting the AI...',
	'Ranking candidates...',
	'Polishing recommendations...',
]

interface ThinkingIndicatorProps {
	messages?: string[]
	intervalMs?: number
}

export const ThinkingIndicator = ({
	messages = DEFAULT_THINKING_MESSAGES,
	intervalMs = 1400,
}: ThinkingIndicatorProps) => {
	const [index, setIndex] = useState(0)

	useEffect(() => {
		setIndex(0)
		const timer = setInterval(() => {
			setIndex((i) => (i + 1) % messages.length)
		}, intervalMs)
		return () => clearInterval(timer)
	}, [messages, intervalMs])

	return (
		<div className="thinking-indicator" role="status">
			<Sparkles size={44} className="thinking-indicator__icon" />
			{/* key={index} remounts the span on each message change so its
				fade-in animation replays instead of only running once. */}
			<span key={index} className="thinking-indicator__text">
				{messages[index]}
			</span>
		</div>
	)
}
