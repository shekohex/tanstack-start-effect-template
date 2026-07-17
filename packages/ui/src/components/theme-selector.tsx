import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'
import type { ColorMode } from '../theme'

export interface ThemeSelectorProps {
  readonly onChange: (mode: ColorMode) => void
  readonly value: ColorMode
}

export function ThemeSelector({ onChange, value }: ThemeSelectorProps) {
  return (
    <Select
      onValueChange={(next) => onChange(next === 'dark' || next === 'light' ? next : 'system')}
      value={value}
    >
      <SelectTrigger aria-label="Color mode" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="system">System</SelectItem>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
