import { Badge } from './badge'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Item, ItemContent, ItemDescription, ItemTitle } from './item'
import { ScrollArea } from './scroll-area'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

export interface MemberData {
  readonly email: string
  readonly id: string
  readonly isCurrent?: boolean | undefined
  readonly name: string
  readonly role: 'admin' | 'member' | 'owner'
  readonly status: 'active' | 'removed' | 'suspended'
}

export interface MembersDialogProps {
  readonly members: ReadonlyArray<MemberData>
  readonly onChangeRole?: ((memberId: string, role: 'admin' | 'member') => void) | undefined
  readonly onChangeStatus?: ((memberId: string, status: 'active' | 'suspended') => void) | undefined
  readonly onInvite?: (() => void) | undefined
  readonly onOpenChange: (open: boolean) => void
  readonly onRemove?: ((memberId: string) => void) | undefined
  readonly onTransferOwnership?: ((memberId: string) => void) | undefined
  readonly open: boolean
}

export function MembersDialog({
  members,
  onChangeRole,
  onChangeStatus,
  onInvite,
  onOpenChange,
  onRemove,
  onTransferOwnership,
  open,
}: MembersDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Organization members</DialogTitle>
          <DialogDescription>Review access, roles, and membership status.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="flex flex-col gap-2">
            {members.map((member) => (
              <Item key={member.id} variant="outline">
                <ItemContent>
                  <ItemTitle>
                    {member.name} {member.isCurrent ? <Badge variant="secondary">You</Badge> : null}
                  </ItemTitle>
                  <ItemDescription>
                    {member.email} · {member.status}
                  </ItemDescription>
                </ItemContent>
                {member.role === 'owner' ? (
                  <Badge>Owner</Badge>
                ) : (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {onChangeRole && member.status === 'active' ? (
                      <Select
                        onValueChange={(role) =>
                          onChangeRole(member.id, role === 'admin' ? 'admin' : 'member')
                        }
                        value={member.role}
                      >
                        <SelectTrigger aria-label={`Role for ${member.name}`} className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    ) : null}
                    {onChangeStatus && member.status !== 'removed' ? (
                      <Button
                        disabled={member.isCurrent}
                        onClick={() =>
                          onChangeStatus(
                            member.id,
                            member.status === 'suspended' ? 'active' : 'suspended',
                          )
                        }
                        size="sm"
                        variant="outline"
                      >
                        {member.status === 'suspended' ? 'Restore' : 'Suspend'}
                      </Button>
                    ) : null}
                    {onTransferOwnership && member.status === 'active' ? (
                      <Button
                        onClick={() => onTransferOwnership(member.id)}
                        size="sm"
                        variant="outline"
                      >
                        Transfer ownership
                      </Button>
                    ) : null}
                    {onRemove ? (
                      <Button
                        disabled={member.isCurrent || member.status === 'removed'}
                        onClick={() => onRemove(member.id)}
                        size="sm"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                )}
              </Item>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
          {onInvite ? <Button onClick={onInvite}>Invite member</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
