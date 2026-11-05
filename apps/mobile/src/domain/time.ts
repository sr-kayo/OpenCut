export const US_PER_SECOND = 1_000_000;

export function secondsToUs(seconds: number): number {
  return Math.round(seconds * US_PER_SECOND);
}

export function usToSeconds(us: number): number {
  return us / US_PER_SECOND;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function frameDurationUs(fpsNum: number, fpsDen = 1): number {
  return (fpsDen * US_PER_SECOND) / fpsNum;
}

export function snapUsToFrame(us: number, fpsNum: number, fpsDen = 1): number {
  const frameIndex = Math.round((us * fpsNum) / (fpsDen * US_PER_SECOND));
  return Math.round((frameIndex * fpsDen * US_PER_SECOND) / fpsNum);
}

export function formatTimecode(us: number, fpsNum: number, fpsDen = 1): string {
  const safeUs = Math.max(0, us);
  const totalFrames = Math.floor(
    (safeUs * fpsNum) / (fpsDen * US_PER_SECOND) + 1e-9,
  );
  const framesPerSecond = Math.round(fpsNum / fpsDen);
  const frames = totalFrames % framesPerSecond;
  const totalSeconds = Math.floor(safeUs / US_PER_SECOND);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const paddedFrames = String(frames).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}:${paddedFrames}`;
  }

  return `${paddedMinutes}:${paddedSeconds}:${paddedFrames}`;
}

export function formatShortTime(us: number): string {
  const totalSeconds = Math.floor(Math.max(0, us) / US_PER_SECOND);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes <= 0) {
    return '';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
}
