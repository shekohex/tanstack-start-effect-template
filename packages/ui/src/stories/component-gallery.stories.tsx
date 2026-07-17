import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDescription,
  AlertTitle,
  AppShell,
  AuthForm,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  CreateOrganizationForm,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Kbd,
  MembersDialog,
  OrganizationSwitcher,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioGroupItem,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Slider,
  StateSurface,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeSelector,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../index'

const meta = {
  title: 'Foundations/Component Gallery',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Gallery: Story = {
  render: () => (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="font-heading text-2xl font-semibold">Core components</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
          <Badge>Active</Badge>
          <Badge variant="secondary">Draft</Badge>
          <Kbd>⌘ K</Kbd>
        </div>
        <ButtonGroup>
          <Button variant="outline">Previous</Button>
          <Button variant="outline">Next</Button>
        </ButtonGroup>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Generic card composition.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>NC</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">Nora Chen</p>
              <p className="text-muted-foreground">nora@example.com</p>
            </div>
          </CardContent>
        </Card>
        <Alert>
          <AlertTitle>Application ready</AlertTitle>
          <AlertDescription>Services and database checks passed.</AlertDescription>
        </Alert>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="gallery-email">Email</FieldLabel>
            <Input id="gallery-email" placeholder="you@example.com" />
            <FieldDescription>Used for account notifications.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="gallery-note">Note</FieldLabel>
            <Textarea id="gallery-note" placeholder="Optional note" />
          </Field>
        </FieldGroup>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Checkbox aria-label="Enable notifications" defaultChecked />
            <Switch aria-label="Enable dark mode" />
            <Toggle>Bold</Toggle>
          </div>
          <ToggleGroup defaultValue={['grid']} multiple>
            <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
            <ToggleGroupItem value="list">List</ToggleGroupItem>
          </ToggleGroup>
          <Slider aria-label="Completion" defaultValue={[40]} />
          <Progress aria-label="Upload progress" value={68} />
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Select defaultValue="member">
          <SelectTrigger aria-label="Member role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <RadioGroup defaultValue="monthly">
          <div className="flex items-center gap-2">
            <RadioGroupItem id="monthly" value="monthly" />
            <label htmlFor="monthly">Monthly</label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem id="yearly" value="yearly" />
            <label htmlFor="yearly">Yearly</label>
          </div>
        </RadioGroup>
        <ThemeSelector onChange={() => undefined} value="system" />
      </section>
      <section className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Example dialog</DialogTitle>
              <DialogDescription>Accessible modal composition.</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">Confirmation</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Continue?</AlertDialogTitle>
              <AlertDialogDescription>
                This action requires explicit confirmation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>Sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Example sheet</SheetTitle>
              <SheetDescription>Responsive secondary surface.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Popover</Button>
          </PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="outline">Hover card</Button>
          </HoverCardTrigger>
          <HoverCardContent>Useful contextual details.</HoverCardContent>
        </HoverCard>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Tooltip</Button>
          </TooltipTrigger>
          <TooltipContent>Helpful label</TooltipContent>
        </Tooltip>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <InputGroup>
          <InputGroupAddon>@</InputGroupAddon>
          <InputGroupInput aria-label="Username" placeholder="username" />
        </InputGroup>
        <Combobox items={['Effect', 'TanStack', 'Vite+']}>
          <ComboboxInput
            aria-label="Framework"
            placeholder="Choose framework"
            showTrigger={false}
          />
          <ComboboxContent>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </section>
      <h2 className="font-heading text-xl font-semibold">Disclosure and navigation</h2>
      <Accordion>
        <AccordionItem value="first">
          <AccordionTrigger>Architecture boundary</AccordionTrigger>
          <AccordionContent>
            Domain stays independent from transport and persistence.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost">Advanced options</Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 text-muted-foreground">
          Optional configuration.
        </CollapsibleContent>
      </Collapsible>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview content</TabsContent>
        <TabsContent value="activity">Activity content</TabsContent>
      </Tabs>
      <ScrollArea className="h-32 rounded-lg border p-3">
        {Array.from({ length: 12 }, (_, index) => (
          <p key={index}>Scrollable row {index + 1}</p>
        ))}
      </ScrollArea>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Nora Chen</TableCell>
            <TableCell>Owner</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Sam Lee</TableCell>
            <TableCell>Member</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <ResizablePanelGroup className="h-32 rounded-lg border" orientation="horizontal">
        <ResizablePanel defaultSize={50}>
          <div className="p-4">Panel one</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>
          <div className="p-4">Panel two</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div className="grid gap-5 md:grid-cols-2">
      <StateSurface state="loading" />
      <StateSurface state="empty" />
      <StateSurface actionLabel="Retry" onAction={() => undefined} state="error" />
      <StateSurface state="permission" />
    </div>
  ),
}
export const Authentication: Story = {
  render: () => <AuthForm onLogin={() => undefined} onRegister={() => undefined} />,
}
export const AuthenticationError: Story = {
  render: () => (
    <AuthForm
      error="Email or password is incorrect."
      onLogin={() => undefined}
      onRegister={() => undefined}
    />
  ),
}
export const AuthenticationPending: Story = {
  render: () => <AuthForm onLogin={() => undefined} onRegister={() => undefined} pending />,
}
export const FirstOrganization: Story = {
  render: () => <CreateOrganizationForm onCreate={() => undefined} userDisplayName="Nora Chen" />,
}
export const ResponsiveShell: Story = {
  render: () => (
    <AppShell
      appName="Example"
      navigation={
        <nav className="flex flex-col gap-2">
          <Button className="justify-start" variant="ghost">
            Overview
          </Button>
          <Button className="justify-start" variant="ghost">
            Members
          </Button>
        </nav>
      }
      organizationSwitcher={
        <OrganizationSwitcher
          activeOrganizationId="org_1"
          onSelect={() => undefined}
          organizations={[
            { id: 'org_1', name: 'Acme' },
            { id: 'org_2', name: 'Example' },
          ]}
        />
      }
      userName="Nora Chen"
    >
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Neutral responsive application shell.</CardDescription>
        </CardHeader>
        <CardContent>
          <StateSurface state="empty" />
        </CardContent>
      </Card>
    </AppShell>
  ),
}
export const MemberManagement: Story = {
  render: function MemberManagementStory() {
    const [open, setOpen] = useState(true)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Manage members</Button>
        <MembersDialog
          members={[
            {
              email: 'nora@example.com',
              id: 'mem_1',
              isCurrent: true,
              name: 'Nora Chen',
              role: 'owner',
              status: 'active',
            },
            {
              email: 'sam@example.com',
              id: 'mem_2',
              name: 'Sam Lee',
              role: 'member',
              status: 'active',
            },
          ]}
          onChangeRole={() => undefined}
          onChangeStatus={() => undefined}
          onOpenChange={setOpen}
          onRemove={() => undefined}
          onTransferOwnership={() => undefined}
          open={open}
        />
      </>
    )
  },
}
export const LoadingSkeletons: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-3">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Separator />
    </div>
  ),
}
