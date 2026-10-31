import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api, { errMsg } from '../utils/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Modal } from './ui.jsx';

export const REPORT_REASONS = [
  ['spam', 'Spam or scam'],
  ['nudity', 'Nudity or sexual content'],
  ['harassment', 'Harassment or bullying'],
  ['hate', 'Hate speech'],
  ['violence', 'Violence or dangerous content'],
  ['misinformation', 'False information'],
  ['other', 'Something else'],
];

export default function ReportDialog({ postId, open, onClose }) {
  const toast = useToast();
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setReason('spam'); setDetails(''); setBusy(false); } }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(`/posts/${postId}/report`, { reason, details });
      toast.success(data.message);
      onClose();
    } catch (err) { toast.error(errMsg(err)); setBusy(false); }
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title="Report post" size="sm">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-muted">Why are you reporting this? Your report is private. See our <Link to="/guidelines" onClick={onClose} className="text-accent hover:underline">community guidelines</Link>.</p>
        <div className="divide-y divide-line rounded-lg border border-line">
          {REPORT_REASONS.map(([id, label]) => (
            <label key={id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface2 text-sm">
              <input type="radio" name="reason" checked={reason === id} onChange={() => setReason(id)} className="accent-[rgb(var(--accent))]" />
              {label}
            </label>
          ))}
        </div>
        <textarea className="field resize-none" rows={2} maxLength={300} placeholder="Add details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-danger btn-sm" disabled={busy}>{busy && <Loader2 size={14} className="spin" />} Report</button>
        </div>
      </form>
    </Modal>
  );
}
