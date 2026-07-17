import { useAuth } from '../context/AuthContext'

export const Dashboard = () => {
	const { user } = useAuth()

	if (!user) return null

	return (
		<div>
			<h1>Dashboard</h1>
			<p>
				Logged in as <strong>{user.username}</strong> ({user.email})
			</p>
		</div>
	)
}
