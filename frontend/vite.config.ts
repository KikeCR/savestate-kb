/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { coverageConfigDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	server: {
		host: '0.0.0.0',
		port: 5173,
		watch: {
			usePolling: true,
		},
	},
	test: {
		environment: 'jsdom',
		setupFiles: './src/test/setup.ts',
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			exclude: [
				...coverageConfigDefaults.exclude,
				'src/main.tsx',
				'src/vite-env.d.ts',
				'src/test/**',
				'src/**/index.ts',
			],
			thresholds: {
				lines: 80,
				statements: 80,
				functions: 80,
				branches: 75,
			},
		},
	},
})
