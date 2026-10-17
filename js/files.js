export const LGO_NAME = 'programa.lgo';
export const PNG_NAME = 'dibuix.png';

// Un fitxer binari llegit com a UTF-8 conté NUL o molts U+FFFD.
export function isProbablyText(text) {
  if (text.includes('\u0000')) return false;
  const bad = text.split('�').length - 1;
  return bad <= text.length * 0.05;
}

export function downloadDataUrl(filename, url) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
}

export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  downloadDataUrl(filename, url);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function composePng(...canvases) {
  const out = document.createElement('canvas');
  out.width = canvases[0].width;
  out.height = canvases[0].height;
  const ctx = out.getContext('2d');
  for (const c of canvases) ctx.drawImage(c, 0, 0);
  return out.toDataURL('image/png');
}
