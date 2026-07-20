import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ActivityEvent } from '../types'
import { renderActivityMessage } from '../utils/activityMessage'

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
				<p>
					No activity yet. Follow other players to see their activity here.
				</p>
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
							<span>{renderActivityMessage(event)}</span>
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
