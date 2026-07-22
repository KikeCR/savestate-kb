import { Plus, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAddToLibrary } from '../../hooks/useAddToLibrary'
import { Tooltip } from '../Tooltip'
import type { Game } from '../../types'
import './PopularGameCard.css'

interface PopularGameCardProps {
	game: Game
	onAdded?: (gameId: number) => void
	onError?: (message: string) => void
}

export const PopularGameCard = ({
	game,
	onAdded,
	onError,
}: PopularGameCardProps) => {
	const { user } = useAuth()
	const { adding, added, handleAdd } = useAddToLibrary(game, onAdded, onError)

	return (
		<div className="popular-game-card">
			<div className="popular-game-card__cover">
				{game.cover_image_url ? (
					<img src={game.cover_image_url} alt={game.title} />
				) : (
					<div
						className="popular-game-card__cover-placeholder"
						aria-hidden="true"
					/>
				)}
			</div>
			<div className="popular-game-card__body">
				<Tooltip label={game.title}>
					<p className="popular-game-card__title">{game.title}</p>
				</Tooltip>
				<div className="popular-game-card__meta">
					{game.metacritic != null && (
						<span className="popular-game-card__score">
							<Star size={12} /> {game.metacritic}
						</span>
					)}
					{game.genres.slice(0, 2).map((genre) => (
						<span key={genre} className="popular-game-card__genre">
							{genre}
						</span>
					))}
				</div>
				{user ? (
					<button
						type="button"
						className="popular-game-card__add"
						onClick={handleAdd}
						disabled={adding || added}
					>
						<Plus size={14} />{' '}
						{added ? 'Added' : adding ? 'Adding...' : 'Add to Library'}
					</button>
				) : (
					<Link
						to="/login"
						className="popular-game-card__add popular-game-card__add--link"
					>
						<Plus size={14} /> Log in to add
					</Link>
				)}
			</div>
		</div>
	)
}
