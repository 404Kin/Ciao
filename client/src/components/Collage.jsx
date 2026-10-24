import { Avatar } from './ui.jsx';
import { mediaUrl } from '../utils/api.js';
import { gradCss } from '../utils/collage.js';

// Mosaic of every contribution. `pending` shows dashed "waiting" tiles for people who haven't added theirs yet.
export default function Collage({ entries, pending = [], onOpenImage }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 auto-rows-[130px] sm:auto-rows-[170px] [grid-auto-flow:dense]">
      {entries.map((e, i) => {
        const big = e.image && i % 5 === 0 && entries.length > 2;
        const wide = !e.image && e.text && i % 4 === 3;
        const span = big ? 'col-span-2 row-span-2' : wide ? 'col-span-2' : '';
        return (
          <div key={e._id} className={`relative rounded-2xl overflow-hidden border border-line animate-rise ${span}`} style={e.image ? undefined : { background: gradCss(i) }}>
            {e.image && (
              <button className="absolute inset-0" onClick={() => onOpenImage?.(e)} aria-label="Open photo">
                <img src={mediaUrl(e.image)} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            )}
            {e.text && (
              <div className={e.image ? 'absolute inset-x-0 bottom-7 px-3 pt-8 pb-1 bg-gradient-to-t from-black/70 to-transparent pointer-events-none' : 'absolute inset-0 grid place-items-center p-4 pb-9 text-center pointer-events-none'}>
                <p className={`text-white font-bold break-words ${e.image ? 'text-sm' : e.text.length > 60 ? 'text-base' : 'text-xl'}`}>{e.text}</p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-2 py-1.5 bg-black/45 backdrop-blur-sm text-white text-[11px] font-semibold">
              <Avatar user={e.user} size={16} /> <span className="truncate">@{e.user?.username}</span>
            </div>
          </div>
        );
      })}
      {pending.map((u) => (
        <div key={u._id} className="rounded-2xl border-2 border-dashed border-line grid place-items-center text-center p-2 text-muted">
          <div>
            <Avatar user={u} size={34} className="mx-auto opacity-70" />
            <p className="text-[11px] mt-1.5 font-semibold truncate max-w-[110px]">@{u.username}</p>
            <p className="text-[10px]">is thinking…</p>
          </div>
        </div>
      ))}
    </div>
  );
}
