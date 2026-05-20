'use client'

import { useState, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle, Trash2, Download, LogOut, XCircle } from 'lucide-react'

interface DangerZoneProps {
  onDeleteAccount: () => void
  onExportData: () => void
  onSignOutAll: () => void
}

export const DangerZone = memo(function DangerZone({
  onDeleteAccount,
  onExportData,
  onSignOutAll
}: DangerZoneProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [confirmations, setConfirmations] = useState({
    understand: false,
    permanent: false,
    noRecovery: false
  })

  const canDelete =
    confirmText === 'DELETE' &&
    confirmations.understand &&
    confirmations.permanent &&
    confirmations.noRecovery

  const handleDeleteAccount = () => {
    if (canDelete) {
      onDeleteAccount()
      setDeleteDialogOpen(false)
      setConfirmText('')
      setConfirmations({
        understand: false,
        permanent: false,
        noRecovery: false
      })
    }
  }

  const resetDeleteDialog = () => {
    setConfirmText('')
    setConfirmations({ understand: false, permanent: false, noRecovery: false })
  }

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
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant='outline'
                className='text-amber-500 hover:text-amber-500'
                aria-label='Sign out from all sessions'
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
                <Button variant='outline'>Cancel</Button>
                <Button variant='destructive' onClick={onSignOutAll}>
                  Sign Out All
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

      {/* Delete Account */}
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
          <Dialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open)
              if (!open) resetDeleteDialog()
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant='destructive'
                aria-label='Delete your account permanently'
              >
                <Trash2 className='w-4 h-4 mr-2' aria-hidden='true' />
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2 text-destructive'>
                  <AlertTriangle className='w-5 h-5' aria-hidden='true' />
                  Delete Your Account
                </DialogTitle>
                <DialogDescription>
                  This action is permanent and cannot be reversed. All your data
                  will be permanently deleted.
                </DialogDescription>
              </DialogHeader>

              <div className='space-y-4 py-4'>
                <div className='p-3 rounded-lg bg-destructive/10 border border-destructive/20'>
                  <p className='text-sm text-destructive font-medium'>
                    What will be deleted:
                  </p>
                  <ul className='mt-2 text-sm text-destructive/80 space-y-1'>
                    <li>• All your quiz history and scores</li>
                    <li>• Your achievements and badges</li>
                    <li>• Your created quizzes</li>
                    <li>• Your friends list and social connections</li>
                    <li>• All account settings and preferences</li>
                  </ul>
                </div>

                <div className='space-y-3'>
                  <div className='flex items-start space-x-3'>
                    <Checkbox
                      id='understand'
                      checked={confirmations.understand}
                      onCheckedChange={(checked) =>
                        setConfirmations({
                          ...confirmations,
                          understand: checked === true
                        })
                      }
                    />
                    <Label
                      htmlFor='understand'
                      className='text-sm cursor-pointer'
                    >
                      I understand that deleting my account is permanent
                    </Label>
                  </div>
                  <div className='flex items-start space-x-3'>
                    <Checkbox
                      id='permanent'
                      checked={confirmations.permanent}
                      onCheckedChange={(checked) =>
                        setConfirmations({
                          ...confirmations,
                          permanent: checked === true
                        })
                      }
                    />
                    <Label
                      htmlFor='permanent'
                      className='text-sm cursor-pointer'
                    >
                      I understand that all my data will be permanently deleted
                    </Label>
                  </div>
                  <div className='flex items-start space-x-3'>
                    <Checkbox
                      id='noRecovery'
                      checked={confirmations.noRecovery}
                      onCheckedChange={(checked) =>
                        setConfirmations({
                          ...confirmations,
                          noRecovery: checked === true
                        })
                      }
                    />
                    <Label
                      htmlFor='noRecovery'
                      className='text-sm cursor-pointer'
                    >
                      I understand that this action cannot be recovered
                    </Label>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='confirmDelete'>
                    Type <strong>DELETE</strong> to confirm:
                  </Label>
                  <Input
                    id='confirmDelete'
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder='DELETE'
                    className='font-mono'
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant='outline'
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant='destructive'
                  disabled={!canDelete}
                  onClick={handleDeleteAccount}
                  aria-label='Confirm account deletion'
                >
                  <Trash2 className='w-4 h-4 mr-2' aria-hidden='true' />
                  Delete My Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
})
