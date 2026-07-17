import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Login = () => {
	const { login } = useAuth()
	const navigate = useNavigate()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setError(null)
		setSubmitting(true)
		try {
			await login(email, password)
			navigate('/dashboard')
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="auth-form">
			<h1>Log in</h1>
			<form onSubmit={handleSubmit}>
				<label>
					Email
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</label>
				<label>
					Password
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</label>
				{error && <p className="error">{error}</p>}
				<button type="submit" disabled={submitting}>
					{submitting ? 'Logging in...' : 'Log in'}
				</button>
			</form>
			<p>
				No account? <Link to="/register">Register</Link>
			</p>
		</div>
	)
}
