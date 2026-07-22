import { Plus, Star } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { Tooltip } from '../Tooltip'
import type { Entry, Recommendation } from '../../types'
import './RecommendationCard.css'

interface RecommendationCardProps {
	recommendation: Recommendation
	index?: number
	onAdded?: () => void
	onError?: (message: string) => void
}

export const RecommendationCard = ({
	recommendation,
	index = 0,
	onAdded,
	onError,
}: RecommendationCardProps) => {
	const { game, reason } = recommendation
	const [adding, setAdding] = useState(false)
	const [added, setAdded] = useState(false)
	// The entrance animation's fill-mode keeps it "in effect" indefinitely,
	// which per spec forces this card into its own stacking context forever —
	// that traps the Tooltip's z-index inside one card, so it can't paint
	// above the next card. Dropping the animation once it finishes releases
	// the card back to normal (non-isolated) stacking.
	const [entering, setEntering] = useState(true)
	const { showToast } = useToast()

	const handleAdd = () => {
		setAdding(true)
		api
			.post<Entry>('/api/entries', { game_id: game.id, status: 'backlog' })
			.then((entry) => {
				setAdded(true)
				onAdded?.()
				showToast({
					message: `${game.title} added to your library`,
					iconUrl: game.cover_image_url,
					actionLabel: 'Undo',
					onAction: () => {
						api
							.del(`/api/entries/${entry.id}`)
							.then(() => setAdded(false))
							.catch((err) =>
								onError?.(err instanceof Error ? err.message : String(err)),
							)
					},
				})
			})
			.catch((err) =>
				onError?.(err instanceof Error ? err.message : String(err)),
			)
			.finally(() => setAdding(false))
	}

	return (
		<div
			className={
				entering
					? 'recommendation-card recommendation-card--entering'
					: 'recommendation-card'
			}
			style={{ '--stagger-index': index } as CSSProperties}
			onAnimationEnd={() => setEntering(false)}
		>
			<div className="recommendation-card__cover">
				{game.cover_image_url ? (
					<img src={game.cover_image_url} alt={game.title} />
				) : (
					<div
						className="recommendation-card__cover-placeholder"
						aria-hidden="true"
					/>
				)}
			</div>
			<div className="recommendation-card__body">
				<Tooltip label={game.title}>
					<p className="recommendation-card__title">{game.title}</p>
				</Tooltip>
				<div className="recommendation-card__meta">
					{game.metacritic != null && (
						<span className="recommendation-card__score">
							<Star size={12} /> {game.metacritic}
						</span>
					)}
					{game.genres.slice(0, 2).map((genre) => (
						<span key={genre} className="recommendation-card__genre">
							{genre}
						</span>
					))}
				</div>
				<p className="recommendation-card__reason">{reason}</p>
				<button
					type="button"
					className="recommendation-card__add"
					onClick={handleAdd}
					disabled={adding || added}
				>
					<Plus size={14} />{' '}
					{added ? 'Added' : adding ? 'Adding...' : 'Add to Library'}
				</button>
			</div>
		</div>
	)
}
