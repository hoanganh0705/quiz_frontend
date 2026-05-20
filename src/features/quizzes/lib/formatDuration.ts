/**
 * Formats a duration in minutes to an appropriate time format
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */

export function formatDuration(minutes: number): string {
  // Handle invalid input
  if (minutes < 0 || !Number.isFinite(minutes)) {
    return 'Invalid duration';
  }
  
  // Handle zero minutes
  if (minutes === 0) {
    return '0 minutes';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  // Case 1: Less than 1 hour
  if (hours === 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  
  // Case 2: Exact hours (no remaining minutes)
  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  
  // Case 3: Hours and minutes
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`;
}
