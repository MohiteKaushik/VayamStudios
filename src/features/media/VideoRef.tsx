import { useEffect, useRef, useState } from 'react';
import { Link2, Trash2, Upload } from 'lucide-react';
import type { VideoRef as VideoRefData } from '../../lib/types';
import { MAX_VIDEO_BYTES, getAssetUrl, putVideoAsset } from '../../storage/assets';

/**
 * An optional five-to-ten second reference clip: how the camera moves, how an
 * actor crosses. Not production footage, and deliberately not a media library.
 *
 * A pasted link costs nothing and travels inside a project file. An uploaded
 * clip lives in this browser's IndexedDB only — that limit is stated in the UI
 * rather than discovered later when a shared project file opens without it.
 */

interface Props {
  value?: VideoRefData;
  onChange: (v: VideoRefData | undefined) => void;
  readOnly?: boolean;
}

type Embed = { kind: 'iframe' | 'video'; src: string };

/** Turns a share link into something that will actually play in a frame. */
export function toEmbed(url: string): Embed | null {
  const raw = url.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const host = parsed.hostname.replace(/^www\./, '');

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = parsed.searchParams.get('v');
    if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}` };
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1);
    if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}` };
  }
  if (host === 'vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` };
  }

  // Anything else: assume a direct file and let the video element decide.
  return { kind: 'video', src: raw };
}

export function VideoRefField({ value, onChange, readOnly }: Props) {
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    if (!value?.assetId) {
      setAssetUrl(null);
      return;
    }
    getAssetUrl(value.assetId).then((u) => live && setAssetUrl(u));
    return () => {
      live = false;
    };
  }, [value?.assetId]);

  const embed = value?.url ? toEmbed(value.url) : null;
  const hasClip = Boolean(assetUrl || embed);

  return (
    <div className="videoref">
      {assetUrl && <video className="videoref-player" src={assetUrl} controls playsInline />}

      {!assetUrl && embed?.kind === 'video' && (
        <video className="videoref-player" src={embed.src} controls playsInline />
      )}

      {!assetUrl && embed?.kind === 'iframe' && (
        <iframe
          className="videoref-player"
          src={embed.src}
          title="Reference video"
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}

      {!hasClip && !readOnly && <p className="videoref-empty">No reference clip yet.</p>}

      {!readOnly && (
        <>
          <div className="videoref-row">
            <Link2 size={14} />
            <input
              value={value?.url ?? ''}
              placeholder="Paste a YouTube, Vimeo or direct video link"
              aria-label="Reference video link"
              onChange={(e) => {
                const url = e.target.value.trim();
                onChange(url || value?.assetId ? { ...value, url: url || undefined } : undefined);
              }}
            />
            {hasClip && (
              <button
                className="icon-btn"
                title="Remove reference clip"
                aria-label="Remove reference clip"
                onClick={() => {
                  setError(null);
                  onChange(undefined);
                }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          <div className="videoref-row">
            <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
              <Upload size={14} />
              Upload a clip
            </button>
            <span className="videoref-note">
              Uploaded clips stay in this browser and are <b>not</b> included in a saved project
              file. Use a link to share one with the crew.
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                if (f.size > MAX_VIDEO_BYTES) {
                  setError(
                    `That clip is ${Math.round(f.size / 1024 / 1024)} MB. Keep reference clips under 50 MB, or paste a link instead.`
                  );
                  return;
                }
                setError(null);
                onChange({ ...value, assetId: await putVideoAsset(f) });
              }}
            />
          </div>

          {error && <p className="videoref-error">{error}</p>}
        </>
      )}
    </div>
  );
}
