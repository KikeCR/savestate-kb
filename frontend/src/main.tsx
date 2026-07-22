import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import '@fontsource-variable/manrope/index.css'
import '@fontsource-variable/orbitron/index.css'
import './index.css'
import './styles/shared.css'

createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<ThemeProvider>
			<BrowserRouter>
				<AuthProvider>
					<ToastProvider>
						<App />
					</ToastProvider>
				</AuthProvider>
			</BrowserRouter>
		</ThemeProvider>
	</React.StrictMode>,
)
