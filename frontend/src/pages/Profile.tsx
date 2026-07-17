import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { BarChart } from '../components/BarChart'
import { GameCard } from '../components/GameCard'
import type { ProfileResponse } from '../types'

export const Profile = () => {
	const { username } = useParams<{ username: string }>()
	const [profile, setProfile] = useState<ProfileResponse | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!username) return
		setProfile(null)
		setError(null)
		api
			.get<ProfileResponse>(`/api/users/${username}`)
			.then(setProfile)
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [username])

	if (error) return <p className="error">{error}</p>
	if (!profile) return <p>Loading...</p>

	const { user, is_owner, entries, stats } = profile

	return (
		<div>
			<h1>{user.username}</h1>
			<p className="profile-meta">
				{is_owner && 'This is your profile. '}
				Member since {new Date(user.created_at).toLocaleDateString()}
			</p>

			<h2>Stats</h2>
			<div className="stats-grid">
				<section>
					<h3>Genre breakdown</h3>
					<BarChart
						data={stats.genre_breakdown.map((g) => ({
							label: g.genre,
							value: g.count,
						}))}
					/>
				</section>
				<section>
					<h3>Rating distribution</h3>
					<BarChart
						data={stats.rating_distribution.map((r) => ({
							label: `${r.rating}/10`,
							value: r.count,
						}))}
					/>
				</section>
				<section>
					<h3>Completed per year</h3>
					<BarChart
						data={stats.completions_per_year.map((c) => ({
							label: String(c.year),
							value: c.count,
						}))}
						emptyMessage="No completions yet."
					/>
				</section>
			</div>

			<h2>Library ({entries.length})</h2>
			{entries.length === 0 ? (
				<p>No games tracked yet.</p>
			) : (
				<div className="game-card-grid">
					{entries.map((entry) => (
						<GameCard key={entry.id} entry={entry} />
					))}
				</div>
			)}
		</div>
	)
}
