import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  Hand,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  X,
  Keyboard,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { SceneCanvas } from '../../three/AircraftScene';
import { AircraftModel } from '../../three/AircraftModel';
import { AircraftControls, VIEW_PRESETS, type AircraftControlsHandle, type ViewPreset } from '../../three/AircraftControls';
import { SceneLighting } from '../../three/SceneLighting';
import { SkyDome } from '../../three/SkyDome';
import { CloudDeck } from '../../three/CloudEnvironment';
import { PALETTE } from '../../three/environmentConfig';
import { SceneLoader } from '../ui/SceneLoader';
import { useQuality } from '../../hooks/useQuality';
import { StaticAircraft } from '../fallback/StaticAircraft';
import type { FleetAircraft } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  aircraft?: FleetAircraft;
}

const presetOrder: ViewPreset[] = ['hero', 'front', 'side', 'top', 'wing', 'engine', 'tail'];

/**
 * Dedicated, full-screen interactive aircraft experience.
 * Mouse/touch via OrbitControls; keyboard via arrow keys, +/-, R, G, Space; buttons for everything.
 */
export default function AircraftViewer({ open, onClose, aircraft }: Props) {
  const quality = useQuality();
  const controls = useRef<AircraftControlsHandle>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const [gearDown, setGearDown] = useState(false);
  const [autoRotate, setAutoRotate] = useState(!quality.reducedMotion);
  const [active, setActive] = useState<ViewPreset>('hero');
  const [hintVisible, setHintVisible] = useState(true);

  const toggleAuto = useCallback(() => {
    setAutoRotate((v) => {
      controls.current?.setAutoRotate(!v);
      return !v;
    });
  }, []);

  const onInteract = useCallback(() => {
    setHintVisible(false);
    setAutoRotate(false);
    controls.current?.setAutoRotate(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      const c = controls.current;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Simple focus trap
      if (e.key === 'Tab' && dialog.current) {
        const f = dialog.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
        return;
      }
      if (!c) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const handled = (fn: () => void) => {
        e.preventDefault();
        onInteract();
        fn();
      };
      switch (e.key) {
        case 'ArrowLeft':
          handled(() => c.rotate(-0.4));
          break;
        case 'ArrowRight':
          handled(() => c.rotate(0.4));
          break;
        case 'ArrowUp':
          handled(() => c.tilt(-0.2));
          break;
        case 'ArrowDown':
          handled(() => c.tilt(0.2));
          break;
        case '+':
        case '=':
          handled(() => c.zoom(0.8));
          break;
        case '-':
        case '_':
          handled(() => c.zoom(1.25));
          break;
        case 'r':
        case 'R':
          handled(() => {
            c.reset();
            setActive('hero');
          });
          break;
        case 'g':
        case 'G':
          handled(() => setGearDown((v) => !v));
          break;
        default:
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open, onClose, onInteract]);

  if (!open) return null;

  const title = aircraft?.name ?? 'Aeronix AX-950 Horizon';

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewer-title"
      className="fixed inset-0 z-[80] bg-navy-950"
    >
      <SceneCanvas
        label={`Interactive 3D model of the ${title}. Use the on-screen controls or arrow keys to rotate and plus or minus to zoom.`}
        camera={{ fov: 36, near: 0.1, far: 4000, position: VIEW_PRESETS.hero.cam }}
        fallback={<StaticAircraft className="h-full w-full" />}
      >
        <color attach="background" args={[PALETTE.zenith]} />
        <fog attach="fog" args={[PALETTE.horizon, 60, 320]} />
        <SkyDome />
        <CloudDeck y={-9} animated={!quality.reducedMotion} />
        <SceneLighting environment intensity={1.05} />
        <Suspense fallback={null}>
          <AircraftModel
            gearDown={gearDown}
            detail={quality.tier}
            animated={!quality.reducedMotion}
            engines={aircraft?.profile.engines ?? 2}
          />
        </Suspense>
        <AircraftControls ref={controls} reducedMotion={quality.reducedMotion} onInteract={onInteract} />
      </SceneCanvas>
      <SceneLoader label="Preparing aircraft" />

      {/* legibility gradients over the 3D view */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-navy-950/85 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-navy-950/80 to-transparent" aria-hidden="true" />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 md:p-8">
        <div className="pointer-events-auto max-w-md">
          <p className="eyebrow">Interactive aircraft</p>
          <h2 id="viewer-title" className="display mt-3 text-3xl md:text-5xl">
            {title}
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-silver">
            Real-time procedural 3D model in the AERONIX livery. Fictional aircraft — specifications are demonstration data.
            {aircraft && aircraft.id !== 'ax-950'
              ? ' Shown using the shared AERONIX wide-body model as a representative placeholder.'
              : null}
          </p>
        </div>
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          className="pointer-events-auto inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-silver/30 bg-navy-950/60 text-cloud backdrop-blur transition hover:border-cloud"
          aria-label="Close aircraft viewer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Interaction hint */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-24 transition-opacity duration-700 ${
          hintVisible ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden={!hintVisible}
      >
        <div className="glass flex items-center gap-3 rounded-full px-5 py-3 text-xs text-silver">
          <Hand size={16} className="text-gold" aria-hidden="true" />
          <span className="hidden sm:inline">Drag to rotate · Scroll to zoom</span>
          <span className="sm:hidden">Drag to rotate · Pinch to zoom</span>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:justify-center md:px-0" role="group" aria-label="Camera views">
            {presetOrder.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onInteract();
                  setActive(p);
                  controls.current?.setView(p);
                }}
                aria-pressed={active === p}
                className={`shrink-0 rounded-full border px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.2em] transition ${
                  active === p ? 'border-gold bg-gold text-navy-950' : 'border-silver/25 bg-navy-950/60 text-silver backdrop-blur hover:border-silver/60 hover:text-cloud'
                }`}
              >
                {VIEW_PRESETS[p].label}
              </button>
            ))}
          </div>
          <div className="glass mx-auto flex flex-wrap items-center justify-center gap-1 rounded-2xl p-1.5">
            <IconButton label="Rotate left" onClick={() => (onInteract(), controls.current?.rotate(-0.5))}>
              <RotateCcw size={17} />
            </IconButton>
            <IconButton label="Rotate right" onClick={() => (onInteract(), controls.current?.rotate(0.5))}>
              <RotateCw size={17} />
            </IconButton>
            <IconButton label="Tilt up" onClick={() => (onInteract(), controls.current?.tilt(-0.2))}>
              <ChevronUp size={17} />
            </IconButton>
            <IconButton label="Tilt down" onClick={() => (onInteract(), controls.current?.tilt(0.2))}>
              <ChevronDown size={17} />
            </IconButton>
            <IconButton label="Zoom in" onClick={() => (onInteract(), controls.current?.zoom(0.8))}>
              <Plus size={17} />
            </IconButton>
            <IconButton label="Zoom out" onClick={() => (onInteract(), controls.current?.zoom(1.25))}>
              <Minus size={17} />
            </IconButton>
            <span className="mx-1 h-6 w-px bg-silver/20" aria-hidden="true" />
            <IconButton label={autoRotate ? 'Pause auto-rotate' : 'Start auto-rotate'} onClick={toggleAuto} pressed={autoRotate}>
              {autoRotate ? <Pause size={17} /> : <Play size={17} />}
            </IconButton>
            <button
              type="button"
              onClick={() => setGearDown((v) => !v)}
              aria-pressed={gearDown}
              className="rounded-xl px-3 py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-silver transition hover:bg-cloud/10 hover:text-cloud aria-pressed:text-gold"
            >
              Gear {gearDown ? 'down' : 'up'}
            </button>
            <button
              type="button"
              onClick={() => {
                onInteract();
                controls.current?.reset();
                setActive('hero');
              }}
              className="rounded-xl px-3 py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cloud transition hover:bg-cloud/10"
            >
              Reset view
            </button>
          </div>
          <p className="hidden items-center justify-center gap-2 text-[0.65rem] text-muted md:flex">
            <Keyboard size={13} aria-hidden="true" /> Arrow keys rotate &amp; tilt · + / − zoom · R reset · G landing gear · Esc close
          </p>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-silver transition hover:bg-cloud/10 hover:text-cloud aria-pressed:text-gold"
    >
      {children}
    </button>
  );
}
