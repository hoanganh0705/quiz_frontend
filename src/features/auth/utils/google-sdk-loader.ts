

import { isGoogleAuthConfigured } from '../config/google-identity.config';

let googleIdentityInstance: GoogleIdentity | null = null;

let loadPromise: Promise<GoogleIdentity | null> | null = null;

export interface GoogleAccounts {
id: GoogleId;
}

export interface GoogleIdentity {
accounts: GoogleAccounts;
}

export interface GoogleId {

renderButton(
element: HTMLElement,
options: GoogleSignInButtonOptions,
  ): void;

prompt(
callback?: (response: GoogleTokenResponse) => void,
  ): void;

revoke(
hint: string,
callback?: (response: GoogleRevocationResponse) => void,
  ): void;

cancelButton(): void;

storeCredential(
credential: { id: string; provider?: string },
callback?: (response: { supported: boolean }) => void,
  ): void;

disableAutoSelect(): void;

signOut(callback?: () => void): void;
}

export interface GoogleSignInButtonOptions {
type?: 'standard' | 'icon';
theme?: 'outline' | 'filled_blue' | 'filled_black';
size?: 'large' | 'medium' | 'small';
text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
shape?: 'rectangular' | 'pill' | 'circle' | 'square';
logo_alignment?: 'left' | 'center';
width?: number;
height?: number;
}

export interface GoogleTokenResponse {

access_token?: string;

credential?: string;

select_by?: string;

error?: string;
}

export interface GoogleRevocationResponse {
successful: boolean;
error?: string;
}

function isGoogleSdkAvailable(): boolean {
if (typeof window === 'undefined') return false;
const g = (window as Window & { google?: { accounts?: { id?: unknown } } }).google;
return typeof g?.accounts?.id !== 'undefined';
}

function injectScript(): Promise<void> {
return new Promise((resolve, reject) => {

if (document.getElementById('google-identity-services')) {
resolve();
return;
    }

const script = document.createElement('script');
script.id = 'google-identity-services';
script.src = 'https://accounts.google.com/gsi/client';
script.async = true;
script.defer = true;

script.onload = () => resolve();
script.onerror = () =>
reject(new Error('Failed to load Google Identity Services script'));

document.head.appendChild(script);
  });
}

async function waitForGoogleId(timeoutMs = 5000): Promise<boolean> {
const start = Date.now();

while (Date.now() - start < timeoutMs) {
if (isGoogleSdkAvailable()) {
return true;
    }

await new Promise((r) => setTimeout(r, 50));
  }

return false;
}

export async function loadGoogleSDK(): Promise<GoogleIdentity | null> {

if (typeof window === 'undefined' || typeof document === 'undefined') {
return null;
  }

if (!isGoogleAuthConfigured()) {
return null;
  }

if (googleIdentityInstance) {
return googleIdentityInstance;
  }

if (loadPromise) {
return loadPromise;
  }

loadPromise = doLoad();
return loadPromise;
}

async function doLoad(): Promise<GoogleIdentity | null> {
try {

await injectScript();

const available = await waitForGoogleId();

if (!available) {
return null;
    }

const g = (window as Window & { google?: GoogleIdentity }).google;
if (!g?.accounts?.id) {
return null;
    }

googleIdentityInstance = g;
return googleIdentityInstance;
  } catch {
return null;
  }
}

export function __resetGoogleSDKLoader(): void {
googleIdentityInstance = null;
loadPromise = null;
}
