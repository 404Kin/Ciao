// Avatar images: just drop image files into  src/assets/avatars/  and they show up
// automatically in Register and Settings (png, jpg, webp, svg, gif, avif).
const files = import.meta.glob('../assets/avatars/*.{png,jpg,jpeg,webp,svg,gif,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const AVATAR_PRESETS = Object.entries(files)
  .map(([path, url]) => ({ id: path.split('/').pop(), url }))
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

export const presetValue = (id) => `preset:${id}`;
export const presetUrl = (avatar) =>
  typeof avatar === 'string' && avatar.startsWith('preset:')
    ? AVATAR_PRESETS.find((p) => p.id === avatar.slice(7))?.url || null
    : null;
