import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

export const Dashboard = () => {
	const { user, updateProfileVisibility } = useAuth()
	const [saving, setSaving] = useState(false)

	if (!user) return null

	const handleVisibilityChange = async (visibility: 'public' | 'private') => {
		if (visibility === user.profile_visibility) return
		setSaving(true)
		try {
			await updateProfileVisibility(visibility)
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
		</div>
	)
}
