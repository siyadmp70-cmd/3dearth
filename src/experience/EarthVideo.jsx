import React, { useEffect, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (a, b, value) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** One video element, one rAF controller. Continuous playback is preferred;
 * large jumps use a sparse single-seek recovery instead of frame-by-frame seeking. */
export default function EarthVideo({ progressRef, scrollingRef, pointerRef, orbitModeRef, timeDilationRef, reduced, onReady }) {
  const videoRef = useRef(null);
  const shellRef = useRef(null);
  const readyHandlerRef = useRef(onReady);
  const failedRef = useRef(false);
  const userPausedRef = useRef(false);
  const stateRef = useRef({ buffering: false, seeking: false, state: 'loading', velocity: 0, progress: 0, mode: 'cinematic' });
  const needsGestureRef = useRef(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  needsGestureRef.current = needsGesture;
  const [failed, setFailed] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [fps, setFps] = useState(0);
  const debug = import.meta.env.DEV && new URLSearchParams(window.location.search).get('debug') === '1';
  readyHandlerRef.current = onReady;

  useEffect(() => {
    const video = videoRef.current;
    const shell = shellRef.current;
    let raf = 0;
    let disposed = false;
    let playPending = false;
    let lastAt = performance.now();
    let smoothProgress = progressRef.current;
    let targetProgress = smoothProgress;
    let timelineProgress = smoothProgress;
    let velocity = 0;
    let momentum = 0;
    let warp = 0;
    let flare = 0;
    let lastScrollY = window.scrollY;
    let lastSignificantSeek = 0;
    let seekSettleTimer;
    let frameCount = 0;
    let lastQualityFrames = 0;
    let fpsAt = lastAt;
    let frameCallbackId = 0;
    let latestVideoFrameAt = 0;
    let lastDebugAt = 0;
    let currentState = 'loading';
    const hasVideoFrameCallback = typeof video.requestVideoFrameCallback === 'function';

    const setState = state => {
      currentState = state;
      stateRef.current.state = state;
    };
    const reveal = () => readyHandlerRef.current?.();
    const attemptPlay = () => {
      if (disposed || playPending || video.ended || failedRef.current || userPausedRef.current) return;
      playPending = true;
      video.play().then(() => {
        if (!disposed) { needsGestureRef.current = false; setNeedsGesture(false); }
      }).catch(() => {
        if (!disposed) setNeedsGesture(true);
      }).finally(() => { playPending = false; });
    };
    const onFrame = (now, metadata) => {
      latestVideoFrameAt = now;
      frameCount++;
      stateRef.current.mediaTime = metadata.mediaTime;
      stateRef.current.presentedFrames = metadata.presentedFrames;
      if (!disposed) frameCallbackId = video.requestVideoFrameCallback(onFrame);
    };
    const onMetadata = () => {
      stateRef.current.duration = video.duration;
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      // Start at the real first frame; don't issue an initial seek.
      targetProgress = smoothProgress;
      reveal();
      attemptPlay();
    };
    const onCanPlay = () => { stateRef.current.buffering = false; setBuffering(false); setState('playing'); reveal(); attemptPlay(); };
    const onPlaying = () => { stateRef.current.buffering = false; setBuffering(false); setState('playing'); reveal(); };
    const onWaiting = () => { stateRef.current.buffering = true; setBuffering(true); setState('buffering'); };
    const onStalled = () => { stateRef.current.buffering = true; setBuffering(true); setState('buffering'); };
    const onSeeking = () => { stateRef.current.seeking = true; setState('seeking'); };
    const onSeeked = () => { stateRef.current.seeking = false; if (!stateRef.current.buffering) setState(video.paused ? 'paused' : 'playing'); };
    const onError = () => {
      failedRef.current = true;
      setFailed(true);
      setState('error');
      reveal();
    };
    const onPause = () => { if (!video.ended && !userPausedRef.current && !scrollingRef.current.active) setState('paused'); };
    const onScroll = () => {
      const now = performance.now();
      const dy = window.scrollY - lastScrollY;
      const elapsed = Math.max(.008, (now - lastAt) / 1000);
      lastScrollY = window.scrollY;
      const signedVelocity = clamp(dy / elapsed / Math.max(500, innerHeight * 1.3), -2.6, 2.6);
      const previousVelocity = stateRef.current.velocity || 0;
      stateRef.current.velocity = signedVelocity;
      if (!reduced && Math.abs(signedVelocity) > 1.35 && Math.abs(previousVelocity) < 1.15) warp = Math.max(warp, 1);
      // Detect a genuine multi-chapter jump, while avoiding a seek for ordinary scroll.
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const jumpProgress = dy / maxScroll;
      if (Math.abs(jumpProgress) > .105 && Number.isFinite(video.duration) && video.duration > 0) {
        targetProgress = clamp(window.scrollY / maxScroll, 0, 1);
        stateRef.current.mode = 'precision';
        const desiredTime = clamp(targetProgress * video.duration, 0, Math.max(0, video.duration - .06));
        if (Math.abs(desiredTime - video.currentTime) > 1.35 && !video.seeking && now - lastSignificantSeek > 650) {
          video.currentTime = desiredTime;
          lastSignificantSeek = now;
        }
        clearTimeout(seekSettleTimer);
        seekSettleTimer = setTimeout(() => {
          stateRef.current.mode = 'cinematic';
          targetProgress = progressRef.current;
        }, 550);
      } else {
        targetProgress = progressRef.current;
        stateRef.current.mode = 'cinematic';
      }
      if (!video.paused && !video.seeking) {
        // Preserve forward motion and let scroll velocity shape the rate.
        video.playbackRate = reduced ? 1 : clamp(1 + Math.abs(signedVelocity) * .42, .7, 2.2);
      }
    };

    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('stalled', onStalled);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.addEventListener('pause', onPause);
    window.addEventListener('scroll', onScroll, { passive: true });
    if (hasVideoFrameCallback) frameCallbackId = video.requestVideoFrameCallback(onFrame);
    if (video.readyState >= 1) onMetadata();

    const animate = now => {
      if (disposed) return;
      const dt = clamp((now - lastAt) / 1000, .001, .05);
      lastAt = now;
      const rawProgress = progressRef.current;
      targetProgress += (rawProgress - targetProgress) * (1 - Math.exp(-dt * (reduced ? 4.2 : 2.5)));
      smoothProgress += (targetProgress - smoothProgress) * (1 - Math.exp(-dt * (reduced ? 5 : 2.8)));
      // Small inertia gives the composition a soft settle after the user stops.
      const measuredVelocity = scrollingRef.current.active ? stateRef.current.velocity || 0 : 0;
      momentum += ((reduced ? 0 : measuredVelocity * .0018) - momentum) * (1 - Math.exp(-dt * 2.2));
      timelineProgress = clamp(smoothProgress + momentum, 0, 1);
      velocity += ((stateRef.current.velocity || 0) - velocity) * (1 - Math.exp(-dt * (reduced ? 7 : 4.8)));
      stateRef.current.velocity = velocity;
      stateRef.current.progress = timelineProgress;
      stateRef.current.currentTime = video.currentTime;
      stateRef.current.duration = video.duration;
      stateRef.current.playbackRate = video.playbackRate;
      stateRef.current.buffered = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0;

      const closeMoment = Math.exp(-Math.pow((timelineProgress - .49) / .19, 2));
      const departure = smoothstep(.74, .99, timelineProgress);
      const intro = smoothstep(0, .14, timelineProgress);
      const mobile = innerWidth < 700;
      const speed = reduced ? 0 : Math.min(1, Math.abs(velocity) / 1.65);
      const breathe = reduced ? 0 : Math.sin(now * .00052) * .002;
      const scale = (mobile ? 1.28 : 1) * (.91 + intro * .09 + closeMoment * .19 - departure * .43 + breathe + speed * .014);
      const pointer = reduced ? { x: 0, y: 0 } : pointerRef.current;
      const driftX = Math.sin(timelineProgress * Math.PI * 1.7) * (mobile ? 7 : 18) + pointer.x * (mobile ? 0 : 15) + (mobile ? 0 : velocity * 2.2);
      const driftY = Math.sin(timelineProgress * Math.PI * 1.25) * (mobile ? 3 : 8) + pointer.y * (mobile ? 0 : 9);
      const opacity = (.38 + intro * .62) * (1 - departure * .28);
      shell.style.transform = `translate3d(${driftX}px, ${driftY}px, 0) scale(${scale * (orbitModeRef.current ? 1.035 : 1)})`;
      shell.style.opacity = `${opacity}`;
      shell.style.filter = `blur(${(1 - intro) * (reduced ? .15 : .5)}px)`;

      const focus = smoothstep(.08, .35, timelineProgress) * (1 - smoothstep(.78, .98, timelineProgress));
      document.documentElement.style.setProperty('--orbit-velocity', `${speed}`);
      document.documentElement.style.setProperty('--earth-focus', `${focus}`);
      document.documentElement.style.setProperty('--warp-intensity', `${warp}`);
      document.documentElement.style.setProperty('--solar-flare', `${flare}`);
      document.documentElement.style.setProperty('--eclipse-intensity', `${Math.exp(-Math.pow((timelineProgress - .735) / .026, 2))}`);
      document.documentElement.style.setProperty('--lens-reflection', `${Math.exp(-Math.pow((timelineProgress - .42) / .07, 2)) * Math.min(1, Math.abs(velocity) + .16)}`);
      document.documentElement.style.setProperty('--atmosphere-warmth', `${Math.exp(-Math.pow((timelineProgress - .43) / .11, 2))}`);
      document.documentElement.style.setProperty('--blue-hour', `${Math.exp(-Math.pow((timelineProgress - .56) / .15, 2))}`);
      // One restrained sunlight event around the terminator chapter; reversing scroll reverses it.
      flare += ((Math.exp(-Math.pow((timelineProgress - .43) / .025, 2)) * (scrollingRef.current.active ? .72 : .38)) - flare) * (1 - Math.exp(-dt * 1.4));
      warp *= Math.exp(-dt * (reduced ? 12 : 3.9));

      if (Number.isFinite(video.duration) && video.duration > 0 && !failedRef.current) {
        // No pause during normal scroll: maintain continuous decode and change playback rate only.
        const timeScale = timeDilationRef.current ? .48 : 1;
        const desiredRate = (scrollingRef.current.active && !reduced ? clamp(1 + Math.abs(velocity) * .42, .7, 2.2) : 1) * timeScale;
        if (!video.seeking && Math.abs(video.playbackRate - desiredRate) > .08) video.playbackRate = desiredRate;
        if (video.ended) {
          // The source's endpoints don't form a loop. Return to its start once, then resume.
          video.currentTime = 0;
          attemptPlay();
        } else if (video.paused && !video.ended && !needsGestureRef.current && !userPausedRef.current) attemptPlay();
      }

      if (now - fpsAt >= 500) {
        if (!hasVideoFrameCallback) {
          const quality = video.getVideoPlaybackQuality?.();
          const totalFrames = quality?.totalVideoFrames;
          if (Number.isFinite(totalFrames)) {
            frameCount = totalFrames - lastQualityFrames;
            lastQualityFrames = totalFrames;
          }
        }
        if (debug) setFps(Math.round(frameCount * 1000 / (now - fpsAt)));
        frameCount = 0;
        fpsAt = now;
      }
      if (debug && now - lastDebugAt > 100) {
        stateRef.current.videoFrameAge = latestVideoFrameAt ? Math.round(now - latestVideoFrameAt) : null;
        stateRef.current.scrollY = window.scrollY;
        stateRef.current.direction = Math.sign(velocity);
        window.__ELSEWHERE_DEBUG__ = stateRef.current;
        lastDebugAt = now;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(seekSettleTimer);
      if (hasVideoFrameCallback && frameCallbackId) video.cancelVideoFrameCallback(frameCallbackId);
      window.removeEventListener('scroll', onScroll);
      video.pause();
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('stalled', onStalled);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.removeEventListener('pause', onPause);
      delete window.__ELSEWHERE_DEBUG__;
      ['--orbit-velocity', '--earth-focus', '--warp-intensity', '--solar-flare', '--eclipse-intensity', '--lens-reflection', '--atmosphere-warmth', '--blue-hour'].forEach(key => document.documentElement.style.removeProperty(key));
    };
  }, [debug, pointerRef, progressRef, reduced, scrollingRef]);

  return <>
    <div className="earth-video-shell" ref={shellRef} aria-hidden="true">
      <video
        ref={videoRef}
        className="earth-video"
        src={`${import.meta.env.BASE_URL}videos/global-earth.mp4`}
        autoPlay muted playsInline preload="auto" disablePictureInPicture
        aria-label="A cinematic view of Earth from orbit"
        onPlay={() => { userPausedRef.current = false; }}
        onPause={() => { if (!videoRef.current?.ended && !scrollingRef.current?.active) userPausedRef.current = true; }}
      />
    </div>
    {debug && <aside className="video-debug" aria-label="Video diagnostics">
      <b>CINEMATIC VIDEO ENGINE</b>
      <span>VIDEO FPS&nbsp; {fps}</span><span>VIDEO CURRENT TIME&nbsp; {stateRef.current.currentTime?.toFixed(2) ?? '—'}s</span>
      <span>VIDEO DURATION&nbsp; {stateRef.current.duration?.toFixed(2) ?? '—'}s</span><span>BUFFERED RANGE&nbsp; {stateRef.current.buffered?.toFixed(2) ?? '—'}s</span>
      <span>VIDEO STATE&nbsp; {stateRef.current.state}</span><span>SCROLL VELOCITY&nbsp; {stateRef.current.velocity?.toFixed(2) ?? '0.00'}</span>
      <span>CINEMATIC PROGRESS&nbsp; {((stateRef.current.progress || 0) * 100).toFixed(1)}%</span><span>CURRENT CHAPTER&nbsp; {Math.min(8, Math.floor((stateRef.current.progress || 0) * 8) + 1)}</span>
      <span>PLAYBACK RATE&nbsp; {stateRef.current.playbackRate?.toFixed(2) ?? '1.00'}x</span><span>VIDEO FRAME AGE&nbsp; {stateRef.current.videoFrameAge ?? 'fallback'}</span>
    </aside>}
    {buffering && <span className="sr-only" role="status">Resuming the Earth film</span>}
    {needsGesture && !failed && <button className="video-entry" onClick={() => { userPausedRef.current = false; videoRef.current?.play().then(() => setNeedsGesture(false)).catch(() => setNeedsGesture(true)); }}>ENTER EXPERIENCE <span>↗</span></button>}
    {failed && <p className="video-error" role="status">The Earth film could not be loaded.</p>}
  </>;
}
