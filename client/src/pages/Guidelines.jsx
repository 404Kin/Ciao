import { PageHeader } from '../components/ui.jsx';

const RULES = [
  ['Be respectful', 'No harassment, bullying, threats or hate speech against people or groups.'],
  ['Keep it safe', 'No nudity or sexual content, and nothing that promotes violence, self-harm or illegal activity.'],
  ['Be honest', 'No spam, scams, fake accounts or deliberately false information.'],
  ['Respect ownership', 'Only post photos, videos and music you made or have the right to share.'],
  ['Protect privacy', 'Do not share other people’s private details or pictures without their permission.'],
];

export default function Guidelines() {
  return (
    <>
      <PageHeader back title="Community guidelines" />
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted">Ciao is for sharing moments with friends. These rules keep it a good place for everyone.</p>
        <ol className="card divide-y divide-line">
          {RULES.map(([t, d], i) => (
            <li key={t} className="p-4 flex gap-3">
              <span className="w-6 h-6 rounded-full bg-surface2 grid place-items-center text-xs font-bold shrink-0">{i + 1}</span>
              <div><h3 className="font-semibold">{t}</h3><p className="text-sm text-muted mt-0.5">{d}</p></div>
            </li>
          ))}
        </ol>
        <div className="card p-4">
          <h3 className="font-semibold mb-1">What happens if rules are broken</h3>
          <ul className="text-sm text-muted list-disc pl-5 space-y-1">
            <li>Anyone can report a post. A post with several reports is hidden until our team reviews it.</li>
            <li>Admins can remove the post, send a warning, or suspend the account for a few days or permanently.</li>
            <li>You will see a notice in your notifications when action is taken on your content.</li>
            <li>Repeated or serious violations lead to permanent suspension.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
