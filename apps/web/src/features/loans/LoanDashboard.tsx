import { useCallback, useEffect, useState } from 'react';
import {
  apiRequest,
  clearSession,
  getToken,
  LoanApplication,
  LoanPurpose,
  LoanStatus,
  User,
} from '../../lib/api';
import { formatNric } from '../../utility';

interface LoanDashboardProps {
  user: User;
  onLogout: () => void;
}

interface ApplicationUpdate {
  applicationId: string;
  status: LoanStatus;
  updatedAt: string;
}

const initialForm = {
  fullName: '',
  nric: '',
  phoneNumber: '',
  email: '',
  monthlyIncome: '',
  loanAmount: '',
  tenureMonths: '24',
  purposeId: '',
};

function formatRM(value: string | number): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function LoanDashboard({ user, onLogout }: LoanDashboardProps) {
  const [purposes, setPurposes] = useState<LoanPurpose[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadApplications = useCallback(async () => {
    const result = await apiRequest<LoanApplication[]>(
      '/loan-applications/mine',
    );
    setApplications(result);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      setLoading(true);
      setError('');

      try {
        const [purposeResult, applicationResult] = await Promise.all([
          apiRequest<LoanPurpose[]>('/loan-purposes'),
          apiRequest<LoanApplication[]>('/loan-applications/mine'),
        ]);

        if (active) {
          setPurposes(purposeResult);
          setApplications(applicationResult);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load your dashboard.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  // Authenticated SSE: EventSource cannot set an Authorization header,
  // so use fetch and parse the streaming response instead.
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const controller = new AbortController();

    async function connectToStatusStream() {
      try {
        const response = await fetch(
          'http://localhost:3000/api/loan-applications/events',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'text/event-stream',
            },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Live updates unavailable (${response.status})`);
        }

        if (!response.body) {
          throw new Error('Streaming is not supported by this browser.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() ?? '';

          for (const eventText of events) {
            const dataLines = eventText
              .split(/\r?\n/)
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim());

            if (!dataLines.length) continue;

            try {
              const update = JSON.parse(
                dataLines.join('\n'),
              ) as ApplicationUpdate;

              if (!update.applicationId || !update.status) continue;

              setApplications((current) =>
                current.map((application) =>
                  application.id === update.applicationId
                    ? {
                        ...application,
                        status: update.status,
                        updatedAt: update.updatedAt,
                      }
                    : application,
                ),
              );
            } catch {
              // Ignore malformed events and continue listening.
            }
          }
        }
      } catch (err) {
        if (
          !controller.signal.aborted &&
          err instanceof Error
        ) {
          console.error('Loan status stream:', err.message);
        }
      }
    }

    void connectToStatusStream();

    return () => controller.abort();
  }, []);

  async function handleSubmit(
    event: React.SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);

    try {
      await apiRequest<LoanApplication>('/loan-applications', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          monthlyIncome: Number(form.monthlyIncome),
          loanAmount: Number(form.loanAmount),
          tenureMonths: Number(form.tenureMonths),
          purposeId: Number(form.purposeId),
        }),
      });

      setForm(initialForm);
      await loadApplications();
      setNotice(
        'Application submitted. We will update its status automatically when the credit check finishes.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit your application.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(
    field: keyof typeof initialForm,
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="portal">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Loan portal home">
          <span className="brand-mark">R</span>
          <span>Personal Loan Portal</span>
        </a>

        <div className="account-menu">
          <div className="account-copy">
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
          </div>
          <button className="secondary-button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">CUSTOMER PORTAL</p>
          <h1>Good to see you, {user.fullName.split(' ')[0]}.</h1>
          <p className="muted">
            Apply for financing and follow your applications from here.
          </p>
        </div>
        <div className="secure-note">
          <span className="intro-dot" />
          Secure customer account
        </div>
      </section>

      {error && (
        <div className="error-message page-message" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="success-message page-message" role="status">
          {notice}
        </div>
      )}

      <section className="dashboard-grid">
        <div className="panel application-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">GET STARTED</p>
              <h2>Apply for a loan</h2>
            </div>
            <span className="panel-icon" aria-hidden="true">↗</span>
          </div>

          <p className="muted panel-description">
            Complete your details to submit a new personal loan application.
          </p>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Full name</span>
              <input
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                minLength={2}
                maxLength={100}
                autoComplete="name"
                required
              />
            </label>

            <label className="field">
              <span>Malaysian NRIC</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={form.nric}
                onChange={(e) => updateField('nric', formatNric(e.target.value))}
                minLength={14}
                maxLength={14}
                placeholder="e.g. 900101-14-5678"
                pattern="[0-9]{6}-[0-9]{2}-[0-9]{4}"
                title="Enter a 12-digit NRIC, e.g. 900101-14-5678"
                required
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Phone number</span>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  minLength={8}
                  maxLength={20}
                  autoComplete="tel"
                  placeholder="+60..."
                  required
                />
              </label>

              <label className="field">
                <span>Email address</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  maxLength={254}
                  autoComplete="email"
                  required
                />
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span>Monthly income (RM)</span>
                <input
                  type="number"
                  value={form.monthlyIncome}
                  onChange={(e) => updateField('monthlyIncome', e.target.value)}
                  min="1"
                  max="100000000"
                  step="0.01"
                  required
                />
              </label>

              <label className="field">
                <span>Loan amount (RM)</span>
                <input
                  type="number"
                  value={form.loanAmount}
                  onChange={(e) => updateField('loanAmount', e.target.value)}
                  min="100"
                  max="100000000"
                  step="0.01"
                  required
                />
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span>Tenure</span>
                <select
                  value={form.tenureMonths}
                  onChange={(e) => updateField('tenureMonths', e.target.value)}
                  required
                >
                  {[6, 12, 18, 24, 36, 48, 60].map((months) => (
                    <option key={months} value={months}>
                      {months} months
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Loan purpose</span>
                <select
                  value={form.purposeId}
                  onChange={(e) => updateField('purposeId', e.target.value)}
                  required
                >
                  <option value="">Select purpose</option>
                  {purposes.map((purpose) => (
                    <option key={purpose.id} value={purpose.id}>
                      {purpose.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button className="primary-button" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>

            <p className="form-footnote">
              Your application starts as pending while the credit check runs.
            </p>
          </form>
        </div>

        <div className="panel history-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">YOUR RECORDS</p>
              <h2>My applications</h2>
            </div>
            <span className="count-badge">{applications.length}</span>
          </div>

          <p className="muted panel-description">
            Statuses update automatically while this page is open.
          </p>

          {loading ? (
            <div className="empty-state">Loading your applications…</div>
          ) : applications.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">▤</span>
              <strong>No applications yet</strong>
              <span>Your submitted applications will appear here.</span>
            </div>
          ) : (
            <div className="application-list">
              {applications.map((application) => (
                <article className="application-card" key={application.id}>
                  <div className="application-card-top">
                    <span className="application-reference">
                      {application.id.slice(-8).toUpperCase()}
                    </span>
                    <span
                      className={`status-badge status-${application.status.toLowerCase()}`}
                    >
                      <span className="status-dot" />
                      {application.status}
                    </span>
                  </div>

                  <h3>
                    {application.purpose?.name ?? 'Personal loan'}
                  </h3>

                  <div className="loan-amount">
                    {formatRM(application.loanAmount)}
                  </div>

                  <div className="application-meta">
                    <span>{application.tenureMonths} months</span>
                    <span>{formatDate(application.createdAt)}</span>
                  </div>

                  {application.status === 'PENDING' && (
                    <div className="pending-note">
                      <span className="pulse-dot" />
                      Credit check in progress
                    </div>
                  )}

                  {application.status === 'REJECTED' &&
                    application.rejectionReason && (
                      <p className="rejection-reason">
                        {application.rejectionReason}
                      </p>
                    )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="portal-footer">
        <span>Personal Loan Portal</span>
        <span>Application statuses are subject to credit assessment.</span>
      </footer>
    </main>
  );
}