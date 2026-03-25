import { useEffect, useMemo, useState } from 'react';
import {
  fetchSignals,
  fetchSignalsByCoin,
  fetchTweets,
  type NayftSignal,
  type NayftTweet
} from './api';
import './App.css';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function tweetText(signal: NayftSignal): string {
  return `${signal.coin} Alert 🚨

${signal.insight}

#crypto #trading`;
}

export default function App() {
  const [items, setItems] = useState<NayftSignal[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tweets, setTweets] = useState<NayftTweet[]>([]);
  const [tweetsLoading, setTweetsLoading] = useState(false);
  const [tweetsError, setTweetsError] = useState<string | null>(null);

  const [copyId, setCopyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const coin = filter.trim().toUpperCase();
      const data = coin ? await fetchSignalsByCoin(coin) : await fetchSignals(50);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const loadTweetsSection = async () => {
    setTweetsLoading(true);
    setTweetsError(null);
    try {
      const data = await fetchTweets(10);
      setTweets(data);
    } catch (e) {
      setTweetsError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setTweetsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadTweetsSection();
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyText = async (text: string, rowId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyId(rowId);
      setTimeout(() => setCopyId(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopyId(rowId);
      setTimeout(() => setCopyId(null), 2000);
    }
  };

  const onExport = async (s: NayftSignal, rowId: string) => {
    await copyText(tweetText(s), rowId);
  };

  const onCopyTweet = async (t: NayftTweet, rowId: string) => {
    await copyText(t.tweetText, rowId);
  };

  const title = useMemo(() => 'NAYFT Alpha Feed', []);

  return (
    <div className="app">
      <header className="header">
        <h1>{title}</h1>
        <div className="toolbar">
          <label className="filter-label">
            Coin
            <input
              type="text"
              placeholder="e.g. BTC (empty = all)"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load()}
            />
          </label>
          <button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </header>

      <main className="feed">
        {items.length === 0 && !loading && <p className="empty">No signals yet.</p>}
        {items.map((s, i) => {
          const id = `${s.coin}-${s.type}-${s.timestamp}-${i}`;
          return (
            <article key={id} className="card">
              <div className="card-head">
                <span className="coin">{s.coin}</span>
                <span className="type">{s.type.replace('_', ' ')}</span>
                <span className="strength">{(s.strength * 100).toFixed(0)}%</span>
              </div>
              <p className="insight">{s.insight}</p>
              <div className="card-foot">
                <time dateTime={s.timestamp}>{formatTime(s.timestamp)}</time>
                <button type="button" className="export" onClick={() => void onExport(s, id)}>
                  {copyId === id ? 'Copied' : 'Export insight'}
                </button>
              </div>
            </article>
          );
        })}
      </main>

      <section>
        <h2 style={{ margin: '1.75rem 0 0.5rem', fontSize: '1.05rem', fontWeight: 650 }}>
          AI Generated Tweets
        </h2>

        {tweetsError && <p className="error">{tweetsError}</p>}

        <div className="toolbar" style={{ marginBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => void loadTweetsSection()}
            disabled={tweetsLoading}
          >
            {tweetsLoading ? 'Loading…' : 'Refresh Tweets'}
          </button>
        </div>

        <main className="feed" style={{ marginTop: '0.9rem' }}>
          {tweets.length === 0 && !tweetsLoading && <p className="empty">No tweets yet.</p>}
          {tweets.map((t, i) => {
            const id = `tweet-${t.coin}-${t.rank}-${i}`;
            return (
              <article key={id} className="card">
                <div className="card-head">
                  <span className="coin">{t.coin}</span>
                  <span className="type">tweet</span>
                  <span className="strength">
                    {typeof t.score === 'number' ? `${Math.round(t.score * 100)}%` : `#${t.rank}`}
                  </span>
                </div>
                <p className="insight">{t.tweetText}</p>
                <div className="card-foot">
                  <span style={{ fontSize: '0.75rem', color: '#9aa0a6' }}>
                    Rank: {t.rank}
                  </span>
                  <button
                    type="button"
                    className="export"
                    onClick={() => void onCopyTweet(t, id)}
                  >
                    {copyId === id ? 'Copied' : 'Copy tweet'}
                  </button>
                </div>
              </article>
            );
          })}
        </main>
      </section>
    </div>
  );
}
