'use client'

import { useState, memo } from 'react'
import { Button } from '@/components/ui/Button'
import {
Card,
CardContent,
CardDescription,
CardHeader,
CardTitle
} from '@/components/ui/Card'
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
DialogTrigger
} from '@/components/ui/Dialog'
import { AlertTriangle, Trash2, Download, LogOut, XCircle } from 'lucide-react'

interface DangerZoneProps {

onDeleteAccount: () => void
onExportData: () => void
onSignOutAll: () => void

isSignOutAllPending?: boolean

isDeleteAccountPending?: boolean
}

export const DangerZone = memo(function DangerZone({
onDeleteAccount,
onExportData,
onSignOutAll,
isSignOutAllPending = false,
isDeleteAccountPending = false,
}: DangerZoneProps) {

const [signOutAllDialogOpen, setSignOutAllDialogOpen] = useState(false)

return (
<div className='space-y-6'>
<div className='flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20'>
<AlertTriangle
className='w-5 h-5 text-destructive'
aria-hidden='true'
        />
<div>
<h3 className='text-lg font-semibold text-destructive'>
Danger Zone
          </h3>
<p className='text-sm text-destructive/80'>
Actions here are irreversible. Please proceed with caution.
          </p>
</div>
</div>

{/* Export Data */}
<Card className='border-border/40 py-4'>
<CardHeader>
<CardTitle className='flex items-center gap-2'>
<Download className='w-5 h-5 text-primary' aria-hidden='true' />
Export Your Data
          </CardTitle>
<CardDescription>
Download all your data including quiz history, achievements, and
            account information
          </CardDescription>
</CardHeader>
<CardContent>
<Button
variant='outline'
onClick={onExportData}
aria-label='Export your data'
          >
<Download className='w-4 h-4 mr-2' aria-hidden='true' />
Export Data
          </Button>
</CardContent>
</Card>

{/* Sign Out All Sessions */}
<Card className='border-border/40 py-4'>
<CardHeader>
<CardTitle className='flex items-center gap-2'>
<LogOut className='w-5 h-5 text-amber-500' aria-hidden='true' />
Sign Out All Sessions
          </CardTitle>
<CardDescription>
Sign out from all devices where you are currently logged in
          </CardDescription>
</CardHeader>
<CardContent>
<Dialog
open={signOutAllDialogOpen}
onOpenChange={(open) => {

if (isSignOutAllPending && !open) return;
setSignOutAllDialogOpen(open);
            }}
          >
<DialogTrigger asChild>
<Button
variant='outline'
className='text-amber-500 hover:text-amber-500'
aria-label='Sign out from all sessions'
disabled={isSignOutAllPending}
              >
<LogOut className='w-4 h-4 mr-2' aria-hidden='true' />
Sign Out All Sessions
              </Button>
</DialogTrigger>
<DialogContent>
<DialogHeader>
<DialogTitle>Sign Out All Sessions</DialogTitle>
<DialogDescription>
This will sign you out from all devices. You will need to log
                  in again on each device.
                </DialogDescription>
</DialogHeader>
<DialogFooter>
<Button
variant='outline'
onClick={() => setSignOutAllDialogOpen(false)}
disabled={isSignOutAllPending}
                >
Cancel
                </Button>
<Button
variant='destructive'
onClick={() => {
onSignOutAll();
                    // Leave the modal open while pending; the route
                    // change on success navigates away. If the
                    // request errors, the page stays put and the
                    // caller can dismiss manually.
                  }}
disabled={isSignOutAllPending}
aria-busy={isSignOutAllPending}
                >
{isSignOutAllPending ? 'Signing out…' : 'Sign Out All'}
</Button>
</DialogFooter>
</DialogContent>
</Dialog>
</CardContent>
</Card>

{/* Deactivate Account */}
<Card className='border-border/40 py-4'>
<CardHeader>
<CardTitle className='flex items-center gap-2'>
<XCircle className='w-5 h-5 text-amber-500' aria-hidden='true' />
Deactivate Account
          </CardTitle>
<CardDescription>
Temporarily deactivate your account. Your data will be preserved and
            you can reactivate anytime.
          </CardDescription>
</CardHeader>
<CardContent>
<Dialog>
<DialogTrigger asChild>
<Button
variant='outline'
className='text-amber-500 hover:text-amber-500'
aria-label='Deactivate your account'
              >
<XCircle className='w-4 h-4 mr-2' aria-hidden='true' />
Deactivate Account
              </Button>
</DialogTrigger>
<DialogContent>
<DialogHeader>
<DialogTitle>Deactivate Your Account</DialogTitle>
<DialogDescription>
Your profile will be hidden and you will not appear in
                  searches or leaderboards. You can reactivate your account at
                  any time by logging in again.
                </DialogDescription>
</DialogHeader>
<DialogFooter>
<Button variant='outline'>Cancel</Button>
<Button variant='destructive'>Deactivate</Button>
</DialogFooter>
</DialogContent>
</Dialog>
</CardContent>
</Card>

{/* Delete Account — T18: thin trigger. The real modal lives in
          `DeleteAccountModal` (Epic 2.10) and is wired by the parent
          (settings/page.tsx). The trigger does NOT submit; it only
          opens the parent-owned modal. */}
<Card className='border-destructive/50 py-5'>
<CardHeader>
<CardTitle className='flex items-center gap-2 text-destructive'>
<Trash2 className='w-5 h-5' aria-hidden='true' />
Delete Account
          </CardTitle>
<CardDescription>
Permanently delete your account and all associated data. This action
            cannot be undone.
          </CardDescription>
</CardHeader>
<CardContent>
<Button
variant='destructive'
onClick={onDeleteAccount}
disabled={isDeleteAccountPending}
aria-label='Delete your account permanently'
          >
<Trash2 className='w-4 h-4 mr-2' aria-hidden='true' />
Delete Account
          </Button>
</CardContent>
</Card>
</div>
  )
})
