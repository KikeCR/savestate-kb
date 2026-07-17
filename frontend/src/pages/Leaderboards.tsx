import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { YearSelect } from '../components/YearSelect'
import type { LeaderboardEntry } from '../types'
import './Leaderboards.css'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i)

export const Leaderboards = () => {
	const [completions, setCompletions] = useState<LeaderboardEntry[]>([])
	const [avgRating, setAvgRating] = useState<LeaderboardEntry[]>([])
	const [error, setError] = useState<string | null>(null)
	const [year, setYear] = useState(CURRENT_YEAR)

	useEffect(() => {
		api
			.get<{ results: LeaderboardEntry[] }>('/api/leaderboards/avg-rating')
			.then((data) => setAvgRating(data.results))
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [])

	useEffect(() => {
		api
			.get<{ year: number; results: LeaderboardEntry[] }>(
				`/api/leaderboards/completions?year=${year}`,
			)
			.then((data) => setCompletions(data.results))
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [year])

	return (
		<div>
			<h1>Leaderboards</h1>
			{error && <p className="error">{error}</p>}
			<div className="leaderboard-columns">
				<section>
					<div className="leaderboard-section-header">
						<h2>Most completed</h2>
						<YearSelect
							value={String(year)}
							onValueChange={(value) => setYear(Number(value))}
							options={YEAR_OPTIONS.map((y) => ({
								value: String(y),
								label: String(y),
							}))}
							ariaLabel="Leaderboard year"
						/>
					</div>
					{completions.length === 0 ? (
						<p>No completions in {year}.</p>
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
