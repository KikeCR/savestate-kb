import { RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { RecommendationCard } from '../components/RecommendationCard'
import { ThinkingIndicator } from '../components/ThinkingIndicator'
import {
	VISIBLE_RECOMMENDATION_COUNT,
	type Recommendation,
	type RecommendationSource,
	type RecommendationsResponse,
} from '../types'
import './Recommendations.css'

const SOURCE_LABELS: Record<RecommendationSource, string> = {
	deepseek: 'AI curated · DeepSeek',
	kimi: 'AI curated · Kimi',
	retrieval_only: 'Algorithm picks',
}

// The AI ranking step is often fast enough that a spinner would just flash
// and disappear, which reads as broken rather than reassuring. Keeping the
// "thinking" animation up for at least this long (even once the response has
// already arrived) makes the AI step legible as real work happening.
export const MIN_REFRESH_ANIMATION_MS = 2200

// Matches Library.tsx's ENTRY_EXIT_MS — how long the exit transition plays
// before a card is actually replaced/removed from state.
const RECOMMENDATION_EXIT_MS = 200

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface RecommendationsMeta {
	source: RecommendationSource
	cold_start: boolean
}

interface RecommendationsState {
	visible: Recommendation[]
	reserve: Recommendation[]
}

const splitResponse = (
	result: RecommendationsResponse,
): RecommendationsState => ({
	visible: result.recommendations.slice(0, VISIBLE_RECOMMENDATION_COUNT),
	reserve: result.recommendations.slice(VISIBLE_RECOMMENDATION_COUNT),
})

export const Recommendations = () => {
	const [meta, setMeta] = useState<RecommendationsMeta | null>(null)
	const [recs, setRecs] = useState<RecommendationsState | null>(null)
	const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())
	const [error, setError] = useState<string | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const toppingUp = useRef(false)

	const applyResponse = (result: RecommendationsResponse) => {
		setMeta({ source: result.source, cold_start: result.cold_start })
		setRecs(splitResponse(result))
	}

	useEffect(() => {
		api
			.get<RecommendationsResponse>('/api/recommendations')
			.then(applyResponse)
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [])

	// Once the reserve runs dry but there are still empty visible slots (e.g.
	// the user added/disliked a bunch in one sitting), fetch a small extra
	// batch to keep the grid full — a lighter-weight request than a full
	// refresh, and it doesn't touch the server-side cache. Triggered only
	// from the exact moment a removal depletes the reserve (see
	// replaceCard below) — never from a passive effect watching `recs`,
	// since a user with a naturally small initial batch (fewer than
	// VISIBLE_RECOMMENDATION_COUNT candidates) shouldn't trigger an
	// unbounded stream of topup requests just for loading the page.
	const requestTopup = (excludeGameIds: number[]) => {
		if (toppingUp.current) return
		toppingUp.current = true
		api
			.post<RecommendationsResponse>('/api/recommendations/topup', {
				exclude_game_ids: excludeGameIds,
			})
			.then((result) => {
				setRecs((current) => {
					if (!current) return current
					// Fills the empty slots the topup was requested for right away,
					// rather than parking the batch as unused reserve until the next
					// add/dislike — a topup exists specifically to close the gap it
					// was triggered by.
					const combined = [...current.visible, ...result.recommendations]
					return {
						visible: combined.slice(0, VISIBLE_RECOMMENDATION_COUNT),
						reserve: [
							...current.reserve,
							...combined.slice(VISIBLE_RECOMMENDATION_COUNT),
						],
					}
				})
			})
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
			.finally(() => {
				toppingUp.current = false
			})
	}

	// Pops the next reserve card into the slot the departed one occupied, so
	// a single add/dislike swaps in a replacement without another network
	// round-trip. React invokes a setState updater synchronously to compute
	// the next value even though the resulting re-render is deferred, so it's
	// safe to read `needsTopup`/`excludeGameIds` right after this call.
	const replaceCard = (gameId: number) => {
		let needsTopup = false
		let excludeGameIds: number[] = []
		setRecs((current) => {
			if (!current) return current
			const index = current.visible.findIndex((rec) => rec.game.id === gameId)
			if (index === -1) return current

			if (current.reserve.length === 0) {
				const nextVisible = current.visible.filter(
					(rec) => rec.game.id !== gameId,
				)
				needsTopup = nextVisible.length < VISIBLE_RECOMMENDATION_COUNT
				excludeGameIds = nextVisible.map((rec) => rec.game.id)
				return { visible: nextVisible, reserve: current.reserve }
			}
			const nextVisible = [...current.visible]
			nextVisible[index] = current.reserve[0]!
			return { visible: nextVisible, reserve: current.reserve.slice(1) }
		})
		if (needsTopup) requestTopup(excludeGameIds)
	}

	const handleCardExit = (gameId: number) => {
		setRemovingIds((current) => new Set(current).add(gameId))
		setTimeout(() => {
			replaceCard(gameId)
			setRemovingIds((current) => {
				const next = new Set(current)
				next.delete(gameId)
				return next
			})
		}, RECOMMENDATION_EXIT_MS)
	}

	const handleRefresh = async () => {
		setRefreshing(true)
		setError(null)
		setRemovingIds(new Set())
		const startedAt = Date.now()
		try {
			const result = await api.post<RecommendationsResponse>(
				'/api/recommendations/refresh',
			)
			const elapsed = Date.now() - startedAt
			if (elapsed < MIN_REFRESH_ANIMATION_MS) {
				await wait(MIN_REFRESH_ANIMATION_MS - elapsed)
			}
			applyResponse(result)
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setRefreshing(false)
		}
	}

	const isEmpty =
		!!recs && recs.visible.length === 0 && recs.reserve.length === 0

	return (
		<div>
			<div className="page-header-row">
				<h1>
					<Sparkles size={22} /> Recommended For You
				</h1>
				<button
					type="button"
					className={
						refreshing
							? 'recommendations__refresh recommendations__refresh--spinning'
							: 'recommendations__refresh'
					}
					onClick={handleRefresh}
					disabled={refreshing || !recs}
				>
					<RefreshCw size={14} /> {refreshing ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>

			{error && <p className="error">{error}</p>}

			{error && !recs ? null : refreshing || !recs || !meta ? (
				<ThinkingIndicator />
			) : meta.cold_start ? (
				<p className="recommendations__empty">
					Rate or favorite a few games in your library to get personalized
					recommendations.
				</p>
			) : isEmpty ? (
				<p className="recommendations__empty">
					No recommendations available right now — check back once the game
					catalog has synced.
				</p>
			) : (
				<>
					<p className="recommendations__source">
						{SOURCE_LABELS[meta.source]}
					</p>
					<div className="game-card-grid">
						{recs.visible.map((rec, index) => (
							<RecommendationCard
								key={rec.game.id}
								recommendation={rec}
								index={index}
								isExiting={removingIds.has(rec.game.id)}
								onAdded={handleCardExit}
								onDisliked={handleCardExit}
								onError={setError}
							/>
						))}
					</div>
				</>
			)}
		</div>
	)
}
