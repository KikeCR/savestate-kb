import type { ActivityEvent } from '../types'

export const renderActivityMessage = (event: ActivityEvent) => {
	switch (event.action) {
		case 'added':
			return (
				<>
					<strong>{event.username}</strong> added{' '}
					<strong>{event.game_title}</strong>
				</>
			)
		case 'completed':
			return (
				<>
					<strong>{event.username}</strong> completed{' '}
					<strong>{event.game_title}</strong>
				</>
			)
		case 'rated':
			return (
				<>
					<strong>{event.username}</strong> rated{' '}
					<strong>{event.game_title}</strong> — {event.rating}/10
				</>
			)
		case 'logged_year':
			return (
				<>
					<strong>{event.username}</strong> logged{' '}
					<strong>{event.game_title}</strong> as played in {event.year_played}
				</>
			)
	}
}
