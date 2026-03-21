import type { ComponentType } from 'react'
import * as LucideIcons from 'lucide-react'

interface CategoryIconProps {
  iconName: string
  colorHex: string
  size?: number
}

type IconComponent = ComponentType<{ size?: number; color?: string }>

export function CategoryIcon({ iconName, colorHex, size = 18 }: CategoryIconProps) {
  // Dynamically resolve the Lucide icon by name
  const icons = LucideIcons as unknown as Record<string, IconComponent>
  const Icon: IconComponent = icons[iconName] ?? icons['Tag']

  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        backgroundColor: colorHex + '22',
        width: size + 16,
        height: size + 16,
      }}
    >
      <Icon size={size} color={colorHex} />
    </div>
  )
}
