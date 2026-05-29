// ABOUTME: Renders an archived page's thumbnail with an instant thumbhash
// ABOUTME: placeholder that fades into the real WebP once it loads.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { thumbHashToDataURL } from "thumbhash";

export function Thumbnail({
  id,
  thumbhash,
  title,
  className,
}: {
  id: string;
  thumbhash: string | null;
  title: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // On a hard refresh the browser may finish loading a cached image before React
  // attaches onLoad, so the event never fires. Check `complete` on mount to
  // avoid being stuck on the blurry thumbhash placeholder.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  // Decode the stored thumbhash to a tiny data URL — no network request.
  const placeholder = useMemo(() => {
    if (!thumbhash) return undefined;
    try {
      return thumbHashToDataURL(new Uint8Array(Buffer.from(thumbhash, "base64")));
    } catch {
      return undefined;
    }
  }, [thumbhash]);

  return (
    <div
      className={`relative overflow-hidden bg-ink-700 ${className ?? ""}`}
      style={
        placeholder
          ? { backgroundImage: `url(${placeholder})`, backgroundSize: "cover" }
          : undefined
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={`/api/blob/${id}/thumbnail`}
        alt={title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover object-top transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
