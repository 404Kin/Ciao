import { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Check } from 'lucide-react';
import { Modal } from './ui.jsx';

const V = 280; // visible crop square (css px)

// Lets the user move + zoom a picture so nothing important (the head!) is cut off,
// then returns a square 512×512 JPEG file.
export default function ImageCropper({ file, onCancel, onDone, title = 'Adjust your photo' }) {
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setZoom(1);
      // start near the top of tall photos so faces aren't chopped
      const base = V / Math.min(im.width, im.height);
      const maxY = Math.max(0, (im.height * base - V) / 2);
      setPos({ x: 0, y: maxY }); // top of the picture
    };
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const base = img ? V / Math.min(img.width, img.height) : 1;
  const scale = base * zoom;
  const clamp = (p, s = scale) => {
    if (!img) return p;
    const mx = Math.max(0, (img.width * s - V) / 2);
    const my = Math.max(0, (img.height * s - V) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  };

  const changeZoom = (z) => {
    const nz = Math.min(3, Math.max(1, z));
    setZoom(nz);
    setPos((p) => clamp(p, base * nz));
  };

  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onMove = (e) => {
    if (!drag.current) return;
    setPos(clamp({ x: drag.current.ox + e.clientX - drag.current.sx, y: drag.current.oy + e.clientY - drag.current.sy }));
  };
  const onUp = () => { drag.current = null; };

  const confirm = () => {
    if (!img) return;
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const sw = V / scale;
    const sx = img.width / 2 - pos.x / scale - sw / 2;
    const sy = img.height / 2 - pos.y / scale - sw / 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, sw, sw, 0, 0, size, size);
    c.toBlob((blob) => blob && onDone(new File([blob], 'avatar.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.9);
  };

  return (
    <Modal open={!!file} onClose={onCancel} title={title} size="sm">
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative overflow-hidden rounded-3xl bg-black touch-none cursor-grab active:cursor-grabbing select-none"
          style={{ width: V, height: V }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onWheel={(e) => changeZoom(zoom - e.deltaY * 0.002)}
          data-testid="cropper"
        >
          {img && (
            <img
              src={img.src} alt="" draggable={false}
              className="absolute max-w-none pointer-events-none"
              style={{
                width: img.width * scale, height: img.height * scale,
                left: V / 2 - (img.width * scale) / 2 + pos.x,
                top: V / 2 - (img.height * scale) / 2 + pos.y,
              }}
            />
          )}
          {/* circle guide: what the round avatar will show */}
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `inset 0 0 0 ${V}px rgba(0,0,0,.5)`, borderRadius: 24 }} />
          <div className="absolute inset-0 pointer-events-none rounded-full border-2 border-white/90" style={{ margin: 8, boxShadow: '0 0 0 400px rgba(0,0,0,.55)' }} />
        </div>
        <p className="text-xs text-muted -mt-1">Drag to move · slide to zoom</p>
        <div className="flex items-center gap-3 w-full max-w-[280px]">
          <button type="button" className="icon-btn" onClick={() => changeZoom(zoom - 0.2)} aria-label="Zoom out"><ZoomOut size={18} /></button>
          <input type="range" className="seek seek-visible flex-1" min={1} max={3} step="0.01" value={zoom} style={{ '--p': `${((zoom - 1) / 2) * 100}%` }} onChange={(e) => changeZoom(parseFloat(e.target.value))} aria-label="Zoom" />
          <button type="button" className="icon-btn" onClick={() => changeZoom(zoom + 0.2)} aria-label="Zoom in"><ZoomIn size={18} /></button>
        </div>
        <div className="flex justify-end gap-2 w-full">
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-primary btn-sm" onClick={confirm} disabled={!img}><Check size={14} /> Use this photo</button>
        </div>
      </div>
    </Modal>
  );
}
