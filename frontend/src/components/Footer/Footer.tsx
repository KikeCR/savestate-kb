import { GithubIcon, LinkedinIcon } from './BrandIcons'
import './Footer.css'

const GITHUB_URL = 'https://github.com/KikeCR'
const LINKEDIN_URL =
	'https://www.linkedin.com/in/luis-enrique-barrantes-8141995b/'

export const Footer = () => {
	const year = new Date().getFullYear()

	return (
		<footer className="footer">
			<div className="footer__row">
				<p className="footer__copyright">
					&copy; {year} Luis Barrantes. Built with care.
				</p>
				<div className="footer__social">
					<a
						href={GITHUB_URL}
						target="_blank"
						rel="noopener noreferrer"
						aria-label="GitHub"
					>
						<GithubIcon />
					</a>
					<a
						href={LINKEDIN_URL}
						target="_blank"
						rel="noopener noreferrer"
						aria-label="LinkedIn"
					>
						<LinkedinIcon />
					</a>
				</div>
			</div>
			<p className="footer__credit">
				Game data provided by{' '}
				<a href="https://rawg.io" target="_blank" rel="noreferrer">
					RAWG.io
				</a>
			</p>
		</footer>
	)
}
