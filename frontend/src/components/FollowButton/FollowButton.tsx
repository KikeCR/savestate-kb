import { useState } from 'react'
import { api } from '../../api/client'
import type { FollowActionResponse } from '../../types'
import './FollowButton.css'

interface FollowButtonProps {
	username: string
	isFollowing: boolean
	onToggle: (result: FollowActionResponse) => void
	onError?: (message: string) => void
}

export const FollowButton = ({
	username,
	isFollowing,
	onToggle,
	onError,
}: FollowButtonProps) => {
	const [pending, setPending] = useState(false)

	const handleClick = () => {
		setPending(true)
		const request = isFollowing
			? api.del<FollowActionResponse>(`/api/users/${username}/follow`)
			: api.post<FollowActionResponse>(`/api/users/${username}/follow`)

		request
			.then(onToggle)
			.catch((err) =>
				onError?.(err instanceof Error ? err.message : String(err)),
			)
			.finally(() => setPending(false))
	}

	return (
		<button
			type="button"
			className={`follow-button${isFollowing ? ' follow-button--following' : ''}`}
			onClick={handleClick}
			disabled={pending}
		>
			{isFollowing ? 'Unfollow' : 'Follow'}
		</button>
	)
}
