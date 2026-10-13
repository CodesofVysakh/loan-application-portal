import { useCallback, useEffect, useState } from 'react';
import {
  apiRequest,
  clearSession,
  LoanApplication,
  LoanPurpose,
  LoanStatus,
  User,
} from '../../lib/api';

type AdminApplication = LoanApplication & {
  user?: { id: string; fullName: string; email: string };
};

type StatusFilter = 'ALL' | LoanStatus;

type PaginatedApplications = {
  items: AdminApplication[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All applications', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusLabel(status: LoanStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [selected, setSelected] = useState<AdminApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
    //   const query =
    //     filter === 'ALL' ? '' : `?status=${encodeURIComponent(filter)}`;

    //   const result = await apiRequest<AdminApplication[]>(
    //     `/loan-applications${query}`,
    //   );

    //   setApplications(result);
    const query = new URLSearchParams({
    page: String(page),
    pageSize: '25',
    });

    if (filter !== 'ALL') {
        query.set('status', filter);
    }

    const result = await apiRequest<PaginatedApplications>(
        `/loan-applications?${query.toString()}`,
    );

    setApplications(result.items);
    setTotal(result.total);
    setTotalPages(result.totalPages);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load loan applications.',
      );
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  async function openDetails(id: string) {
    setSelected(null);
    setDetailError('');
    setDetailLoading(true);

    try {
      const result = await apiRequest<AdminApplication>(
        `/loan-applications/${encodeURIComponent(id)}`,
      );
      setSelected(result);
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : 'Unable to load application details.',
      );
    } finally {
      setDetailLoading(false);
    }
  }

  const pendingCount = applications.filter(
    (application) => application.status === 'PENDING',
  ).length;

  return (
    <main className="portal">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <div>
            <strong>Loan Portal</strong>
            <span>Administration</span>
          </div>
        </div>

        <div className="topbar-user">
          <div className="user-copy">
            <strong>{user.fullName}</strong>
            <span>Administrator</span>
          </div>
          <button className="button button-secondary" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="admin-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">OPERATIONS</p>
            <h1>Loan applications</h1>
            <p className="muted">
              Review applications and monitor credit-check outcomes.
            </p>
          </div>

          <button
            className="button button-primary"
            onClick={() => void loadApplications()}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>

        <div className="admin-summary">
          <div className="summary-card">
            <span>Applications in this view</span>
            <strong>{applications.length.toLocaleString()}</strong>
          </div>
          <div className="summary-card">
            <span>Pending in this view</span>
            <strong>{pendingCount.toLocaleString()}</strong>
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="filter-tabs" aria-label="Filter applications">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                className={`filter-tab ${filter === item.value ? 'active' : ''}`}
                onClick={() => {
                    setPage(1);
                    setFilter(item.value);
                }}
                aria-pressed={filter === item.value}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="muted small-text">
            {applications.length.toLocaleString()} result
            {applications.length === 1 ? '' : 's'}
          </span>
        </div>

        {error && (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        )}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Loan amount</th>
                <th>Purpose</th>
                <th>Tenure</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="table-message">
                    Loading applications…
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-message">
                    No applications found for this filter.
                  </td>
                </tr>
              ) : (
                applications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <strong>{application.fullName}</strong>
                      <span className="table-subtext">
                        {application.email}
                      </span>
                    </td>
                    <td className="money-cell">
                      {formatMoney(application.loanAmount)}
                    </td>
                    <td>
                      {application.purpose?.name ?? '—'}
                    </td>
                    <td>{application.tenureMonths} months</td>
                    <td>
                      <span
                        className={`status-badge status-${application.status.toLowerCase()}`}
                      >
                        {statusLabel(application.status)}
                      </span>
                    </td>
                    <td>{formatDate(application.createdAt)}</td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => void openDetails(application.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
            <span className="muted small-text">
                {total === 0
                ? 'No applications'
                : `Showing ${(page - 1) * 25 + 1}–${Math.min(page * 25, total)} of ${total.toLocaleString()}`}
            </span>

            <div className="pagination-actions">
                <button
                className="button button-secondary"
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => current - 1)}
                >
                Previous
                </button>

                <span className="page-number">
                Page {page} of {Math.max(totalPages, 1)}
                </span>

                <button
                className="button button-secondary"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                >
                Next
                </button>
            </div>
        </div>

        <p className="admin-footnote">
          Status changes are processed by the backend credit-check service.
          Refresh the list to retrieve the latest results.
        </p>
      </section>

      {(detailLoading || selected || detailError) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!detailLoading) {
              setSelected(null);
              setDetailError('');
            }
          }}
        >
          <section
            className="detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="detail-heading">
              <div>
                <p className="eyebrow">APPLICATION REVIEW</p>
                <h2 id="detail-title">Application details</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close details"
                onClick={() => {
                  setSelected(null);
                  setDetailError('');
                }}
              >
                ×
              </button>
            </div>

            {detailLoading && <p>Loading application details…</p>}

            {detailError && (
              <div className="notice notice-error" role="alert">
                {detailError}
              </div>
            )}

            {selected && (
              <>
                <div className="detail-status">
                  <span className="muted">Current status</span>
                  <span
                    className={`status-badge status-${selected.status.toLowerCase()}`}
                  >
                    {statusLabel(selected.status)}
                  </span>
                </div>

                <h3>Applicant information</h3>
                <dl className="detail-grid">
                  <div>
                    <dt>Full name</dt>
                    <dd>{selected.fullName}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{selected.email}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{selected.phoneNumber || '—'}</dd>
                  </div>
                  <div>
                    <dt>Malaysian NRIC</dt>
                    <dd>{selected.nric || '—'}</dd>
                  </div>
                </dl>

                <h3>Loan information</h3>
                <dl className="detail-grid">
                  <div>
                    <dt>Loan amount</dt>
                    <dd>{formatMoney(selected.loanAmount)}</dd>
                  </div>
                  <div>
                    <dt>Monthly income</dt>
                    <dd>{formatMoney(selected.monthlyIncome)}</dd>
                  </div>
                  <div>
                    <dt>Tenure</dt>
                    <dd>{selected.tenureMonths} months</dd>
                  </div>
                  <div>
                    <dt>Purpose</dt>
                    <dd>{selected.purpose?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDate(selected.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Credit check completed</dt>
                    <dd>
                      {selected.updatedAt &&
                      selected.status !== 'PENDING'
                        ? formatDate(selected.updatedAt)
                        : 'Pending'}
                    </dd>
                  </div>
                </dl>

                {selected.rejectionReason && (
                  <>
                    <h3>Decision notes</h3>
                    <p className="decision-note">
                      {selected.rejectionReason}
                    </p>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default AdminDashboard;