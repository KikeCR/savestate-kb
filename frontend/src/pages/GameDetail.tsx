import { Check, Loader2, Plus, Star } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { ReviewCard } from '../components/ReviewCard'
import { ReviewForm } from '../components/ReviewForm'
import { useAuth } from '../context/AuthContext'
import { useAddToLibrary } from '../hooks/useAddToLibrary'
import type { Entry, GameDetail as GameDetailResponse, Review } from '../types'
import { parseGameDescription } from '../utils/gameDescription'
import './GameDetail.css'

const GameDetailContent = ({ game }: { game: GameDetailResponse }) => {
	const { user } = useAuth()
	const [myEntry, setMyEntry] = useState<Entry | null>(null)
	const [existingReview, setExistingReview] = useState<Review | null>(null)
	const [reviews, setReviews] = useState<Review[]>([])

	const refetchMyEntry = useCallback(() => {
		if (!user) {
			setMyEntry(null)
			return
		}
		api
			.get<{ results: Entry[] }>(`/api/entries?game_id=${game.id}`)
			.then((data) => setMyEntry(data.results[0] ?? null))
			.catch(() => setMyEntry(null))
	}, [game.id, user])

	const { adding, handleAdd } = useAddToLibrary(game, refetchMyEntry)

	const refetchReviews = useCallback(() => {
		api
			.get<{ results: Review[] }>(`/api/games/${game.id}/reviews`)
			.then((data) => setReviews(data.results))
			.catch(() => setReviews([]))
	}, [game.id])

	useEffect(() => {
		refetchReviews()
	}, [refetchReviews])

	useEffect(() => {
		refetchMyEntry()
		if (!user) {
			setExistingReview(null)
			return
		}
		api
			.get<Review>(`/api/reviews/${game.id}`)
			.then(setExistingReview)
			.catch(() => setExistingReview(null))
	}, [game.id, user, refetchMyEntry])

	const inLibrary = myEntry !== null
	const canReview = myEntry?.status === 'completed' && myEntry?.rating != null

	const handleReviewSaved = (review: Review) => {
		setExistingReview(review)
		refetchReviews()
	}

	const handleReviewDeleted = () => {
		setExistingReview(null)
		refetchReviews()
	}

	return (
		<div className="game-detail">
			<div className="game-detail__header">
				<div className="game-detail__cover">
					{game.cover_image_url ? (
						<img src={game.cover_image_url} alt={game.title} />
					) : (
						<div
							className="game-detail__cover-placeholder"
							aria-hidden="true"
						/>
					)}
				</div>
				<div className="game-detail__summary">
					<h1>{game.title}</h1>
					<div className="game-detail__tags">
						{game.platforms.map((platform) => (
							<span key={platform} className="game-detail__tag">
								{platform}
							</span>
						))}
					</div>
					<div className="game-detail__tags">
						{game.genres.map((genre) => (
							<span
								key={genre}
								className="game-detail__tag game-detail__tag--genre"
							>
								{genre}
							</span>
						))}
					</div>

					<dl className="game-detail__scores">
						{game.release_date && (
							<div>
								<dt>Released</dt>
								<dd>{new Date(game.release_date).toLocaleDateString()}</dd>
							</div>
						)}
						{game.metacritic != null && (
							<div>
								<dt>Metacritic</dt>
								<dd>{game.metacritic}</dd>
							</div>
						)}
						{game.rawg_rating != null && (
							<div>
								<dt>RAWG community rating</dt>
								<dd>
									<Star size={14} /> {game.rawg_rating.toFixed(1)}/5
								</dd>
							</div>
						)}
						<div>
							<dt>Savestate users</dt>
							<dd>
								{game.local_ratings_count > 0 ? (
									<>
										<Star size={14} /> {game.local_average_rating}/10 (
										{game.local_ratings_count} rating
										{game.local_ratings_count === 1 ? '' : 's'})
									</>
								) : (
									'No ratings yet'
								)}
							</dd>
						</div>
						{game.esrb_rating && (
							<div>
								<dt>ESRB rating</dt>
								<dd>{game.esrb_rating}</dd>
							</div>
						)}
					</dl>

					{user ? (
						inLibrary ? (
							<span className="game-detail__add game-detail__add--owned">
								<Check size={14} /> In Library
							</span>
						) : (
							<button
								type="button"
								className="game-detail__add"
								onClick={handleAdd}
								disabled={adding}
							>
								<Plus size={14} /> {adding ? 'Adding...' : 'Add to Library'}
							</button>
						)
					) : (
						<a href="/login" className="game-detail__add">
							<Plus size={14} /> Log in to add
						</a>
					)}

					{user && (canReview || existingReview) && (
						<ReviewForm
							gameId={game.id}
							myEntry={myEntry}
							existingReview={existingReview}
							onSaved={handleReviewSaved}
							onDeleted={handleReviewDeleted}
						/>
					)}
				</div>
			</div>

			{game.description && (
				<section>
					<h2>About</h2>
					<div className="game-detail__description">
						{parseGameDescription(game.description).map((block, i) => (
							<div key={i}>
								{block.heading && <h3>{block.heading}</h3>}
								{block.body && <p>{block.body}</p>}
							</div>
						))}
					</div>
				</section>
			)}

			{reviews.length > 0 && (
				<section className="game-detail__reviews">
					<h2>Reviews</h2>
					<div className="review-grid">
						{reviews.map((review) => (
							<ReviewCard key={review.id} review={review} />
						))}
					</div>
				</section>
			)}

			{(game.developers?.length || game.publishers?.length || game.website) && (
				<section className="game-detail__credits">
					{game.developers && game.developers.length > 0 && (
						<p>
							<strong>Developer:</strong> {game.developers.join(', ')}
						</p>
					)}
					{game.publishers && game.publishers.length > 0 && (
						<p>
							<strong>Publisher:</strong> {game.publishers.join(', ')}
						</p>
					)}
					{game.website && (
						<p>
							<a href={game.website} target="_blank" rel="noreferrer">
								Official website
							</a>
						</p>
					)}
				</section>
			)}
		</div>
	)
}

export const GameDetail = () => {
	const { id } = useParams<{ id: string }>()
	const [game, setGame] = useState<GameDetailResponse | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!id) return
		setGame(null)
		setError(null)
		api
			.get<GameDetailResponse>(`/api/games/${id}`)
			.then(setGame)
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [id])

	if (error) return <p className="error">{error}</p>
	if (!game) {
		return (
			<div className="game-detail__loading" role="status">
				<Loader2 size={32} className="game-detail__loading-spinner" />
				<span>Loading...</span>
			</div>
		)
	}

	return <GameDetailContent game={game} />
}
