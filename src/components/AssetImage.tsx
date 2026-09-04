import { useEffect, useState } from 'react';
import { getAssetUrl } from '../storage/assets';

export function AssetImage({
  id,
  className,
  alt = '',
}: {
  id?: string;
  className?: string;
  alt?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!id) {
      setUrl(null);
      return;
    }
    getAssetUrl(id).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [id]);
  if (!url) return null;
  return <img src={url} className={className} alt={alt} />;
}
