import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
	PASSWORD_POLICY_HINT,
	passwordPolicyError,
} from '../utils/passwordPolicy'
import './AuthForm.css'

export const ResetPassword = () => {
	const { token } = useParams<{ token: string }>()
	const { resetPassword } = useAuth()
	const navigate = useNavigate()
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setError(null)

		if (password !== confirmPassword) {
			setError('passwords do not match')
			return
		}
		const policyError = passwordPolicyError(password)
		if (policyError) {
			setError(policyError)
			return
		}

		setSubmitting(true)
		try {
			await resetPassword(token ?? '', password)
			navigate('/dashboard')
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="auth-form">
			<h1>Reset password</h1>
			<form onSubmit={handleSubmit}>
				<label>
					New password
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						minLength={8}
						required
					/>
				</label>
				<p className="field-hint">{PASSWORD_POLICY_HINT}</p>
				<label>
					Confirm new password
					<input
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						minLength={8}
						required
					/>
				</label>
				{error && <p className="error">{error}</p>}
				<button type="submit" disabled={submitting}>
					{submitting ? 'Resetting...' : 'Reset password'}
				</button>
			</form>
			<p>
				<Link to="/forgot-password">Request a new link</Link>
			</p>
		</div>
	)
}
