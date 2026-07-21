import { RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { RecommendationCard } from '../components/RecommendationCard'
import type { RecommendationSource, RecommendationsResponse } from '../types'
import './Recommendations.css'

const SOURCE_LABELS: Record<RecommendationSource, string> = {
	deepseek: 'AI curated · DeepSeek',
	kimi: 'AI curated · Kimi',
	retrieval_only: 'Algorithm picks',
}

export const Recommendations = () => {
	const [data, setData] = useState<RecommendationsResponse | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [refreshing, setRefreshing] = useState(false)

	useEffect(() => {
		api
			.get<RecommendationsResponse>('/api/recommendations')
			.then(setData)
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [])

	const handleRefresh = async () => {
		setRefreshing(true)
		setError(null)
		try {
			const result = await api.post<RecommendationsResponse>(
				'/api/recommendations/refresh',
			)
			setData(result)
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setRefreshing(false)
		}
	}

	return (
		<div>
			<div className="page-header-row">
				<h1>
					<Sparkles size={22} /> Recommended For You
				</h1>
				<button
					type="button"
					onClick={handleRefresh}
					disabled={refreshing || !data}
				>
					<RefreshCw size={14} /> {refreshing ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>

			{error && <p className="error">{error}</p>}

			{!data ? (
				<p>Loading...</p>
			) : data.cold_start ? (
				<p className="recommendations__empty">
					Rate or favorite a few games in your library to get personalized
					recommendations.
				</p>
			) : data.recommendations.length === 0 ? (
				<p className="recommendations__empty">
					No recommendations available right now — check back once the game
					catalog has synced.
				</p>
			) : (
				<>
					<p className="recommendations__source">
						{SOURCE_LABELS[data.source]}
					</p>
					<div className="game-card-grid">
						{data.recommendations.map((rec) => (
							<RecommendationCard
								key={rec.game.id}
								recommendation={rec}
								onError={setError}
							/>
						))}
					</div>
				</>
			)}
		</div>
	)
}
