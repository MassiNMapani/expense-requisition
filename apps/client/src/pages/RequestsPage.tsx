import { useEffect, useMemo, useState } from 'react';

import { apiFetch, buildFileUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { PurchaseRequest, RequestStatus } from '../types';
import { getRequestObjectId, type ExtendedPurchaseRequest } from '../utils/requestId';
import { canRoleApprove } from '../utils/approvals';

const statusOrder: RequestStatus[] = ['submitted', 'hod_review', 'cfo_review', 'ceo_review', 'accounting_processing', 'bank_loaded'];

export default function RequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [processingSelections, setProcessingSelections] = useState<Record<string, string[]>>({});
  const [processingLoading, setProcessingLoading] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
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

  useEffect(() => {
    const initialSelections: Record<string, string[]> = {};
    requests.forEach((request) => {
      const reqId = requestIdentifier(request);
      initialSelections[reqId] = request.accountingSteps?.filter((step) => step.completed).map((step) => step.id) ?? [];
    });
    setProcessingSelections(initialSelections);
  }, [requests]);

  const requestIdentifier = (request: PurchaseRequest): string => {
    return getRequestObjectId(request as ExtendedPurchaseRequest) || request.requestNumber;
  };

  async function handleDecision(requestId: string, decision: 'approved' | 'rejected') {
    if (decision === 'rejected' && !(comments[requestId] ?? '').trim()) {
      setError('Please add a comment before rejecting a request.');
      return;
    }

    const actionKey = `${requestId}-${decision}`;
    setActionLoading(actionKey);

    try {
      await apiFetch(`/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ decision, comment: comments[requestId] ?? '' })
      });
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleProcessingSave(requestId: string) {
    setProcessingLoading(requestId);
    try {
      await apiFetch(`/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ completedSteps: processingSelections[requestId] ?? [] })
      });
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update processing steps');
    } finally {
      setProcessingLoading(null);
    }
  }

  function toggleStep(requestId: string, stepId: string, checked: boolean) {
    setProcessingSelections((prev) => {
      const set = new Set(prev[requestId] ?? []);
      if (checked) {
        set.add(stepId);
      } else {
        set.delete(stepId);
      }
      return { ...prev, [requestId]: Array.from(set) };
    });
  }

  const grouped = useMemo(() => {
    const active = requests.filter((request) => !['bank_loaded', 'rejected'].includes(request.status));
    const finished = requests.filter((request) => ['bank_loaded', 'rejected'].includes(request.status));
    return { active, finished };
  }, [requests]);

  useEffect(() => {
    if (grouped.active.length > 0 && !selectedRequestId) {
      setSelectedRequestId(requestIdentifier(grouped.active[0]));
    }

    if (grouped.active.length === 0) {
      setSelectedRequestId(null);
    }
  }, [grouped.active, selectedRequestId]);

  const selectedRequest = useMemo(
    () => grouped.active.find((request) => requestIdentifier(request) === selectedRequestId) ?? null,
    [grouped.active, selectedRequestId]
  );

  if (loading) {
    return <div className="page-loading">Loading requests...</div>;
  }

  return (
    <section>
      <header>
        <h2>APPROVAL PIPELINE</h2>
        <p>TRACK THE LIFECYCLE OF EVERY PURCHASE REQUEST ACROSS ALL APPROVERS.</p>
      </header>

      {error && <p className="error-text">{error}</p>}

      <div className="table-section">
        <h3 className="section-title">MY ACTIVE REQUESTS</h3>
        {grouped.active.length === 0 ? (
          <p className="hint uppercase-text">NO ACTIVE REQUESTS.</p>
        ) : (
          <>
            <table className="request-summary-table">
              <thead>
                <tr>
                  <th>NUMBER</th>
                  <th>DESCRIPTION</th>
                  <th>DEPARTMENT</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {grouped.active.map((request) => {
                  const title = request.projectName ?? `${request.department} Request`;
                  const requestId = requestIdentifier(request);
                  return (
                    <tr
                      key={requestId}
                      className={`clickable-row ${requestId === selectedRequestId ? 'selected' : ''}`}
                      onClick={() => setSelectedRequestId(requestId)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedRequestId(requestId);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <td>{request.requestNumber}</td>
                      <td>{title}</td>
                      <td>{request.department}</td>
                      <td>
                        {request.currency} {calculateTotal(request).toLocaleString()}
                      </td>
                      <td>{formatStatus(request.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="request-detail-panel">
              {selectedRequest ? (
                (() => {
                  const title = selectedRequest.projectName ?? `${selectedRequest.department} Request`;
                  const requestId = requestIdentifier(selectedRequest);
                  return (
                    <>
                      <div className="detail-header">
                        <div>
                          <p className="hint">REQUEST TITLE</p>
                          <h3>{title}</h3>
                          <p className="hint">VENDOR</p>
                          <p className="detail-text">{selectedRequest.vendorType === 'new' ? 'NEW' : 'EXISTING'}</p>
                        </div>
                        <div className="detail-meta">
                          <p className="hint">REQUEST NUMBER</p>
                          <p className="detail-number">{selectedRequest.requestNumber}</p>
                          <p className="hint">CURRENT STAGE</p>
                          <p className="status-text">{formatStatus(selectedRequest.status)}</p>
                        </div>
                      </div>

                      <div className="detail-grid">
                        <div>
                          <p className="hint">DEPARTMENT</p>
                          <p className="detail-text">{selectedRequest.department}</p>
                        </div>
                        <div>
                          <p className="hint">REQUESTED ON</p>
                          <p className="detail-text">{new Date(selectedRequest.requestedAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="hint">TOTAL</p>
                          <p className="detail-text">
                            {selectedRequest.currency} {calculateTotal(selectedRequest).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <p className="hint">STATUS JOURNEY</p>
                      <ol className="status-track">
                        {statusOrder.map((status) => {
                          const position = statusOrder.indexOf(status);
                          const current = Math.max(statusOrder.indexOf(selectedRequest.status), 0);
                          return (
                            <li key={status} className={position <= current ? 'complete' : ''}>
                              {formatStatus(status)}
                            </li>
                          );
                        })}
                      </ol>

                      {selectedRequest.attachments.length > 0 && (
                        <div className="attachment-list">
                          <p className="hint">ATTACHMENTS</p>
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
                        </div>
                      )}

                      {user && canRoleApprove(selectedRequest, user.role) && (
                        <div className="approval-actions">
                          <textarea
                            rows={3}
                            placeholder="ADD CONTEXT FOR APPROVERS..."
                            value={comments[requestId] ?? ''}
                            onChange={(event) => setComments((prev) => ({ ...prev, [requestId]: event.target.value }))}
                          />
                          <div className="actions-row">
                            <button
                              type="button"
                              disabled={actionLoading === `${requestId}-approved`}
                              onClick={() => handleDecision(requestId, 'approved')}
                            >
                              {actionLoading === `${requestId}-approved` ? 'SAVING...' : 'APPROVE'}
                            </button>
                            <button
                              type="button"
                              className="ghost outline"
                              disabled={actionLoading === `${requestId}-rejected`}
                              onClick={() => handleDecision(requestId, 'rejected')}
                            >
                              {actionLoading === `${requestId}-rejected` ? 'REJECTING...' : 'REJECT'}
                            </button>
                          </div>
                        </div>
                      )}

                      {user?.role === 'accounting_analyst' && selectedRequest.accountingSteps.length > 0 && (
                        <div className="accounting-steps">
                          {selectedRequest.accountingSteps.map((step) => (
                            <label key={step.id} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={(processingSelections[requestId] ?? []).includes(step.id)}
                                onChange={(event) => toggleStep(requestId, step.id, event.target.checked)}
                              />
                              {step.label}
                            </label>
                          ))}
                          <button type="button" onClick={() => handleProcessingSave(requestId)} disabled={processingLoading === requestId}>
                            {processingLoading === requestId ? 'UPDATING...' : 'SAVE PROCESSING'}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                <p className="hint uppercase-text">SELECT A REQUEST TO VIEW DETAILS.</p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="table-section">
        <h3 className="section-title">MY PAST REQUESTS</h3>
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
            {grouped.finished.length === 0 && (
              <tr>
                <td colSpan={4}>NO COMPLETED REQUESTS.</td>
              </tr>
            )}
            {grouped.finished.map((request) => (
              <tr key={requestIdentifier(request)}>
                <td>{request.requestNumber}</td>
                <td>{request.serviceDescription}</td>
                <td>{new Date(request.requestedAt).toLocaleDateString()}</td>
                <td>
                  <span className={`status-pill ${request.status === 'rejected' ? 'danger' : 'success'}`}>{formatStatus(request.status)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function calculateTotal(request: PurchaseRequest) {
  return request.lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function formatStatus(status: RequestStatus) {
  return status.replaceAll('_', ' ').toUpperCase();
}
