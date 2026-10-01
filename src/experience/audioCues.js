/** Audio remains opt-in and silent until licensed assets are provided. */
export const AUDIO_CUES = Object.freeze([
  'ambient-space',
  'earth-atmosphere',
  'soft-transition',
  'signal-ping',
  'solar-event',
  'deep-space',
]);

export function createAudioCueBus() {
  let enabled = false;
  return Object.freeze({
    enableFromUserGesture() { enabled = true; },
    disable() { enabled = false; },
    trigger(cueName) {
      if (!enabled || !AUDIO_CUES.includes(cueName)) return false;
      // Cue playback is intentionally a no-op until a legitimate asset is supplied.
      return false;
    },
  });
}
