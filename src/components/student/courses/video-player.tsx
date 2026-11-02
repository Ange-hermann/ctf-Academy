"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Captions, Gauge, Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { Chapter } from "@/lib/student/queries/courses";
import { cn } from "@/lib/utils";

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

type Props = {
  src: string;
  title: string;
  captionsUrl: string | null;
  chapters: Chapter[];
  initialPosition: number;
  /** Appelé toutes les 10 s de lecture, à la pause et en quittant la page. */
  onProgress: (positionSeconds: number, percent: number) => void;
  /** Appelé une fois, à 90 % de la vidéo (la leçon est alors marquée terminée). */
  onAlmostDone: () => void;
};

/**
 * Lecteur vidéo aux couleurs de la charte : lecture/pause, vitesse 0,75 à 2×, plein écran, barre dorée avec chapitres,
 * reprise automatique, raccourcis clavier, qualité adaptative (HLS si source .m3u8). Aucune lecture automatique.
 */
export function VideoPlayer({ src, title, captionsUrl, chapters, initialPosition, onProgress, onAlmostDone }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const lastSaved = useRef(0);
  const almostDone = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [error, setError] = useState(false);
  const [resumed, setResumed] = useState(false);

  // Qualité adaptative : hls.js seulement si nécessaire (chargé à la demande).
  useEffect(() => {
    const el = video.current;
    if (!el || !src.endsWith(".m3u8") || el.canPlayType("application/vnd.apple.mpegurl")) return;
    let destroy: (() => void) | undefined;
    void import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) return setError(true);
      const hls = new Hls({ capLevelToPlayerSize: true });
      hls.loadSource(src);
      hls.attachMedia(el);
      destroy = () => hls.destroy();
    });
    return () => destroy?.();
  }, [src]);

  const report = useCallback(() => {
    const el = video.current;
    if (!el || !el.duration) return;
    lastSaved.current = el.currentTime;
    onProgress(Math.floor(el.currentTime), Math.min(100, Math.round((el.currentTime / el.duration) * 100)));
  }, [onProgress]);

  // (Dé)activation des sous-titres pilotée par l'état React (ref dédié : `video` est déjà lu par un effet).
  const captionsEl = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const track = captionsEl.current?.textTracks[0];
    if (track) track.mode = captionsOn ? "showing" : "hidden";
  }, [captionsOn]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && report();
    document.addEventListener("visibilitychange", onHide);
    const onFs = () => setFullscreen(document.fullscreenElement === wrapper.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [report]);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setError(true));
    else el.pause();
  };
  const seek = (t: number) => {
    const el = video.current;
    if (el && el.duration) el.currentTime = Math.max(0, Math.min(el.duration, t));
  };
  const changeRate = (r: number) => {
    setRate(r);
    if (video.current) video.current.playbackRate = r;
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapper.current?.requestFullscreen?.();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === "SELECT") return;
    const actions: Record<string, () => void> = {
      " ": toggle,
      k: toggle,
      ArrowLeft: () => seek(current - 5),
      ArrowRight: () => seek(current + 5),
      j: () => seek(current - 10),
      l: () => seek(current + 10),
      f: toggleFullscreen,
      m: () => setMuted((m) => !m),
    };
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  const pct = duration ? (current / duration) * 100 : 0;
  const activeChapter = [...chapters].reverse().find((c) => c.at <= current);

  return (
    <div
      ref={wrapper}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`Lecteur vidéo : ${title}. Espace pour lire ou mettre en pause, flèches pour avancer ou reculer.`}
      className={cn("group/player relative overflow-hidden rounded-3xl border border-line bg-noir", fullscreen && "rounded-none border-0")}
    >
      <video
        ref={(el) => {
          video.current = el;
          captionsEl.current = el;
        }}
        src={src.endsWith(".m3u8") ? undefined : src}
        preload="metadata"
        playsInline
        muted={muted}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          report();
        }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          setDuration(el.duration);
          if (initialPosition > 1 && initialPosition < el.duration - 2) {
            el.currentTime = initialPosition;
            setResumed(true);
          }
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setCurrent(el.currentTime);
          if (el.buffered.length) setBuffered(el.buffered.end(el.buffered.length - 1));
          if (Math.abs(el.currentTime - lastSaved.current) >= 10) report();
          if (!almostDone.current && el.duration && el.currentTime / el.duration >= 0.9) {
            almostDone.current = true;
            onAlmostDone();
          }
        }}
        onEnded={report}
        onError={() => setError(true)}
        className="aspect-video w-full bg-noir"
      >
        {captionsUrl && <track kind="captions" srcLang="fr" label="Français" src={captionsUrl} default={captionsOn} />}
      </video>

      {error && (
        <div role="alert" className="absolute inset-0 grid place-items-center bg-noir/90 p-6 text-center">
          <div>
            <p className="font-semibold text-blanc">La vidéo ne peut pas être lue pour le moment.</p>
            <p className="mt-1 text-sm text-blanc/60">Vérifiez votre connexion ; le contenu écrit de la leçon reste disponible ci-dessous.</p>
          </div>
        </div>
      )}

      {!playing && !error && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Lire la vidéo"
          className="absolute inset-0 grid place-items-center bg-noir/30 transition-opacity"
        >
          <span className="grid size-18 place-items-center rounded-full bg-gradient-or text-noir shadow-gold-lg">
            <Play className="ml-1 size-8 fill-current" />
          </span>
          {resumed && current > 1 && (
            <span className="absolute bottom-20 rounded-full bg-noir/80 px-3 py-1 text-sm text-blanc/80">Reprise à {clock(current)}</span>
          )}
        </button>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-linear-to-t from-noir/95 via-noir/60 to-transparent px-3 pt-10 pb-3 transition-opacity duration-200 sm:px-4",
          playing ? "opacity-0 group-focus-within/player:opacity-100 group-hover/player:opacity-100" : "opacity-100",
        )}
      >
        <div className="relative h-5">
          <div className="absolute inset-x-0 top-2 h-1 overflow-hidden rounded-full bg-blanc/15">
            <div className="absolute inset-y-0 left-0 w-full origin-left bg-blanc/20" style={{ transform: `scaleX(${duration ? buffered / duration : 0})` }} />
            <div className="absolute inset-y-0 left-0 w-full origin-left bg-gradient-or" style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
          {duration > 0 &&
            chapters.map((c) => (
              <span
                key={c.at}
                aria-hidden
                title={c.label}
                className="absolute top-1.5 h-2 w-0.5 rounded bg-noir"
                style={{ left: `${(c.at / duration) * 100}%` }}
              />
            ))}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Position dans la vidéo"
            aria-valuetext={`${clock(current)} sur ${clock(duration)}`}
            className="absolute inset-0 h-5 w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="mt-1 flex items-center gap-1 text-blanc sm:gap-2">
          <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Lecture"} className="grid size-11 place-items-center rounded-full hover:text-or-light">
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <button type="button" onClick={() => seek(current - 10)} aria-label="Reculer de 10 secondes" className="grid size-11 place-items-center rounded-full hover:text-or-light">
            <RotateCcw className="size-4.5" />
          </button>
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Activer le son" : "Couper le son"} className="grid size-11 place-items-center rounded-full hover:text-or-light">
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <span className="text-sm text-blanc/75 tabular">
            {clock(current)} / {clock(duration)}
          </span>
          {activeChapter && <span className="hidden truncate text-sm text-or-light sm:inline">· {activeChapter.label}</span>}
          <div className="ml-auto flex items-center gap-1">
            {captionsUrl && (
              <button
                type="button"
                onClick={() => setCaptionsOn((c) => !c)}
                aria-pressed={captionsOn}
                aria-label="Sous-titres"
                className={cn("grid size-11 place-items-center rounded-full hover:text-or-light", captionsOn && "text-or-light")}
              >
                <Captions className="size-5" />
              </button>
            )}
            <label className="flex items-center gap-1 rounded-full px-2 hover:text-or-light">
              <Gauge aria-hidden className="size-4.5" />
              <span className="sr-only">Vitesse de lecture</span>
              <select
                value={rate}
                onChange={(e) => changeRate(Number(e.target.value))}
                className="min-h-11 cursor-pointer bg-transparent text-sm focus:outline-none [&>option]:bg-noir-card"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {String(s).replace(".", ",")}×
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Quitter le plein écran" : "Plein écran"} className="grid size-11 place-items-center rounded-full hover:text-or-light">
              {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </button>
          </div>
        </div>
        {chapters.length > 0 && (
          <div className="mt-1 hidden gap-2 overflow-x-auto sm:flex">
            {chapters.map((c) => (
              <button
                key={c.at}
                type="button"
                onClick={() => seek(c.at)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-3 text-xs",
                  activeChapter?.at === c.at ? "border-or/60 text-or-light" : "border-blanc/15 text-blanc/65 hover:text-blanc",
                )}
              >
                {clock(c.at)} · {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
