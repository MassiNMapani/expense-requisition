import { useEffect, useMemo, useState } from 'react';

import { apiFetch, apiFetchBlob } from '../lib/api';
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
  const [viewingAttachmentId, setViewingAttachmentId] = useState<string | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const canDownloadAttachment = user?.role === 'accounting_analyst' || user?.role === 'chief_finance_officer';

  useEffect(() => {
    refresh();
  }, []);

  function formatPrDisplay(raw: string) {
    const match = raw.match(/PR-(\d+)$/);
    if (match) return `PR-${match[1].padStart(6, '0')}`;
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.length > 0) return `PR-${digits.slice(-6).padStart(6, '0')}`;
    return raw;
  }

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
      {
        label: 'Total amount approved',
        value: formatCurrencyValue(approvedValue, approvedCurrency),
        extra: (
          <select value={approvedCurrency} onChange={(event) => setApprovedCurrency(event.target.value as PurchaseRequest['currency'])}>
            <option value="ZMW">ZMW</option>
            <option value="USD">USD</option>
          </select>
        )
      },
      { label: 'Average Line Items', value: `${avgLineItems} items` }
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

  async function viewAttachment(attachment: { id: string; filename: string }) {
    setViewingAttachmentId(attachment.id);
    try {
      const blob = await apiFetchBlob(`/uploads/${attachment.filename}`);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewName(attachment.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open attachment');
    } finally {
      setViewingAttachmentId(null);
    }
  }

  async function downloadAttachment(attachment: { id: string; filename: string; originalName?: string }) {
    setDownloadingAttachmentId(attachment.id);
    try {
      const blob = await apiFetchBlob(`/uploads/${attachment.filename}?download=true`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName ?? attachment.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download attachment');
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewName(null);
  }

  return (
    <section>
      <header>
  <h2>DASHBOARD</h2>
  <p>LOGGED IN AS {user?.name} ({user?.role.replaceAll('_', ' ')}).</p>
      </header>

      {loading && <p className="hint">Loading...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="card-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="card metric-card">
            <p className="hint">{metric.label.toUpperCase()}</p>
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
              <th>Number</th>
              <th>Description</th>
              <th>Requested On</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lastRequests.length === 0 && (
              <tr>
                <td colSpan={4}>No requests yet.</td>
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
        <td>{formatPrDisplay(request.requestNumber)}</td>
                <td>{request.serviceDescription}</td>
                <td>{new Date(request.requestedAt).toLocaleDateString()}</td>
        <td>{request.status.replaceAll('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {pendingApprovals.length > 0 && (
        <section className="table-section">
          <h3>PENDING APPROVALS</h3>
          <div className="request-list">
            <ul>
              {pendingApprovals.map((request) => {
                const requestId = getRequestObjectId(request) || request.requestNumber;
                return (
                  <li key={requestId} className="request-summary">
                    <button type="button" className="link-like" onClick={() => setSelectedRequest(request)}>
                      <div className="summary-left">
                        <strong>{request.projectName ?? `${request.department} Request`}</strong>
                        <div className="hint">{formatPrDisplay(request.requestNumber)}</div>
                      </div>
                      <div className="summary-right">
                        <div className="amount">{request.currency} {calculateTotal(request).toLocaleString()}</div>
                        <div className="status">{request.status.replaceAll('_', ' ')}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {selectedRequest && (
        <div className="modal-backdrop" onClick={() => setSelectedRequest(null)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <p className="hint">Request Number</p>
                <h3>{selectedRequest.requestNumber}</h3>
              </div>
              <button type="button" className="ghost" onClick={() => setSelectedRequest(null)}>
                Close
              </button>
            </header>
            <div className="modal-body">
              <p>
                <strong>Department:</strong> {selectedRequest.department}
              </p>
              <p>
                <strong>Vendor:</strong> {selectedRequest.vendorType === 'new' ? 'New' : 'Existing'}
              </p>
              <p>
                <strong>Description:</strong> {selectedRequest.serviceDescription}
              </p>
              <p>
                <strong>Document Type:</strong> {selectedRequest.documentType}
              </p>

              <h4>Line Items</h4>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th>Unit Price</th>
                    <th>Quantity</th>
                    <th>Cost</th>
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
                    <td colSpan={4}>Total</td>
                    <td>
                      {selectedRequest.currency} {calculateTotal(selectedRequest).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {selectedRequest.attachments.length > 0 && (
                <>
                  <h4>Attachments</h4>
                  <ul>
                    {selectedRequest.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <div className="attachment-row">
                          <span>{attachment.originalName ?? attachment.filename}</span>
                          <div className="attachment-actions">
                            <button
                              type="button"
                              onClick={() => viewAttachment(attachment)}
                              disabled={viewingAttachmentId === attachment.id}
                            >
                              {viewingAttachmentId === attachment.id ? 'Opening...' : 'View'}
                            </button>
                            {canDownloadAttachment && (
                              <button
                                type="button"
                                onClick={() => downloadAttachment(attachment)}
                                disabled={downloadingAttachmentId === attachment.id}
                              >
                                {downloadingAttachmentId === attachment.id ? 'Downloading...' : 'Download'}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {user && canRoleApprove(selectedRequest as ExtendedPurchaseRequest, user.role) && (
                <div className="approval-actions modal-approval">
                  <textarea
                    rows={3}
                    placeholder="Add rejection comment..."
                    value={approvalComments[selectedRequest.requestNumber] ?? ''}
                    onChange={(event) => setApprovalComments((prev) => ({ ...prev, [selectedRequest.requestNumber]: event.target.value }))}
                  />
                  <div className="actions-row">
                    <button
                      type="button"
                      disabled={actionLoading === `${selectedRequest.id}-approved`}
                      onClick={() => handleApprovalDecision(selectedRequest as ExtendedPurchaseRequest, 'approved')}
                    >
                      {actionLoading === `${selectedRequest.id}-approved` ? 'Saving...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      /* Reject uses primary styling in modal to be visible against the white background */
                      disabled={actionLoading === `${selectedRequest.id}-rejected`}
                      onClick={() => handleApprovalDecision(selectedRequest as ExtendedPurchaseRequest, 'rejected')}
                    >
                      {actionLoading === `${selectedRequest.id}-rejected` ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {previewUrl && (
        <div className="modal-backdrop" onClick={closePreview}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <p className="hint">Attachment</p>
                <h4>{previewName ?? 'Preview'}</h4>
              </div>
              <button type="button" className="ghost" onClick={closePreview}>
                Close
              </button>
            </header>
            <div className="modal-body">
              <iframe src={previewUrl} title={previewName ?? 'Attachment'} style={{ width: '100%', height: '70vh' }} />
              <p className="hint">Viewing only. Downloads are restricted based on role.</p>
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
