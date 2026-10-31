import React, { useEffect, useRef } from "react";
import { loadouts } from "../../server/game";
import type { Settings } from "../settings";
export function ReleasePanel({
  kind,
  settings,
  onSettings,
  onClose,
  audioControls,
}: {
  kind: "tutorial" | "settings";
  settings: Settings;
  onSettings: (s: Settings) => void;
  onClose: () => void;
  audioControls?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = [
          ...ref.current!.querySelectorAll<HTMLElement>("button,input,select"),
        ];
        const first = nodes[0],
          last = nodes.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="release-panel"
        role="dialog"
        aria-modal="true"
        aria-label={
          kind === "tutorial" ? "How to play Pixel Rift" : "Player settings"
        }
        tabIndex={-1}
        ref={ref}
      >
        <button
          className="panel-close"
          aria-label="Close panel"
          onClick={onClose}
        >
          ×
        </button>
        <span className="eyebrow">PIXEL RIFT / FIELD GUIDE</span>
        <h2>{kind === "tutorial" ? "Your first rift." : "Make it yours."}</h2>
        {kind === "tutorial" ? (
          <>
            <div className="onboarding-steps">
              <article>
                <b>01</b>
                <h3>Find your squad</h3>
                <p>
                  Quick Play finds a public lobby in your mode. Private Room
                  gives friends a code. For solo practice, create a private room
                  and fill it with bots.
                </p>
              </article>
              <article>
                <b>02</b>
                <h3>Move. Aim. Survive.</h3>
                <p>
                  WASD/arrows move; mouse aims; hold click fires. Space dashes,
                  E shields and reflects bolts. Phones use MOVE and AIM + FIRE
                  sticks. Drag the right stick to aim and shoot, release to
                  stop; the three buttons trigger dash, shield and special.
                </p>
              </article>
              <article>
                <b>03</b>
                <h3>Play the objective</h3>
                <p>
                  Collect crystals, chase KOs, or control the center. Watch the
                  mode rules above the arena. Pickups grant health, speed or
                  double damage. Q uses your special.
                </p>
              </article>
            </div>
            <div className="kit-guide">
              {Object.values(loadouts).map((k) => (
                <div key={k.name}>
                  <b>
                    {k.glyph} {k.name}
                  </b>
                  <small>{k.description}</small>
                </div>
              ))}
            </div>
            <p className="quiet">
              Hold Tab or tap SCORES for stats. During respawn, your view
              follows an ally. Overtime shrinks the safe area. Quick Play
              requires two humans; private practice can start with one human
              plus bots.
            </p>
            <button className="primary large" onClick={onClose}>
              I’M READY →
            </button>
          </>
        ) : (
          <div className="settings-fields">
            {audioControls}
            <label>
              MASTER VOLUME <b>{Math.round(settings.volume * 100)}%</b>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.volume * 100}
                onChange={(e) =>
                  onSettings({
                    ...settings,
                    volume: Number(e.target.value) / 100,
                  })
                }
              />
            </label>
            <label className="check-setting">
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) =>
                  onSettings({ ...settings, reducedMotion: e.target.checked })
                }
              />{" "}
              REDUCE MOTION & CAMERA SHAKE
            </label>
            <label className="check-setting">
              <input
                type="checkbox"
                checked={settings.particles}
                onChange={(e) =>
                  onSettings({ ...settings, particles: e.target.checked })
                }
              />{" "}
              COMBAT PARTICLES
            </label>
            <p className="quiet">
              An ongoing multiplayer match continues while this panel is open.
              Settings and personal stats stay in this browser. System
              reduced-motion preferences are always respected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
