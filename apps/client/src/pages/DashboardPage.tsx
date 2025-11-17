import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { PurchaseRequest } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const awaitingCeo = requests.filter((request) => request.status === 'ceo_review');
    const approvedThisMonth = requests.filter((request) => {
      const created = new Date(request.createdAt);
      const today = new Date();
      return request.status === 'bank_loaded' && created.getMonth() === today.getMonth() && created.getFullYear() === today.getFullYear();
    });
    const avgLineItems =
      pending.length > 0 ? (pending.reduce((sum, request) => sum + request.lineItems.length, 0) / pending.length).toFixed(1) : '0';

    return [
      { label: 'Total Pending Approvals', value: pending.length },
      { label: 'Value Awaiting CEO', value: formatCurrency(sumTotals(awaitingCeo)) },
      { label: 'Approved This Month', value: formatCurrency(sumTotals(approvedThisMonth)) },
      { label: 'Average Line Items', value: `${avgLineItems} items` }
    ];
  }, [requests]);

  const lastRequests = useMemo(() => requests.slice(0, 3), [requests]);

  return (
    <section>
      <header>
        <h2>Dashboard</h2>
        <p>Logged in as {user?.name} ({user?.role.replaceAll('_', ' ')}).</p>
      </header>

      {loading && <p className="hint">Loading...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="card-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="card metric-card">
            <p className="hint">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
          </article>
        ))}
      </div>

      <section className="table-section">
        <h3>Recent Requests</h3>
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
              <tr key={request.id}>
                <td>{request.requestNumber}</td>
                <td>{request.serviceDescription}</td>
                <td>{new Date(request.requestedAt).toLocaleDateString()}</td>
                <td>{request.status.replaceAll('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}

function sumTotals(requests: PurchaseRequest[]) {
  return requests.reduce((sum, request) => sum + calculateTotal(request), 0);
}

function calculateTotal(request: PurchaseRequest) {
  return request.lineItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
}

function formatCurrency(amount: number) {
  return `ZMW ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
