import * as Tabs from '@radix-ui/react-tabs'
import { BookMarked, ChevronRight, Gamepad2, Trophy } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Avatar } from '../components/Avatar'
import { GameCard } from '../components/GameCard'
import { StatTile } from '../components/StatTile'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PLATFORMS, type ActivityEvent, type DashboardSummary } from '../types'
import { renderActivityMessage } from '../utils/activityMessage'
import {
	PASSWORD_POLICY_HINT,
	passwordPolicyError,
} from '../utils/passwordPolicy'
import './Dashboard.css'

export const Dashboard = () => {
	const { user, updateProfile, changePassword } = useAuth()
	const { showToast } = useToast()
	const [summary, setSummary] = useState<DashboardSummary | null>(null)
	const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([])
	const [error, setError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [avatarUrlInput, setAvatarUrlInput] = useState('')
	const [currentPassword, setCurrentPassword] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmNewPassword, setConfirmNewPassword] = useState('')
	const [changingPassword, setChangingPassword] = useState(false)

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

	const handleTogglePlatform = async (platform: string) => {
		const next = user.preferred_platforms.includes(platform)
			? user.preferred_platforms.filter((p) => p !== platform)
			: [...user.preferred_platforms, platform]
		setSaving(true)
		try {
			await updateProfile({ preferred_platforms: next })
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

	const handleChangePassword = async (e: FormEvent) => {
		e.preventDefault()
		setError(null)

		if (newPassword !== confirmNewPassword) {
			setError('new passwords do not match')
			return
		}
		const policyError = passwordPolicyError(newPassword)
		if (policyError) {
			setError(policyError)
			return
		}

		setChangingPassword(true)
		try {
			await changePassword(currentPassword, newPassword)
			setCurrentPassword('')
			setNewPassword('')
			setConfirmNewPassword('')
			showToast({ message: 'Password updated' })
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setChangingPassword(false)
		}
	}

	return (
		<div>
			<h1>Dashboard</h1>

			{error && <p className="error">{error}</p>}

			<Tabs.Root defaultValue="overview" className="dashboard-tabs">
				<Tabs.List
					className="dashboard-tabs__list"
					aria-label="Dashboard sections"
				>
					<Tabs.Trigger value="overview" className="dashboard-tabs__trigger">
						Overview
					</Tabs.Trigger>
					<Tabs.Trigger value="preferences" className="dashboard-tabs__trigger">
						Preferences
					</Tabs.Trigger>
					<Tabs.Trigger value="password" className="dashboard-tabs__trigger">
						Change Password
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="overview" className="dashboard-tabs__content">
					<p>
						Logged in as <strong>{user.username}</strong> ({user.email})
					</p>
					<p>
						<Link to={`/profile/${user.username}`} className="link-action">
							View my public profile <ChevronRight size={14} />
						</Link>
					</p>

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
						<Link to="/activity" className="link-action">
							View all <ChevronRight size={14} />
						</Link>
					</div>
					{recentActivity.length === 0 ? (
						<p>
							No activity yet. Follow other players to see their activity here.
						</p>
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
				</Tabs.Content>

				<Tabs.Content value="preferences" className="dashboard-tabs__content">
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
						<Avatar
							username={user.username}
							avatarUrl={user.avatar_url}
							size={48}
						/>
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

					<p>
						Platforms you own or prefer — recommendations lean toward games
						available on these, without excluding anything else.
					</p>
					<div className="platform-toggle">
						{PLATFORMS.map((platform) => (
							<label key={platform}>
								<input
									type="checkbox"
									checked={user.preferred_platforms.includes(platform)}
									onChange={() => handleTogglePlatform(platform)}
									disabled={saving}
								/>
								{platform}
							</label>
						))}
					</div>
				</Tabs.Content>

				<Tabs.Content value="password" className="dashboard-tabs__content">
					<form
						className="change-password-form"
						onSubmit={handleChangePassword}
					>
						<label>
							Current password
							<input
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								disabled={changingPassword}
								required
							/>
						</label>
						<label>
							New password
							<input
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								minLength={8}
								disabled={changingPassword}
								required
							/>
						</label>
						<p className="field-hint">{PASSWORD_POLICY_HINT}</p>
						<label>
							Confirm new password
							<input
								type="password"
								value={confirmNewPassword}
								onChange={(e) => setConfirmNewPassword(e.target.value)}
								minLength={8}
								disabled={changingPassword}
								required
							/>
						</label>
						<button type="submit" disabled={changingPassword}>
							{changingPassword ? 'Updating...' : 'Update password'}
						</button>
					</form>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	)
}
