

export function formatDuration(minutes: number): string {

if (minutes < 0 || !Number.isFinite(minutes)) {
return 'Invalid duration';
  }

if (minutes === 0) {
return '0 minutes';
  }

const hours = Math.floor(minutes / 60);
const remainingMinutes = minutes % 60;

if (hours === 0) {
return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }

if (remainingMinutes === 0) {
return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`;
}
