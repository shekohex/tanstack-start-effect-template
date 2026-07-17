import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './dropdown-menu'

export interface OrganizationOption {
  readonly id: string
  readonly name: string
}
export interface OrganizationSwitcherProps {
  readonly activeOrganizationId: string
  readonly onCreate?: (() => void) | undefined
  readonly onSelect: (organizationId: string) => void
  readonly organizations: ReadonlyArray<OrganizationOption>
}

export function OrganizationSwitcher({
  activeOrganizationId,
  onCreate,
  onSelect,
  organizations,
}: OrganizationSwitcherProps) {
  const active = organizations.find((organization) => organization.id === activeOrganizationId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Select organization"
          className="max-w-64 justify-between"
          variant="ghost"
        >
          <span className="truncate">{active?.name ?? 'Select organization'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuGroup>
          {organizations.map((organization) => (
            <DropdownMenuItem key={organization.id} onClick={() => onSelect(organization.id)}>
              {organization.name}
            </DropdownMenuItem>
          ))}
          {onCreate ? (
            <DropdownMenuItem onClick={onCreate}>Create organization</DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
