import { useLocalStorageState } from './useLocalStorageState'

export const useToggleState = (
	key: string,
	initialValue = false,
): [boolean, () => void] => {
	const [isToggled, setIsToggled] = useLocalStorageState(key, initialValue)
	const toggle = () => setIsToggled(!isToggled)
	return [isToggled, toggle]
}
