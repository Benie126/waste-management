import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { homeForRole } from '../../components/Layout';

const FEATURES = [
  {
    title: 'Post recyclable waste',
    body: 'Producers create listings with category, quantity and location in seconds.',
  },
  {
    title: 'Smart matching',
    body: 'Listings are matched to collectors by material type, service area and availability.',
  },
  {
    title: 'Track every pickup',
    body: 'Request, accept, schedule and track collections from one simple dashboard.',
  },
  {
    title: 'Verified collectors',
    body: 'Administrators verify collectors before they can request protected pickups.',
  },
];

const MATERIALS = ['Plastic', 'Paper', 'Cardboard', 'Glass', 'Metal', 'Electronic Waste'];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              W
            </span>
            <span className="text-lg font-bold text-slate-900">WasteLink</span>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to={homeForRole(user.role)} className="btn-primary">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="badge bg-brand-100 text-brand-800">Smart waste collection</span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Connect recyclable waste with the people who can collect it.
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
              WasteLink is a platform that connects waste producers, collectors and recycling
              organizations. Post recyclable waste, find suitable collectors through simple
              rule-based matching, and track every collection to completion.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary">
                Create an account
              </Link>
              <Link to="/login" className="btn-secondary">
                I already have an account
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {MATERIALS.map((m) => (
                <span key={m} className="badge bg-slate-100 text-slate-700">
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              How it works
            </h2>
            <ol className="mt-4 space-y-4">
              {[
                'A producer registers and posts a recyclable waste listing.',
                'The system finds suitable collectors by material, area and availability.',
                'A collector requests the pickup; the producer accepts and schedules it.',
                'The collector updates the collection status until it is completed.',
                'The producer leaves feedback and the collection appears in history.',
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900">Main features</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500">
          WasteLink — Smart Recyclable Waste Collection and Matching System
        </div>
      </footer>
    </div>
  );
}
