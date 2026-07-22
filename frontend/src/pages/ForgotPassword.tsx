import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AuthForm.css'

export const ForgotPassword = () => {
	const { requestPasswordReset } = useAuth()
	const [email, setEmail] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)
	const [submitted, setSubmitted] = useState(false)

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setError(null)
		setSubmitting(true)
		try {
			await requestPasswordReset(email)
			setSubmitted(true)
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="auth-form">
			<h1>Forgot password</h1>
			{submitted ? (
				<p>If that email is registered, a reset link has been sent to it.</p>
			) : (
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
					{error && <p className="error">{error}</p>}
					<button type="submit" disabled={submitting}>
						{submitting ? 'Sending...' : 'Send reset link'}
					</button>
				</form>
			)}
			<p>
				<Link to="/login">Back to log in</Link>
			</p>
		</div>
	)
}
