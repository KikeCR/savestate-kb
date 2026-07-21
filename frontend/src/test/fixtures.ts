import type { Entry, Game } from '../types'

export const makeGame = (overrides: Partial<Game> = {}): Game => ({
	id: 1,
	rawg_id: 100,
	title: 'Celeste',
	cover_image_url: null,
	platforms: ['PC'],
	genres: ['Platformer'],
	release_date: '2018-01-25',
	...overrides,
})

export const makeEntry = (overrides: Partial<Entry> = {}): Entry => ({
	id: 1,
	game: makeGame(),
	status: 'playing',
	rating: null,
	start_date: null,
	completion_date: null,
	year_played: null,
	hours_played: 0,
	notes: null,
	favorite: false,
	replay_count: 0,
	platform_played: null,
	tags: [],
	created_at: '2024-01-01T00:00:00.000Z',
	updated_at: '2024-01-01T00:00:00.000Z',
	...overrides,
})
