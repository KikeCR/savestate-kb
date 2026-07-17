export interface User {
	id: number
	email: string
	username: string
	profile_visibility: 'public' | 'private'
	created_at: string
}
