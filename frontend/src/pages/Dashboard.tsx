import { BookMarked, Clock, Gamepad2, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Avatar } from '../components/Avatar'
import { GameCard } from '../components/GameCard'
import { StatTile } from '../components/StatTile'
import { useAuth } from '../context/AuthContext'
import type { ActivityEvent, DashboardSummary } from '../types'
import { renderActivityMessage } from '../utils/activityMessage'
import './Dashboard.css'

export const Dashboard = () => {
	const { user, updateProfile } = useAuth()
	const [summary, setSummary] = useState<DashboardSummary | null>(null)
	const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([])
	const [error, setError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [avatarUrlInput, setAvatarUrlInput] = useState('')

	useEffect(() => {
		if (!user) return
		setAvatarUrlInput(user.avatar_url ?? '')
	}, [user])

	useEffect(() => {
		Promise.all([
			api.get<DashboardSummary>('/api/dashboard/summary'),
			api.get<{ results: ActivityEvent[] }>('/api/activity?limit=5'),
		])
			.then(([summaryData, activityData]) => {
				setSummary(summaryData)
				setRecentActivity(activityData.results)
			})
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [])

	if (!user) return null

	const handleVisibilityChange = async (visibility: 'public' | 'private') => {
		if (visibility === user.profile_visibility) return
		setSaving(true)
		try {
			await updateProfile({ profile_visibility: visibility })
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSaving(false)
		}
	}

	const handleAvatarSave = async () => {
		setSaving(true)
		try {
			await updateProfile({ avatar_url: avatarUrlInput.trim() || null })
			setError(null)
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSaving(false)
		}
	}

	const handleAvatarClear = async () => {
		setAvatarUrlInput('')
		setSaving(true)
		try {
			await updateProfile({ avatar_url: null })
			setError(null)
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSaving(false)
		}
	}

	return (
		<div>
			<h1>Dashboard</h1>
			<p>
				Logged in as <strong>{user.username}</strong> ({user.email})
			</p>
			<p>
				<Link to={`/profile/${user.username}`}>View my public profile</Link>
			</p>

			{error && <p className="error">{error}</p>}

			<div className="visibility-toggle">
				<span>Profile visibility:</span>
				<label>
					<input
						type="radio"
						name="visibility"
						checked={user.profile_visibility === 'public'}
						onChange={() => handleVisibilityChange('public')}
						disabled={saving}
					/>
					Public
				</label>
				<label>
					<input
						type="radio"
						name="visibility"
						checked={user.profile_visibility === 'private'}
						onChange={() => handleVisibilityChange('private')}
						disabled={saving}
					/>
					Private
				</label>
			</div>

			<div className="avatar-edit-row">
				<Avatar username={user.username} avatarUrl={user.avatar_url} size={48} />
				<input
					type="url"
					placeholder="https://example.com/avatar.png"
					value={avatarUrlInput}
					onChange={(e) => setAvatarUrlInput(e.target.value)}
					disabled={saving}
				/>
				<button type="button" onClick={handleAvatarSave} disabled={saving}>
					Save
				</button>
				<button type="button" onClick={handleAvatarClear} disabled={saving}>
					Clear
				</button>
			</div>

			{summary && (
				<>
					<div className="dashboard-stats-grid">
						<StatTile
							label="Backlog"
							value={summary.status_counts.backlog}
							icon={<BookMarked size={20} />}
						/>
						<StatTile
							label="Currently Playing"
							value={summary.status_counts.playing}
							icon={<Gamepad2 size={20} />}
						/>
						<StatTile
							label="Completed This Year"
							value={summary.completed_this_year}
							icon={<Trophy size={20} />}
						/>
						<StatTile
							label="Total Hours Played"
							value={`${Math.round(summary.total_hours_played)} hrs`}
							icon={<Clock size={20} />}
						/>
					</div>

					<h2>Currently Playing</h2>
					{summary.currently_playing.length === 0 ? (
						<p>Nothing in progress — start a game from your library.</p>
					) : (
						<div className="game-card-grid">
							{summary.currently_playing.map((entry) => (
								<GameCard key={entry.id} entry={entry} />
							))}
						</div>
					)}
				</>
			)}

			<div className="page-header-row">
				<h2>Recent Activity</h2>
				<Link to="/activity">View all</Link>
			</div>
			{recentActivity.length === 0 ? (
				<p>No activity yet. Follow other players to see their activity here.</p>
			) : (
				<ul className="activity-feed">
					{recentActivity.map((event, i) => (
						<li key={i}>
							{event.game_cover_image_url ? (
								<img
									src={event.game_cover_image_url}
									alt={event.game_title}
									width={32}
								/>
							) : (
								<div
									className="activity-feed__cover-placeholder"
									aria-hidden="true"
								/>
							)}
							<span>{renderActivityMessage(event)}</span>
							<span className="activity-feed__time">
								{new Date(event.created_at).toLocaleString()}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
