import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react'
import { api } from '../api/client'
import type { User } from '../types'

interface AuthContextValue {
	user: User | null
	loading: boolean
	register: (email: string, username: string, password: string) => Promise<User>
	login: (email: string, password: string) => Promise<User>
	logout: () => Promise<void>
	updateProfile: (
		fields: Partial<
			Pick<User, 'profile_visibility' | 'avatar_url' | 'preferred_platforms'>
		>,
	) => Promise<User>
	requestPasswordReset: (email: string) => Promise<void>
	resetPassword: (token: string, password: string) => Promise<User>
	changePassword: (
		currentPassword: string,
		newPassword: string,
	) => Promise<User>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		api
			.get<{ user: User | null }>('/api/auth/me')
			.then((data) => setUser(data.user))
			.catch(() => setUser(null))
			.finally(() => setLoading(false))
	}, [])

	const register = async (
		email: string,
		username: string,
		password: string,
	) => {
		const data = await api.post<User>('/api/auth/register', {
			email,
			username,
			password,
		})
		setUser(data)
		return data
	}

	const login = async (email: string, password: string) => {
		const data = await api.post<User>('/api/auth/login', { email, password })
		setUser(data)
		return data
	}

	const logout = async () => {
		await api.post('/api/auth/logout')
		setUser(null)
	}

	const updateProfile = async (
		fields: Partial<
			Pick<User, 'profile_visibility' | 'avatar_url' | 'preferred_platforms'>
		>,
	) => {
		const data = await api.patch<User>('/api/auth/me', fields)
		setUser(data)
		return data
	}

	const requestPasswordReset = async (email: string) => {
		await api.post('/api/auth/forgot-password', { email })
	}

	const resetPassword = async (token: string, password: string) => {
		const data = await api.post<User>('/api/auth/reset-password', {
			token,
			password,
		})
		setUser(data)
		return data
	}

	const changePassword = async (
		currentPassword: string,
		newPassword: string,
	) => {
		const data = await api.post<User>('/api/auth/change-password', {
			current_password: currentPassword,
			new_password: newPassword,
		})
		setUser(data)
		return data
	}

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				register,
				login,
				logout,
				updateProfile,
				requestPasswordReset,
				resetPassword,
				changePassword,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

export const useAuth = () => {
	const ctx = useContext(AuthContext)
	if (!ctx) throw new Error('useAuth must be used within AuthProvider')
	return ctx
}
