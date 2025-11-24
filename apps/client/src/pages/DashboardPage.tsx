import { useEffect, useMemo, useState } from 'react';

import { apiFetch, buildFileUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { PurchaseRequest } from '../types';
import { canRoleApprove } from '../utils/approvals';
import { getRequestObjectId, type ExtendedPurchaseRequest } from '../utils/requestId';

export default function DashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approvedCurrency, setApprovedCurrency] = useState<PurchaseRequest['currency']>('ZMW');
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [approvedThisMonthCurrency, setApprovedThisMonthCurrency] = useState<PurchaseRequest['currency']>('ZMW');

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      const data = await apiFetch<PurchaseRequest[]>('/requests');
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }

  const metrics = useMemo(() => {
    const pending = requests.filter((request) => !['bank_loaded', 'rejected'].includes(request.status));
    const approvedThisMonth = requests.filter((request) => {
      const created = new Date(request.createdAt);
      const today = new Date();
      return request.status === 'bank_loaded' && created.getMonth() === today.getMonth() && created.getFullYear() === today.getFullYear();
    });
    const approvedTotalsThisMonth = sumTotalsByCurrency(approvedThisMonth);
    const approvedRequests = requests.filter((request) => request.status === 'bank_loaded');
    const approvedTotals = sumTotalsByCurrency(approvedRequests);
    const approvedValue = approvedTotals[approvedCurrency] ?? 0;

    const avgLineItems =
      pending.length > 0 ? (pending.reduce((sum, request) => sum + request.lineItems.length, 0) / pending.length).toFixed(1) : '0';

    return [
<<<<<<< HEAD
      { label: 'TOTAL PENDING APPROVALS', value: pending.length.toString() },
=======
      { label: 'Total Pending Approvals', value: pending.length.toString() },
      {
        label: 'Approved This Month',
        value: formatCurrencyValue(approvedTotalsThisMonth[approvedThisMonthCurrency] ?? 0, approvedThisMonthCurrency),
        extra: (
          <select value={approvedThisMonthCurrency} onChange={(event) => setApprovedThisMonthCurrency(event.target.value as PurchaseRequest['currency'])}>
            <option value="ZMW">ZMW</option>
            <option value="USD">USD</option>
          </select>
        )
      },
>>>>>>> 60dc0fe (changes before doing demo to laura)
      {
        label: 'APPROVED THIS MONTH',
        value: formatCurrencyValue(approvedTotalsThisMonth[approvedThisMonthCurrency] ?? 0, approvedThisMonthCurrency),
        extra: (
          <select value={approvedThisMonthCurrency} onChange={(event) => setApprovedThisMonthCurrency(event.target.value as PurchaseRequest['currency'])}>
            <option value="ZMW">ZMW</option>
            <option value="USD">USD</option>
          </select>
        )
      },
      {
        label: 'TOTAL AMOUNT APPROVED',
        value: formatCurrencyValue(approvedValue, approvedCurrency),
        extra: (
          <select value={approvedCurrency} onChange={(event) => setApprovedCurrency(event.target.value as PurchaseRequest['currency'])}>
            <option value="ZMW">ZMW</option>
            <option value="USD">USD</option>
          </select>
        )
      },
      { label: 'AVERAGE LINE ITEMS', value: `${avgLineItems} ITEMS` }
    ];
  }, [requests, approvedCurrency, approvedThisMonthCurrency]);

  const lastRequests = useMemo(() => requests.slice(0, 3), [requests]);
  const pendingApprovals = useMemo<ExtendedPurchaseRequest[]>(() => {
    if (!user) return [];
    return requests.filter((request) => canRoleApprove(request, user.role)) as ExtendedPurchaseRequest[];
  }, [requests, user]);

  async function handleApprovalDecision(request: ExtendedPurchaseRequest, decision: 'approved' | 'rejected') {
    const requestId = getRequestObjectId(request);
    if (!requestId) {
      setError('Unable to identify the request to update.');
      return;
    }
    const commentKey = requestId || request.requestNumber;
    if (decision === 'rejected' && !(approvalComments[commentKey]?.trim())) {
      setError('Please provide a comment before rejecting.');
      return;
    }

    const key = `${requestId}-${decision}`;
    setActionLoading(key);

    try {
      await apiFetch(`/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ decision, comment: approvalComments[commentKey] ?? '' })
      });
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section>
      <header>
        <h2>DASHBOARD</h2>
        <p>LOGGED IN AS {user?.name?.toUpperCase()} ({user ? user.role.replaceAll('_', ' ').toUpperCase() : ''}).</p>
      </header>

      {loading && <p className="hint">Loading...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="card-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="card metric-card">
            <p className="hint">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
            {metric.extra && <div className="metric-extra">{metric.extra}</div>}
          </article>
        ))}
      </div>

      <section className="table-section">
        <h3>RECENT REQUESTS</h3>
        <table>
          <thead>
            <tr>
              <th>NUMBER</th>
              <th>DESCRIPTION</th>
              <th>REQUESTED ON</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {lastRequests.length === 0 && (
              <tr>
                <td colSpan={4}>NO REQUESTS YET.</td>
              </tr>
            )}
            {lastRequests.map((request) => (
              <tr
                key={request.id}
                className="clickable-row"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRequest(request)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedRequest(request);
                  }
                }}
              >
                <td>{request.requestNumber}</td>
                <td>{request.serviceDescription}</td>
                <td>{new Date(request.requestedAt).toLocaleDateString()}</td>
                <td>{request.status.replaceAll('_', ' ').toUpperCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {pendingApprovals.length > 0 && (
        <section className="table-section">
          <h3>PENDING APPROVALS</h3>
          <div className="card-grid">
            {pendingApprovals.map((request) => {
              const requestId = getRequestObjectId(request);
              const commentKey = requestId || request.requestNumber;
              return (
                <article key={commentKey} className="card">
<<<<<<< HEAD
                  <header>
                    <h3>{request.projectName ?? `${request.department} Request`}</h3>
                    <p>{request.requestNumber}</p>
                    <p className="hint">Vendor: {request.vendorType === 'new' ? 'NEW' : 'EXISTING'}</p>
                  </header>
                  <p className="amount">
                    {request.currency} {calculateTotal(request).toLocaleString()}
                  </p>
                  <p className="status">CURRENT STAGE: {request.status.replaceAll('_', ' ').toUpperCase()}</p>
=======
                <header>
                  <h3>{request.projectName ?? `${request.department} Request`}</h3>
                  <p>{request.requestNumber}</p>
                  <p className="hint">Vendor: {request.vendorType === 'new' ? 'New' : 'Existing'}</p>
                </header>
                <p className="amount">
                  {request.currency} {calculateTotal(request).toLocaleString()}
                </p>
                <p className="status">Current stage: {request.status.replaceAll('_', ')')}</p>
>>>>>>> 60dc0fe (changes before doing demo to laura)
                {request.attachments.length > 0 && (
                  <div className="attachment-list">
                    <p className="hint">ATTACHMENTS</p>
                    <ul>
                      {request.attachments.map((attachment) => (
                        <li key={attachment.id}>
                          <a
                            href={buildFileUrl(`/uploads/${attachment.filename}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={attachment.originalName ?? attachment.filename}
                          >
                            {attachment.originalName ?? attachment.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <textarea
                  rows={2}
                  placeholder="ADD REJECTION COMMENT..."
                  value={approvalComments[commentKey] ?? ''}
                  onChange={(event) => setApprovalComments((prev) => ({ ...prev, [commentKey]: event.target.value }))}
                />
                <div className="actions-row">
                  <button
                    type="button"
                    disabled={actionLoading === `${requestId}-approved`}
                    onClick={() => handleApprovalDecision(request, 'approved')}
                  >
                    {actionLoading === `${requestId}-approved` ? 'SAVING...' : 'APPROVE'}
                  </button>
                  <button
                    type="button"
                    className="ghost outline"
                    disabled={actionLoading === `${requestId}-rejected`}
                    onClick={() => handleApprovalDecision(request, 'rejected')}
                  >
                    {actionLoading === `${requestId}-rejected` ? 'REJECTING...' : 'REJECT'}
                  </button>
                </div>
              </article>
              );
            })}
          </div>
        </section>
      )}

      {selectedRequest && (
        <div className="modal-backdrop" onClick={() => setSelectedRequest(null)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <p className="hint">REQUEST NUMBER</p>
                <h3>{selectedRequest.requestNumber}</h3>
              </div>
              <button type="button" className="ghost" onClick={() => setSelectedRequest(null)}>
                CLOSE
              </button>
            </header>
            <div className="modal-body">
              <p>
                <strong>DEPARTMENT:</strong> {selectedRequest.department}
              </p>
              <p>
                <strong>VENDOR:</strong> {selectedRequest.vendorType === 'new' ? 'NEW' : 'EXISTING'}
              </p>
              <p>
                <strong>DESCRIPTION:</strong> {selectedRequest.serviceDescription}
              </p>
              <p>
                <strong>DOCUMENT TYPE:</strong> {selectedRequest.documentType.toUpperCase()}
              </p>

              <h4>LINE ITEMS</h4>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>DESCRIPTION</th>
                    <th>UNIT PRICE</th>
                    <th>QUANTITY</th>
                    <th>COST</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRequest.lineItems.map((item, index) => (
                    <tr key={`${selectedRequest.id}-line-${index}`}>
                      <td>{index + 1}</td>
                      <td>{item.description}</td>
                      <td>
                        {selectedRequest.currency} {item.unitPrice.toLocaleString()}
                      </td>
                      <td>{item.quantity}</td>
                      <td>
                        {selectedRequest.currency} {(item.unitPrice * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>TOTAL</td>
                    <td>
                      {selectedRequest.currency} {calculateTotal(selectedRequest).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {selectedRequest.attachments.length > 0 && (
                <>
                  <h4>ATTACHMENTS</h4>
                  <ul>
                    {selectedRequest.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <a
                          href={buildFileUrl(`/uploads/${attachment.filename}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={attachment.originalName ?? attachment.filename}
                        >
                          {attachment.originalName ?? attachment.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function calculateTotal(request: PurchaseRequest) {
  return request.lineItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
}

function sumTotalsByCurrency(requests: PurchaseRequest[]) {
  return requests.reduce<Record<string, number>>((acc, request) => {
    const total = calculateTotal(request);
    acc[request.currency] = (acc[request.currency] ?? 0) + total;
    return acc;
  }, {});
}

function formatCurrencyValue(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
