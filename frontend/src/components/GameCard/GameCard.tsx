import { Heart, Star } from 'lucide-react'
import type { Entry } from '../../types'
import './GameCard.css'
import { StatusBadge } from '../StatusBadge'

interface GameCardProps {
	entry: Entry
	dragging?: boolean
}

export const GameCard = ({ entry, dragging = false }: GameCardProps) => {
	const { game } = entry

	return (
		<div className={`game-card${dragging ? ' game-card--dragging' : ''}`}>
			<div className="game-card__cover">
				{game.cover_image_url ? (
					<img src={game.cover_image_url} alt={game.title} />
				) : (
					<div className="game-card__cover-placeholder" aria-hidden="true" />
				)}
			</div>
			<div className="game-card__body">
				<p className="game-card__title">{game.title}</p>
				<div className="game-card__meta">
					<StatusBadge status={entry.status} />
					{entry.rating != null && (
						<span className="game-card__rating">
							<Star size={12} /> {entry.rating}/10
						</span>
					)}
					{entry.favorite && (
						<span className="game-card__favorite" title="Favorite">
							<Heart size={12} />
						</span>
					)}
				</div>
			</div>
		</div>
	)
}
