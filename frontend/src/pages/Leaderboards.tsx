import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { LeaderboardEntry } from '../types'

export const Leaderboards = () => {
	const [completions, setCompletions] = useState<LeaderboardEntry[]>([])
	const [avgRating, setAvgRating] = useState<LeaderboardEntry[]>([])
	const [error, setError] = useState<string | null>(null)
	const year = new Date().getFullYear()

	useEffect(() => {
		Promise.all([
			api.get<{ results: LeaderboardEntry[] }>('/api/leaderboards/completions'),
			api.get<{ results: LeaderboardEntry[] }>('/api/leaderboards/avg-rating'),
		])
			.then(([completionsData, avgRatingData]) => {
				setCompletions(completionsData.results)
				setAvgRating(avgRatingData.results)
			})
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [])

	return (
		<div>
			<h1>Leaderboards</h1>
			{error && <p className="error">{error}</p>}
			<div className="leaderboard-columns">
				<section>
					<h2>Most completed in {year}</h2>
					{completions.length === 0 ? (
						<p>No completions yet this year.</p>
					) : (
						<ol className="leaderboard-list">
							{completions.map((entry) => (
								<li key={entry.user.id}>
									<span>{entry.user.username}</span>
									<span>{entry.score}</span>
								</li>
							))}
						</ol>
					)}
				</section>
				<section>
					<h2>Highest average rating</h2>
					{avgRating.length === 0 ? (
						<p>No ratings yet.</p>
					) : (
						<ol className="leaderboard-list">
							{avgRating.map((entry) => (
								<li key={entry.user.id}>
									<span>{entry.user.username}</span>
									<span>{entry.score.toFixed(1)}</span>
								</li>
							))}
						</ol>
					)}
				</section>
			</div>
		</div>
	)
}
