import { useEffect, useState } from 'react'
import './Avatar.css'

const AVATAR_PALETTE = [
	'#2563eb',
	'#16a34a',
	'#9333ea',
	'#dc2626',
	'#d97706',
	'#0891b2',
	'#db2777',
	'#4f46e5',
]

const hashUsername = (username: string) => {
	let hash = 0
	for (let i = 0; i < username.length; i++) {
		hash = (hash << 5) - hash + username.charCodeAt(i)
		hash |= 0
	}
	return Math.abs(hash)
}

const getInitials = (username: string) => username.slice(0, 2).toUpperCase()

interface AvatarProps {
	username: string
	avatarUrl?: string | null
	size?: number
	className?: string
}

export const Avatar = ({
	username,
	avatarUrl,
	size = 32,
	className,
}: AvatarProps) => {
	const [imgError, setImgError] = useState(false)

	useEffect(() => {
		setImgError(false)
	}, [avatarUrl])

	const classes = `avatar${className ? ` ${className}` : ''}`

	if (avatarUrl && !imgError) {
		return (
			<img
				src={avatarUrl}
				alt={username}
				onError={() => setImgError(true)}
				className={`${classes} avatar--image`}
				style={{ width: size, height: size }}
			/>
		)
	}

	const color = AVATAR_PALETTE[hashUsername(username) % AVATAR_PALETTE.length]

	return (
		<div
			className={`${classes} avatar--initials`}
			style={{
				width: size,
				height: size,
				backgroundColor: color,
				fontSize: size * 0.4,
			}}
		>
			{getInitials(username)}
		</div>
	)
}
