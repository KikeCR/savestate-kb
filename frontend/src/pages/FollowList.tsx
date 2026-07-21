import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Avatar } from '../components/Avatar'
import { FollowButton } from '../components/FollowButton'
import { useAuth } from '../context/AuthContext'
import type { FollowListEntry } from '../types'
import './FollowList.css'

const useFollowList = (
	username: string | undefined,
	endpoint: 'followers' | 'following',
) => {
	const [entries, setEntries] = useState<FollowListEntry[] | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!username) return
		setEntries(null)
		setError(null)
		api
			.get<{ results: FollowListEntry[] }>(`/api/users/${username}/${endpoint}`)
			.then((data) => setEntries(data.results))
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [username, endpoint])

	return { entries, setEntries, error, setError }
}

const FollowListPage = ({
	endpoint,
	title,
	emptyMessage,
}: {
	endpoint: 'followers' | 'following'
	title: string
	emptyMessage: string
}) => {
	const { username } = useParams<{ username: string }>()
	const { user: currentUser } = useAuth()
	const { entries, setEntries, error, setError } = useFollowList(
		username,
		endpoint,
	)

	return (
		<div>
			<Link to={`/profile/${username}`} className="follow-list__back">
				<ArrowLeft size={14} /> Back to profile
			</Link>
			<h1>
				{title} — {username}
			</h1>
			{error ? (
				<p className="error">{error}</p>
			) : !entries ? (
				<p>Loading...</p>
			) : entries.length === 0 ? (
				<p>{emptyMessage}</p>
			) : (
				<ol className="follow-list">
					{entries.map((entry) => (
						<li key={entry.user.id}>
							<Link
								to={`/profile/${entry.user.username}`}
								className="follow-list__user"
							>
								<Avatar
									username={entry.user.username}
									avatarUrl={entry.user.avatar_url}
									size={28}
								/>
								{entry.user.username}
							</Link>
							{currentUser && currentUser.username !== entry.user.username && (
								<FollowButton
									username={entry.user.username}
									isFollowing={entry.is_following}
									onToggle={(result) =>
										setEntries((prev) =>
											prev
												? prev.map((e) =>
														e.user.username === entry.user.username
															? { ...e, is_following: result.is_following }
															: e,
													)
												: prev,
										)
									}
									onError={setError}
								/>
							)}
						</li>
					))}
				</ol>
			)}
		</div>
	)
}

export const FollowersList = () => (
	<FollowListPage
		endpoint="followers"
		title="Followers"
		emptyMessage="No followers yet."
	/>
)

export const FollowingList = () => (
	<FollowListPage
		endpoint="following"
		title="Following"
		emptyMessage="Not following anyone yet."
	/>
)
