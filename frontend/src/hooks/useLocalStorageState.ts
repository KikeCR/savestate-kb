import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

export const useLocalStorageState = <T>(
	key: string,
	initialValue: T,
): [T, Dispatch<SetStateAction<T>>] => {
	const [state, setState] = useState<T>(() => {
		try {
			const stored = window.localStorage.getItem(key)
			return stored !== null ? (JSON.parse(stored) as T) : initialValue
		} catch {
			return initialValue
		}
	})

	useEffect(() => {
		window.localStorage.setItem(key, JSON.stringify(state))
	}, [key, state])

	return [state, setState]
}
