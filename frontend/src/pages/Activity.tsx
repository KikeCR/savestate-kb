import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ActivityEvent } from '../types'

const renderMessage = (event: ActivityEvent) => {
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

export const Activity = () => {
	const [events, setEvents] = useState<ActivityEvent[]>([])
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		api
			.get<{ results: ActivityEvent[] }>('/api/activity')
			.then((data) => setEvents(data.results))
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [])

	return (
		<div>
			<h1>Activity</h1>
			{error && <p className="error">{error}</p>}
			{events.length === 0 ? (
				<p>No activity yet.</p>
			) : (
				<ul className="activity-feed">
					{events.map((event, i) => (
						<li key={i}>
							{event.game_cover_image_url ? (
								<img
									src={event.game_cover_image_url}
									alt={event.game_title}
									width={32}
								/>
							) : (
								<div
									className="activity-feed__cover-placeholder"
									aria-hidden="true"
								/>
							)}
							<span>{renderMessage(event)}</span>
							<span className="activity-feed__time">
								{new Date(event.created_at).toLocaleString()}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
