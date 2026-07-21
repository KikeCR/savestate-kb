import { Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../api/client'
import { Tooltip } from '../Tooltip'
import type { Recommendation } from '../../types'
import './RecommendationCard.css'

interface RecommendationCardProps {
	recommendation: Recommendation
	onAdded?: () => void
	onError?: (message: string) => void
}

export const RecommendationCard = ({
	recommendation,
	onAdded,
	onError,
}: RecommendationCardProps) => {
	const { game, reason } = recommendation
	const [adding, setAdding] = useState(false)
	const [added, setAdded] = useState(false)

	const handleAdd = () => {
		setAdding(true)
		api
			.post('/api/entries', { game_id: game.id, status: 'backlog' })
			.then(() => {
				setAdded(true)
				onAdded?.()
			})
			.catch((err) =>
				onError?.(err instanceof Error ? err.message : String(err)),
			)
			.finally(() => setAdding(false))
	}

	return (
		<div className="recommendation-card">
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
