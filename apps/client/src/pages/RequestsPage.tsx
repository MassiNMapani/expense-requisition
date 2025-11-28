import { useEffect, useMemo, useState } from 'react';

import { apiFetch, apiFetchBlob } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { PurchaseRequest, RequestStatus } from '../types';
import { getRequestObjectId, type ExtendedPurchaseRequest } from '../utils/requestId';
import { canRoleApprove } from '../utils/approvals';

const statusOrder: RequestStatus[] = ['submitted', 'hod_review', 'cfo_review', 'ceo_review', 'accounting_processing', 'bank_loaded'];

export default function RequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [processingSelections, setProcessingSelections] = useState<Record<string, string[]>>({});
  const [processingLoading, setProcessingLoading] = useState<string | null>(null);
  const [viewingAttachmentId, setViewingAttachmentId] = useState<string | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const { user } = useAuth();
  const showLoadedByColumn = user?.role === 'accounting_analyst';
  const canDownloadAttachment = user?.role === 'accounting_analyst' || user?.role === 'chief_finance_officer';

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

  function formatPrNumber(raw: string) {
    // If already PR- followed by digits, return as-is; if PR-UUID or full UUID, attempt to extract trailing digits
    const match = raw.match(/PR-(\d+)$/);
    if (match) return `PR-${match[1].padStart(6, '0')}`;
    // if raw contains PR-uuid, try to map numeric sequence from database id portion (fallback)
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.length > 0) return `PR-${digits.slice(-6).padStart(6, '0')}`;
    // fallback: show original
    return raw;
  }

  function formatLoadedBy(request: PurchaseRequest) {
    if (request.loadedByAnalystName) return request.loadedByAnalystName;
    if (request.loadedByAnalystId) return request.loadedByAnalystId;

    const completedStep = [...(request.accountingSteps ?? [])].reverse().find((step) => step.completedBy);
    return completedStep?.completedBy ?? 'N/A';
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

  if (loading) {
    return <div className="page-loading">Loading requests...</div>;
  }

  return (
    <>
      <section>
        <header>
          <h2>APPROVAL PIPELINE</h2>
          <p>TRACK THE LIFECYCLE OF EVERY PURCHASE REQUEST ACROSS ALL APPROVERS.</p>
        </header>

        {error && <p className="error-text">{error}</p>}

        <h3 className="section-title">MY ACTIVE REQUESTS</h3>
        {grouped.active.length === 0 ? (
          <p className="hint">No active requests.</p>
        ) : (
          <div className="request-list">
            <ul>
              {grouped.active.map((request) => {
                const title = request.projectName ?? `${request.department} Request`;
                const requestId = requestIdentifier(request);
                return (
                  <li key={requestId} className={`request-summary ${selectedRequestId === requestId ? 'selected' : ''}`}>
                    <button type="button" className="link-like" onClick={() => setSelectedRequestId(requestId)}>
                      <div className="summary-left">
                        <strong>{title}</strong>
                        <div className="hint">{formatPrNumber(request.requestNumber)}</div>
                      </div>
                      <div className="summary-right">
                        <div className="amount">{request.currency} {calculateTotal(request).toLocaleString()}</div>
                        <div className="status">{formatStatus(request.status)}</div>
                      </div>
                    </button>
                    {selectedRequestId === requestId && (
                      <div className="request-detail">
                        <p className="hint">Vendor: {request.vendorType === 'new' ? 'New' : 'Existing'}</p>
                        {request.attachments.length > 0 && (
                          <div className="attachment-list">
                            <p className="hint">Attachments</p>
                            <ul>
                              {request.attachments.map((attachment) => (
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
                          </div>
                        )}
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

                        {user && canRoleApprove(request, user.role) && (
                          <div className="approval-actions">
                            <textarea
                              rows={2}
                              placeholder="Add context for approvers..."
                              value={comments[requestId] ?? ''}
                              onChange={(event) => setComments((prev) => ({ ...prev, [requestId]: event.target.value }))}
                            />
                            <div className="actions-row">
                              <button type="button" disabled={actionLoading === `${requestId}-approved`} onClick={() => handleDecision(requestId, 'approved')}>
                                {actionLoading === `${requestId}-approved` ? 'Saving...' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                /* show Reject with primary styling to match Approve */
                                disabled={actionLoading === `${requestId}-rejected`}
                                onClick={() => handleDecision(requestId, 'rejected')}
                              >
                                {actionLoading === `${requestId}-rejected` ? 'Rejecting...' : 'Reject'}
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
                                  checked={(processingSelections[requestId] ?? []).includes(step.id)}
                                  onChange={(event) => toggleStep(requestId, step.id, event.target.checked)}
                                />
                                {step.label}
                              </label>
                            ))}
                            <button type="button" onClick={() => handleProcessingSave(requestId)} disabled={processingLoading === requestId}>
                              {processingLoading === requestId ? 'Updating...' : 'Save processing'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <h3 className="section-title">MY PAST REQUESTS</h3>
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Description</th>
                <th>Requested On</th>
                {showLoadedByColumn && <th>Loaded By</th>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {grouped.finished.length === 0 && (
                <tr>
                  <td colSpan={showLoadedByColumn ? 5 : 4}>No completed requests.</td>
                </tr>
              )}
              {grouped.finished.map((request) => (
                <tr key={requestIdentifier(request)}>
                  <td>{formatPrNumber(request.requestNumber)}</td>
                  <td>{request.serviceDescription}</td>
                  <td>{new Date(request.requestedAt).toLocaleDateString()}</td>
                  {showLoadedByColumn && <td>{formatLoadedBy(request)}</td>}
                  <td>
                    <span className={`status-pill ${request.status === 'rejected' ? 'danger' : 'success'}`}>{formatStatus(request.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {previewUrl && <AttachmentPreview url={previewUrl} name={previewName} onClose={closePreview} />}
    </>
  );
}

function AttachmentPreview({ url, name, onClose }: { url: string; name?: string | null; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h4>{name ?? 'Attachment preview'}</h4>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <iframe src={url} title={name ?? 'Attachment'} style={{ width: '100%', height: '70vh' }} />
          <p className="hint">Viewing only. Downloads are restricted based on role.</p>
        </div>
      </div>
    </div>
  );
}

function calculateTotal(request: PurchaseRequest) {
  return request.lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function formatStatus(status: RequestStatus) {
  return status.replaceAll('_', ' ');
}
