const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_POLICY_HINT =
	'at least 8 characters, including one uppercase letter and one special character'

// Mirrors the backend rule in backend/app/services/password_policy.py.
// Server-side validation remains authoritative — this is UX-only, so a
// violation can be shown before ever hitting the API.
export const passwordPolicyError = (password: string): string | null => {
	const hasUpper = /[A-Z]/.test(password)
	const hasSpecial = /[^A-Za-z0-9]/.test(password)

	if (password.length < MIN_PASSWORD_LENGTH || !hasUpper || !hasSpecial) {
		return `password must contain ${PASSWORD_POLICY_HINT}`
	}
	return null
}
