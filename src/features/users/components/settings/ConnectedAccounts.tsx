'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
Card,
CardContent,
CardDescription,
CardHeader,
CardTitle,
} from '@/components/ui/Card';
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
} from '@/components/ui/Dialog';
import { useToast } from '@/lib/forms/useToast';
import { FormErrorBanner } from '@/components/primitives/form/FormErrorBanner';
import { useUpdateMySettings } from '@/features/users/hooks/useUpdateMySettings';
import type {
UserMeResponseDto,
ConnectedAccount,
} from '@/features/users/types/user-backend';
import { Link2, Check, X, ExternalLink, Loader2 } from 'lucide-react';

export interface ConnectedAccountsProps {
profile: UserMeResponseDto | null;
}

type Provider = 'google' | 'github' | 'discord' | 'twitter';

interface ProviderConfig {
key: Provider;
label: string;
description: string;
icon: React.ReactNode;
}

interface AccountData {
google: ConnectedAccount | null;
github: ConnectedAccount | null;
discord: ConnectedAccount | null;
twitter: ConnectedAccount | null;
}

function GoogleIcon() {
return (
<svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
</svg>
  );
}

function GitHubIcon() {
return (
<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
</svg>
  );
}

function DiscordIcon() {
return (
<svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
<path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
</svg>
  );
}

function TwitterIcon() {
return (
<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
</svg>
  );
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
{
key: 'google',
label: 'Google',
description: 'Sign in with Google for quick access.',
icon: <GoogleIcon />,
  },
{
key: 'github',
label: 'GitHub',
description: 'Connect your GitHub account.',
icon: <GitHubIcon />,
  },
{
key: 'discord',
label: 'Discord',
description: 'Join our community and sync your profile.',
icon: <DiscordIcon />,
  },
{
key: 'twitter',
label: 'X (Twitter)',
description: 'Share your achievements on X.',
icon: <TwitterIcon />,
  },
];

interface AccountProviderRowProps {
config: ProviderConfig;
account: ConnectedAccount | null;
isSaving: boolean;
onConnect: (provider: Provider) => void;
onDisconnect: (provider: Provider) => void;
}

const AccountProviderRow = memo(function AccountProviderRow({
config,
account,
isSaving,
onConnect,
onDisconnect,
}: AccountProviderRowProps) {
return (
<div className="flex items-center justify-between p-4 rounded-lg border border-border/40 bg-background/50">
<div className="flex items-center gap-4">
<div className="p-3 rounded-lg bg-muted/50">{config.icon}</div>
<div>
<h4 className="font-medium">{config.label}</h4>
<p className="text-sm text-muted-foreground">
{account ? account.email : config.description}
</p>
</div>
</div>
{account ? (
<Button
variant="outline"
size="sm"
className="text-destructive hover:text-destructive"
disabled={isSaving}
onClick={() => onDisconnect(config.key)}
aria-label={`Disconnect ${config.label} account`}
        >
{isSaving && (
<Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
          )}
<X className="w-4 h-4 mr-2" aria-hidden="true" />
Disconnect
        </Button>
      ) : (
<Button
variant="outline"
size="sm"
disabled={isSaving}
onClick={() => onConnect(config.key)}
aria-label={`Connect ${config.label} account`}
        >
<Link2 className="w-4 h-4 mr-2" aria-hidden="true" />
Connect
        </Button>
      )}
</div>
  );
});

export const ConnectedAccounts = memo(function ConnectedAccounts({
profile,
}: ConnectedAccountsProps) {
const updateSettings = useUpdateMySettings({});
const toast = useToast();

const defaultAccounts = useMemo<AccountData>(() => {
const stored = (
profile?.settings as Record<string, unknown> | undefined
    )?.connectedAccounts as AccountData | undefined;
return {
google: stored?.google ?? null,
github: stored?.github ?? null,
discord: stored?.discord ?? null,
twitter: stored?.twitter ?? null,
    };
  }, [profile]);

const [localAccounts, setLocalAccounts] = useState(defaultAccounts);
const [pendingDisconnect, setPendingDisconnect] = useState<Provider | null>(null);

useEffect(() => {
setLocalAccounts(defaultAccounts);
  }, [defaultAccounts]);

useEffect(() => {
if (updateSettings.isSuccess) {
toast.push({
title: 'Account settings updated',
body: 'Your changes have been saved.',
durationMs: 3000,
      });
updateSettings.resetError();
    }
  }, [updateSettings.isSuccess, toast, updateSettings]);

const connectedCount = useMemo(
() => Object.values(localAccounts).filter(Boolean).length,
[localAccounts],
  );

const handleConnect = useCallback((provider: Provider) => {
const oauthUrls: Record<Provider, string> = {
google: '/api/auth/oauth/google',
github: '/api/auth/oauth/github',
discord: '/api/auth/oauth/discord',
twitter: '/api/auth/oauth/twitter',
    };
window.open(oauthUrls[provider], '_blank', 'noopener,noreferrer');
  }, []);

const handleDisconnectRequest = useCallback((provider: Provider) => {
setPendingDisconnect(provider);
  }, []);

const handleDisconnectConfirm = useCallback(async () => {
if (!pendingDisconnect) return;
const provider = pendingDisconnect;
const updated: AccountData = { ...localAccounts, [provider]: null };
setLocalAccounts(updated);
setPendingDisconnect(null);
await updateSettings.mutate(
{ preferences: { connectedAccounts: updated } as unknown as Record<string, unknown> } as Parameters<typeof updateSettings.mutate>[0],
    );
  }, [pendingDisconnect, localAccounts, updateSettings]);

const isSaving = updateSettings.isPending;

if (!profile) {
return (
<div className="space-y-6">
<div className="h-16 animate-pulse rounded-lg bg-muted" />
<div className="h-48 animate-pulse rounded-lg bg-muted" />
</div>
    );
  }

return (
<div className="space-y-6">
{/* Error banner */}
{updateSettings.lastError && (
<FormErrorBanner
lastError={{
...updateSettings.lastError,
code: updateSettings.lastApiError?.code ?? 'GLOBAL_UNKNOWN',
          }}
onDismiss={updateSettings.resetError}
        />
      )}

{/* Header */}
<div>
<h3 className="text-lg font-semibold">Connected Accounts</h3>
<p className="text-sm text-muted-foreground">
Connect your accounts for easier login and sharing.
        </p>
</div>

{/* Connection status card */}
<Card className="border-border/40 py-4">
<CardHeader>
<CardTitle className="flex items-center gap-2">
<Link2 className="w-5 h-5 text-primary" aria-hidden="true" />
Connection Status
          </CardTitle>
<CardDescription>
{connectedCount} of 4 accounts connected.
          </CardDescription>
</CardHeader>
<CardContent>
<div className="flex items-center gap-4">
<div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
<div
className="h-full bg-primary transition-all duration-300"
style={{ width: `${(connectedCount / 4) * 100}%` }}
              />
</div>
<span
className="text-sm text-muted-foreground"
style={{ fontVariantNumeric: 'tabular-nums' }}
            >
{connectedCount}/4
            </span>
</div>
</CardContent>
</Card>

{/* Account providers */}
<Card className="border-border/40 py-4">
<CardHeader>
<CardTitle className="flex items-center gap-2">
<ExternalLink className="w-5 h-5 text-primary" aria-hidden="true" />
Social Accounts
          </CardTitle>
<CardDescription>
Link your social accounts to share achievements and login easily.
          </CardDescription>
</CardHeader>
<CardContent className="space-y-3">
{PROVIDER_CONFIGS.map((config) => (
<AccountProviderRow
key={config.key}
config={config}
account={localAccounts[config.key]}
isSaving={isSaving && pendingDisconnect === config.key}
onConnect={handleConnect}
onDisconnect={handleDisconnectRequest}
            />
          ))}
</CardContent>
</Card>

{/* Disconnect confirmation dialog */}
<Dialog
open={pendingDisconnect !== null}
onOpenChange={(open) => !open && setPendingDisconnect(null)}
      >
<DialogContent>
<DialogHeader>
<DialogTitle>Disconnect Account</DialogTitle>
<DialogDescription>
Are you sure you want to disconnect this account? You will no
              longer be able to use it to sign in or share content.
            </DialogDescription>
</DialogHeader>
<DialogFooter>
<Button
variant="outline"
onClick={() => setPendingDisconnect(null)}
            >
Cancel
            </Button>
<Button variant="destructive" onClick={handleDisconnectConfirm}>
Disconnect
            </Button>
</DialogFooter>
</DialogContent>
</Dialog>
</div>
  );
});
