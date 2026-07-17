export interface User {
	id: number
	email: string
	username: string
	profile_visibility: 'public' | 'private'
	created_at: string
}

export type EntryStatus =
	'backlog' | 'playing' | 'completed' | 'dropped' | 'replaying'

export const ENTRY_STATUSES: EntryStatus[] = [
	'backlog',
	'playing',
	'completed',
	'dropped',
	'replaying',
]

export const STATUS_LABELS: Record<EntryStatus, string> = {
	backlog: 'Backlog',
	playing: 'Playing',
	completed: 'Completed',
	dropped: 'Dropped',
	replaying: 'Replaying',
}

export interface Game {
	id: number
	rawg_id: number
	title: string
	cover_image_url: string | null
	platforms: string[]
	genres: string[]
	release_date: string | null
}

export interface Entry {
	id: number
	game: Game
	status: EntryStatus
	rating: number | null
	start_date: string | null
	completion_date: string | null
	hours_played: number
	notes: string | null
	favorite: boolean
	replay_count: number
	platform_played: string | null
	tags: string[]
	created_at: string
	updated_at: string
}

export interface PublicUser {
	id: number
	username: string
	profile_visibility: 'public' | 'private'
	created_at: string
}

export interface LeaderboardEntry {
	user: PublicUser
	score: number
}

export type ActivityAction = 'added' | 'completed'

export interface ActivityEvent {
	user_id: number
	username: string
	game_id: number
	game_title: string
	game_cover_image_url: string | null
	action: ActivityAction
	created_at: string
}
