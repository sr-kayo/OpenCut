import {
  formatBytes,
  formatTimecode,
  snapUsToFrame,
  secondsToUs,
  usToSeconds,
} from '@/domain/time';

describe('time helpers', () => {
  it('converts seconds and microseconds', () => {
    expect(secondsToUs(1.5)).toBe(1_500_000);
    expect(usToSeconds(2_000_000)).toBe(2);
  });

  it('formats timecode at 30 fps', () => {
    expect(formatTimecode(0, 30)).toBe('00:00:00');
    expect(formatTimecode(1_000_000, 30)).toBe('00:01:00');
    expect(formatTimecode(1_500_000, 30)).toBe('00:01:15');
    expect(formatTimecode(61_000_000, 30)).toBe('01:01:00');
  });

  it('snaps to frame boundaries', () => {
    expect(snapUsToFrame(16_000, 30)).toBe(0);
    expect(snapUsToFrame(20_000, 30)).toBe(33_333);
  });

  it('formats bytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB');
  });
});
