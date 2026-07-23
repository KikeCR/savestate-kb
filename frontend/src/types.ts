export interface User {
	id: number
	email: string
	username: string
	profile_visibility: 'public' | 'private'
	avatar_url: string | null
	preferred_platforms: string[]
	created_at: string
}

// Must match backend PLATFORMS (backend/app/constants.py) — there's no
// shared-constants mechanism across the frontend/backend boundary anywhere
// in this codebase, so this is intentionally hardcoded and cross-referenced
// by comment (same caveat as VISIBLE_RECOMMENDATION_COUNT below).
export const PLATFORMS = [
	'PC',
	'PlayStation 5',
	'PlayStation 4',
	'Xbox Series S/X',
	'Xbox One',
	'Nintendo Switch',
	'macOS',
	'Linux',
	'iOS',
	'Android',
]

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
	metacritic?: number | null
	rawg_rating?: number | null
	tags?: string[]
	description?: string | null
	esrb_rating?: string | null
	developers?: string[]
	publishers?: string[]
	website?: string | null
}

export interface GameDetail extends Game {
	local_average_rating: number | null
	local_ratings_count: number
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
	preferred_platforms: string[]
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

export type RecommendationSource = 'deepseek' | 'kimi' | 'retrieval_only'

export interface Recommendation {
	game: Game
	reason: string
	rank: number
}

export interface RecommendationsResponse {
	source: RecommendationSource
	generated_at: string
	cold_start: boolean
	recommendations: Recommendation[]
}

export type FeedbackSentiment = 'liked' | 'disliked'

export interface GameFeedback {
	id: number
	game_id: number
	sentiment: FeedbackSentiment
	created_at: string
	updated_at: string
}

// Must match backend RECOMMENDATION_RESULT_LIMIT (backend/app/constants.py)
// — there's no shared-constants mechanism across the frontend/backend
// boundary anywhere in this codebase, so this is intentionally hardcoded
// and cross-referenced by comment.
export const VISIBLE_RECOMMENDATION_COUNT = 10

export interface PopularGamesResponse {
	community_available: boolean
	community: Game[]
	critics: Game[]
}
