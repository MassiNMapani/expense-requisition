import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { markPasswordChanged } = useAuth();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      markPasswordChanged();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Change Password</h1>
        <p>Please update your password before continuing.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Current Password
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>

          <label>
            New Password
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </label>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" disabled={saving}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
