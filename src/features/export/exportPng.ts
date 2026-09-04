import { toPng } from 'html-to-image';
import { downloadBlob, slugify } from '../../storage/persistence';

/**
 * 2x scale so the card survives being printed or read on a phone in daylight.
 * The card component uses flat hex + inline styles for exactly this reason.
 */
export async function exportElementAsPng(el: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ebe7de',
  });
  const blob = await (await fetch(dataUrl)).blob();
  downloadBlob(blob, `${slugify(filename)}.png`);
}
