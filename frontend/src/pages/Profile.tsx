import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Avatar } from '../components/Avatar'
import { BarChart } from '../components/BarChart'
import { FollowButton } from '../components/FollowButton'
import { GameCard } from '../components/GameCard'
import { useAuth } from '../context/AuthContext'
import type { FollowActionResponse, ProfileResponse } from '../types'
import './Profile.css'

export const Profile = () => {
	const { username } = useParams<{ username: string }>()
	const { user: currentUser } = useAuth()
	const [profile, setProfile] = useState<ProfileResponse | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [followState, setFollowState] = useState<FollowActionResponse | null>(
		null,
	)

	useEffect(() => {
		if (!username) return
		setProfile(null)
		setFollowState(null)
		setError(null)
		api
			.get<ProfileResponse>(`/api/users/${username}`)
			.then((data) => {
				setProfile(data)
				setFollowState({
					is_following: data.is_following,
					follower_count: data.follower_count,
				})
			})
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [username])

	if (error) return <p className="error">{error}</p>
	if (!profile || !followState) return <p>Loading...</p>

	const { user, is_owner, following_count, entries, stats } = profile

	return (
		<div>
			<div className="profile-header-row">
				<Avatar
					username={user.username}
					avatarUrl={user.avatar_url}
					size={64}
				/>
				<h1>{user.username}</h1>
			</div>
			<p className="profile-meta">
				{is_owner && 'This is your profile. '}
				Member since {new Date(user.created_at).toLocaleDateString()}
			</p>
			<p className="profile-follow-row">
				<Link to={`/profile/${user.username}/followers`}>
					{followState.follower_count} Followers
				</Link>
				{' · '}
				<Link to={`/profile/${user.username}/following`}>
					{following_count} Following
				</Link>
				{currentUser && !is_owner && (
					<FollowButton
						username={user.username}
						isFollowing={followState.is_following}
						onToggle={setFollowState}
						onError={setError}
					/>
				)}
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
				<section>
					<h3>Played by year</h3>
					<BarChart
						data={stats.games_per_year.map((g) => ({
							label: String(g.year),
							value: g.count,
						}))}
						emptyMessage="No games tagged with a year played yet."
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
