import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { PopularGameCard } from '../components/PopularGameCard'
import { useAuth } from '../context/AuthContext'
import type { PopularGamesResponse } from '../types'
import './Home.css'

export const Home = () => {
	const { user } = useAuth()
	const [popular, setPopular] = useState<PopularGamesResponse | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		api
			.get<PopularGamesResponse>('/api/games/popular')
			.then(setPopular)
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [])

	return (
		<div className="home">
			<section className="home-hero">
				<h1>Track your backlog. Beat your games. Compare with friends.</h1>
				{user ? (
					<p className="home-hero__cta">
						<span>
							Welcome back, <strong>{user.username}</strong>.
						</span>
						<Link to="/dashboard" className="home-hero__button">
							Go to dashboard
						</Link>
					</p>
				) : (
					<p className="home-hero__cta">
						<Link to="/register" className="home-hero__button">
							Get started
						</Link>
						<Link
							to="/login"
							className="home-hero__button home-hero__button--ghost"
						>
							Log in
						</Link>
					</p>
				)}
			</section>

			{error && <p className="error">{error}</p>}

			{popular &&
				popular.community_available &&
				popular.community.length > 0 && (
					<section className="home-section">
						<h2>Popular With Players</h2>
						<div className="game-card-grid">
							{popular.community.map((game) => (
								<PopularGameCard key={game.id} game={game} onError={setError} />
							))}
						</div>
					</section>
				)}

			{popular && popular.critics.length > 0 && (
				<section className="home-section">
					<h2>Critically Acclaimed</h2>
					<div className="game-card-grid">
						{popular.critics.map((game) => (
							<PopularGameCard key={game.id} game={game} onError={setError} />
						))}
					</div>
				</section>
			)}
		</div>
	)
}
