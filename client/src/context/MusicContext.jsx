import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api, { mediaUrl } from '../utils/api.js';

const MusicContext = createContext(null);

export function MusicProvider({ children }) {
  const audioRef = useRef(null);
  if (audioRef.current === null && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
  }

  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const v = parseFloat(localStorage.getItem('ciao_volume'));
    return isNaN(v) ? 0.8 : v;
  });
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // off | all | one
  const [error, setError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);

  const current = index >= 0 ? queue[index] || null : null;

  // always-fresh copy of state for audio event handlers
  const live = useRef({});
  live.current = { queue, index, shuffle, repeat };
  const history = useRef([]);
  const countedFor = useRef(null);

  const loadAndPlay = useCallback((song) => {
    const audio = audioRef.current;
    if (!audio || !song) return;
    setError('');
    setCurrentTime(0);
    setDuration(song.duration || 0);
    audio.src = mediaUrl(song.url);
    audio.load();
    const p = audio.play();
    if (p?.catch) {
      p.catch((e) => {
        if (e.name !== 'AbortError') setError('Could not play this song');
        setPlaying(false);
      });
    }
  }, []);

  const pickNext = useCallback((dir = 1) => {
    const { queue: q, index: i, shuffle: sh } = live.current;
    if (!q.length) return -1;
    if (sh && q.length > 1) {
      if (dir < 0 && history.current.length) return history.current.pop();
      let n;
      do n = Math.floor(Math.random() * q.length);
      while (n === i);
      return n;
    }
    return (i + dir + q.length) % q.length;
  }, []);

  const goTo = useCallback(
    (i, pushHistory = true) => {
      const { queue: q, index: cur } = live.current;
      if (i < 0 || i >= q.length) return;
      if (pushHistory && cur >= 0 && cur !== i) history.current.push(cur);
      setIndex(i);
      loadAndPlay(q[i]);
    },
    [loadAndPlay]
  );

  // ---- public controls ----
  const playSong = useCallback(
    (song, list) => {
      const audio = audioRef.current;
      const base = list && list.length ? list : [song];
      const i = Math.max(0, base.findIndex((s) => s._id === song._id));
      // clicking the song that is already loaded just toggles play/pause
      if (live.current.queue[live.current.index]?._id === song._id && audio?.src) {
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
        return;
      }
      history.current = [];
      setQueue(base);
      live.current = { ...live.current, queue: base, index: i };
      setIndex(i);
      loadAndPlay(base[i]);
    },
    [loadAndPlay]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const next = useCallback(() => {
    const n = pickNext(1);
    if (n >= 0) goTo(n);
  }, [pickNext, goTo]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const n = pickNext(-1);
    if (n >= 0) goTo(n, false);
  }, [pickNext, goTo]);

  const seek = useCallback((t) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(t)) return;
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  const setVolume = useCallback((v) => {
    const vol = Math.min(1, Math.max(0, v));
    setVolumeState(vol);
    setMuted(false);
    localStorage.setItem('ciao_volume', String(vol));
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')), []);

  const addToQueue = useCallback((song) => {
    const { queue: q, index: i } = live.current;
    if (q.some((s) => s._id === song._id)) return false;
    const nq = [...q, song];
    live.current = { ...live.current, queue: nq };
    setQueue(nq);
    if (i < 0) {
      live.current = { ...live.current, index: 0 };
      setIndex(0);
      loadAndPlay(nq[0]);
    }
    return true;
  }, [loadAndPlay]);

  const playNext = useCallback((song) => {
    const { queue: q, index: i } = live.current;
    if (i < 0) return addToQueue(song);
    const without = q.filter((s) => s._id !== song._id);
    const curId = q[i]?._id;
    const ci = without.findIndex((s) => s._id === curId);
    const nq = [...without.slice(0, ci + 1), song, ...without.slice(ci + 1)];
    live.current = { ...live.current, queue: nq, index: ci };
    setQueue(nq);
    setIndex(ci);
    return true;
  }, [addToQueue]);

  const removeFromQueue = useCallback(
    (i) => {
      const { queue: q, index: cur } = live.current;
      if (i === cur) {
        // removing the song that is playing → move on
        const nq = q.filter((_, k) => k !== i);
        const audio = audioRef.current;
        if (!nq.length) {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
          live.current = { ...live.current, queue: [], index: -1 };
          setQueue([]);
          setIndex(-1);
          setPlaying(false);
          return;
        }
        const ni = Math.min(i, nq.length - 1);
        live.current = { ...live.current, queue: nq, index: ni };
        setQueue(nq);
        setIndex(ni);
        loadAndPlay(nq[ni]);
        return;
      }
      const nq = q.filter((_, k) => k !== i);
      const ni = i < cur ? cur - 1 : cur;
      live.current = { ...live.current, queue: nq, index: ni };
      setQueue(nq);
      setIndex(ni);
    },
    [loadAndPlay]
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    audio?.removeAttribute('src');
    audio?.load();
    history.current = [];
    live.current = { ...live.current, queue: [], index: -1 };
    setQueue([]);
    setIndex(-1);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPanelOpen(false);
  }, []);

  // keep songs in the queue in sync when one gets deleted elsewhere
  const dropSong = useCallback(
    (id) => {
      const { queue: q } = live.current;
      const i = q.findIndex((s) => s._id === id);
      if (i >= 0) removeFromQueue(i);
    },
    [removeFromQueue]
  );

  // ---- wire the <audio> element once ----
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      setPlaying(true);
      const song = live.current.queue[live.current.index];
      if (song && countedFor.current !== song._id + audio.src) {
        countedFor.current = song._id + audio.src;
        api.post(`/songs/${song._id}/play`).catch(() => {});
      }
    };
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => isFinite(audio.duration) && setDuration(audio.duration);
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);
    const onErr = () => {
      if (!audio.getAttribute('src')) return;
      setError('Could not load this song');
      setPlaying(false);
      setBuffering(false);
    };
    const onEnded = () => {
      const { repeat: rep, queue: q, index: i } = live.current;
      if (rep === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      const atEnd = i >= q.length - 1 && !live.current.shuffle;
      if (atEnd && rep === 'off') {
        setPlaying(false);
        setCurrentTime(0);
        return;
      }
      const n = pickNext(1);
      if (n >= 0) goTo(n);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onErr);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onErr);
      audio.removeEventListener('ended', onEnded);
    };
  }, [pickNext, goTo]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // lock-screen / headset controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (current) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: 'Ciao',
        artwork: current.cover ? [{ src: mediaUrl(current.cover) }] : [],
      });
    }
    const set = (a, fn) => {
      try {
        navigator.mediaSession.setActionHandler(a, fn);
      } catch {
        /* unsupported action */
      }
    };
    set('play', toggle);
    set('pause', toggle);
    set('previoustrack', prev);
    set('nexttrack', next);
  }, [current, toggle, prev, next]);

  const value = {
    queue, index, current, playing, buffering, currentTime, duration, volume, muted, shuffle, repeat, error,
    panelOpen, setPanelOpen,
    playSong, toggle, next, prev, seek, setVolume, toggleMute, toggleShuffle, cycleRepeat,
    addToQueue, playNext, removeFromQueue, stop, dropSong,
  };
  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export const useMusic = () => useContext(MusicContext);
