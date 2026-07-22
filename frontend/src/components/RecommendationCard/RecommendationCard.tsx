import { Plus, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useAddToLibrary } from '../../hooks/useAddToLibrary'
import { Tooltip } from '../Tooltip'
import type { Recommendation } from '../../types'
import './RecommendationCard.css'

interface RecommendationCardProps {
	recommendation: Recommendation
	index?: number
	isExiting?: boolean
	onAdded?: (gameId: number) => void
	onDisliked?: (gameId: number) => void
	onError?: (message: string) => void
}

export const RecommendationCard = ({
	recommendation,
	index = 0,
	isExiting = false,
	onAdded,
	onDisliked,
	onError,
}: RecommendationCardProps) => {
	const { game, reason } = recommendation
	const [liked, setLiked] = useState(false)
	const [dislikePending, setDislikePending] = useState(false)
	// The entrance animation's fill-mode keeps it "in effect" indefinitely,
	// which per spec forces this card into its own stacking context forever —
	// that traps the Tooltip's z-index inside one card, so it can't paint
	// above the next card. Dropping the animation once it finishes releases
	// the card back to normal (non-isolated) stacking.
	const [entering, setEntering] = useState(true)
	const { showToast } = useToast()
	const { adding, added, handleAdd } = useAddToLibrary(game, onAdded, onError)

	const reportError = (err: unknown) =>
		onError?.(err instanceof Error ? err.message : String(err))

	const handleLike = () => {
		const next = !liked
		setLiked(next)
		const request = next
			? api.put(`/api/recommendations/feedback/${game.id}`, {
					sentiment: 'liked',
				})
			: api.del(`/api/recommendations/feedback/${game.id}`)
		request.catch((err) => {
			setLiked(!next)
			reportError(err)
		})
	}

	const handleDislike = () => {
		setDislikePending(true)
		api
			.put(`/api/recommendations/feedback/${game.id}`, {
				sentiment: 'disliked',
			})
			.then(() => {
				onDisliked?.(game.id)
				showToast({
					message: `Got it — you won't see ${game.title} again`,
					iconUrl: game.cover_image_url,
					actionLabel: 'Undo',
					onAction: () => {
						api
							.del(`/api/recommendations/feedback/${game.id}`)
							.catch(reportError)
					},
				})
			})
			.catch(reportError)
			.finally(() => setDislikePending(false))
	}

	return (
		<div
			className={[
				'recommendation-card',
				entering && 'recommendation-card--entering',
				isExiting && 'recommendation-card--exiting',
			]
				.filter(Boolean)
				.join(' ')}
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
				<div className="recommendation-card__actions">
					<button
						type="button"
						className="recommendation-card__add"
						onClick={handleAdd}
						disabled={adding || added}
					>
						<Plus size={14} />{' '}
						{added ? 'Added' : adding ? 'Adding...' : 'Add to Library'}
					</button>
					<div className="recommendation-card__feedback">
						<button
							type="button"
							className={
								liked
									? 'recommendation-card__like recommendation-card__like--active'
									: 'recommendation-card__like'
							}
							onClick={handleLike}
							aria-pressed={liked}
							aria-label="Like this suggestion"
						>
							<ThumbsUp size={14} />
						</button>
						<button
							type="button"
							className="recommendation-card__dislike"
							onClick={handleDislike}
							disabled={dislikePending}
							aria-label="Dislike this suggestion"
						>
							<ThumbsDown size={14} />
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
