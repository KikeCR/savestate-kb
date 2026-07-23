import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '../Avatar'
import type { Review } from '../../types'
import './ReviewCard.css'

export const ReviewCard = ({ review }: { review: Review }) => {
	const { author } = review

	return (
		<div className="review-card">
			<div className="review-card__header">
				<Link
					to={`/profile/${author.username}`}
					className="review-card__author"
				>
					<Avatar
						username={author.username}
						avatarUrl={author.avatar_url}
						size={28}
					/>
					<span>{author.username}</span>
				</Link>
				{review.rating != null && (
					<span className="review-card__rating">
						<Star size={12} /> {review.rating}/10
					</span>
				)}
			</div>
			<p className="review-card__body">{review.body}</p>
			<span className="review-card__date">
				{new Date(review.created_at).toLocaleDateString()}
			</span>
		</div>
	)
}
