export interface User {
	id: number
	email: string
	username: string
	profile_visibility: 'public' | 'private'
	avatar_url: string | null
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
	year_played: number | null
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
	avatar_url: string | null
	created_at: string
}

export interface LeaderboardEntry {
	user: PublicUser
	score: number
}

export type ActivityAction = 'added' | 'completed' | 'rated' | 'logged_year'

export interface ActivityEvent {
	user_id: number
	username: string
	game_id: number
	game_title: string
	game_cover_image_url: string | null
	action: ActivityAction
	created_at: string
	rating?: number | null
	year_played?: number | null
}

export interface FollowListEntry {
	user: PublicUser
	is_following: boolean
}

export interface FollowActionResponse {
	is_following: boolean
	follower_count: number
}

export interface Stats {
	completions_per_year: { year: number; count: number }[]
	games_per_year: { year: number; count: number }[]
	genre_breakdown: { genre: string; count: number }[]
	rating_distribution: { rating: number; count: number }[]
}

export interface ProfileResponse {
	user: PublicUser
	is_owner: boolean
	is_following: boolean
	follower_count: number
	following_count: number
	entries: Entry[]
	stats: Stats
}

export interface DashboardSummary {
	status_counts: Record<EntryStatus, number>
	completed_this_year: number
	total_hours_played: number
	currently_playing: Entry[]
}
