import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { PurchaseRequest, RequestStatus, UserRole } from '../types';

const statusOrder: RequestStatus[] = ['submitted', 'hod_review', 'cfo_review', 'ceo_review', 'accounting_processing', 'bank_loaded'];

export default function RequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [processingSelections, setProcessingSelections] = useState<Record<string, string[]>>({});
  const [processingLoading, setProcessingLoading] = useState<string | null>(null);
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
      initialSelections[request.id] = request.accountingSteps?.filter((step) => step.completed).map((step) => step.id) ?? [];
    });
    setProcessingSelections(initialSelections);
  }, [requests]);

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

  if (loading) {
    return <div className="page-loading">Loading requests...</div>;
  }

  return (
    <section>
      <header>
        <h2>Approval Pipeline</h2>
        <p>Track the lifecycle of every purchase request across all approvers.</p>
      </header>

      {error && <p className="error-text">{error}</p>}

      <h3 className="section-title">My Active Requests</h3>
      {grouped.active.length === 0 ? (
        <p className="hint">No active requests.</p>
      ) : (
        <div className="card-grid">
          {grouped.active.map((request) => (
            <article key={request.id} className="card">
              <header>
                <h3>{request.projectName}</h3>
                <p>{request.requestNumber}</p>
              </header>
              <p className="amount">ZMW {calculateTotal(request).toLocaleString()}</p>
              <p className="status">Current stage: {formatStatus(request.status)}</p>

              <ol className="status-track">
                {statusOrder.map((status) => {
                  const position = statusOrder.indexOf(status);
                  const current = Math.max(statusOrder.indexOf(request.status), 0);
                  return (
                    <li key={status} className={position <= current ? 'complete' : ''}>
                      {formatStatus(status)}
                    </li>
                  );
                })}
              </ol>

              {user && canApprove(request, user.role) && (
                <div className="approval-actions">
                  <textarea
                    rows={2}
                    placeholder="Add context for approvers..."
                    value={comments[request.id] ?? ''}
                    onChange={(event) => setComments((prev) => ({ ...prev, [request.id]: event.target.value }))}
                  />
                  <div className="actions-row">
                    <button type="button" disabled={actionLoading === `${request.id}-approved`} onClick={() => handleDecision(request.id, 'approved')}>
                      {actionLoading === `${request.id}-approved` ? 'Saving...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      disabled={actionLoading === `${request.id}-rejected`}
                      onClick={() => handleDecision(request.id, 'rejected')}
                    >
                      {actionLoading === `${request.id}-rejected` ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}

              {user?.role === 'accounting_analyst' && request.accountingSteps.length > 0 && (
                <div className="accounting-steps">
                  {request.accountingSteps.map((step) => (
                    <label key={step.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(processingSelections[request.id] ?? []).includes(step.id)}
                        onChange={(event) => toggleStep(request.id, step.id, event.target.checked)}
                      />
                      {step.label}
                    </label>
                  ))}
                  <button type="button" onClick={() => handleProcessingSave(request.id)} disabled={processingLoading === request.id}>
                    {processingLoading === request.id ? 'Updating...' : 'Save processing'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <h3 className="section-title">My Past Requests</h3>
      <div className="table-section">
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
            {grouped.finished.length === 0 && (
              <tr>
                <td colSpan={4}>No completed requests.</td>
              </tr>
            )}
            {grouped.finished.map((request) => (
              <tr key={request.id}>
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
  return status.replaceAll('_', ' ');
}

function canApprove(request: PurchaseRequest, role: UserRole) {
  if (role === 'head_of_department') {
    return request.status === 'hod_review';
  }
  if (role === 'chief_finance_officer' || role === 'super_user') {
    return request.status === 'cfo_review';
  }
  if (role === 'chief_executive_officer') {
    return request.status === 'ceo_review';
  }
  return false;
}
