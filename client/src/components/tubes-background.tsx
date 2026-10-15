import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TubesApp = {
  tubes?: {
    setColors?: (colors: string[]) => void;
    setLightsColors?: (colors: string[]) => void;
  };
  destroy?: () => void;
};

type TubesBackgroundProps = {
  children?: ReactNode;
  className?: string;
  enableClickInteraction?: boolean;
};

const TUBES_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js";

const helixPalettes = [
  {
    tubes: ["#8b5cf6", "#06b6d4", "#a78bfa"],
    lights: ["#8b5cf6", "#22d3ee", "#10b981", "#c4b5fd"],
  },
  {
    tubes: ["#7c3aed", "#22d3ee", "#34d399"],
    lights: ["#a78bfa", "#06b6d4", "#6ee7b7", "#ffffff"],
  },
  {
    tubes: ["#c084fc", "#0891b2", "#6366f1"],
    lights: ["#8b5cf6", "#67e8f9", "#10b981", "#818cf8"],
  },
];

export function TubesBackground({
  children,
  className,
  enableClickInteraction = true,
}: TubesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<TubesApp | null>(null);
  const paletteIndexRef = useRef(0);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    let mounted = true;
    const canvas = canvasRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canvas || reduceMotion) {
      setStatus("fallback");
      return;
    }

    const initialize = async () => {
      try {
        const module = await import(/* @vite-ignore */ TUBES_MODULE_URL);
        if (!mounted || !canvas) return;
        const createTubes = module.default;
        appRef.current = createTubes(canvas, {
          tubes: {
            colors: helixPalettes[0].tubes,
            lights: {
              intensity: 180,
              colors: helixPalettes[0].lights,
            },
          },
        });
        setStatus("ready");
      } catch (error) {
        console.warn("Helix 3D background unavailable; using ambient fallback.", error);
        if (mounted) setStatus("fallback");
      }
    };

    void initialize();
    return () => {
      mounted = false;
      appRef.current?.destroy?.();
      appRef.current = null;
    };
  }, []);

  const shiftPalette = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a, button, input, textarea")) return;
    if (!enableClickInteraction || !appRef.current?.tubes) return;
    paletteIndexRef.current = (paletteIndexRef.current + 1) % helixPalettes.length;
    const palette = helixPalettes[paletteIndexRef.current];
    appRef.current.tubes.setColors?.(palette.tubes);
    appRef.current.tubes.setLightsColors?.(palette.lights);
  };

  return (
    <div
      className={cn("helix-tubes-root", status === "ready" && "is-ready", className)}
      onClick={shiftPalette}
    >
      <canvas ref={canvasRef} className="helix-tubes-canvas" aria-hidden="true" />
      <div className="helix-tubes-scrim" aria-hidden="true" />
      <div className="helix-tubes-content">{children}</div>
    </div>
  );
}

export default TubesBackground;
