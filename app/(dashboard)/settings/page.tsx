'use client';

import { useState, useEffect } from 'react';
import { User, Key, Trash2, Plus, Check, AlertTriangle, Shield, Star } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import SignOutButton from '@/components/layout/SignOutButton';

interface ApiKeyDisplay {
  id: string;
  name: string;
  prefix: string;
  tier: string;
  rate_limit: number;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export default function SettingsPage() {
  const { user, profile } = useUser();
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [apiKeys, setApiKeys] = useState<ApiKeyDisplay[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Step 2: apiAccess is true ONLY on enterprise. Settings page mirrors
  // that — only Enterprise users see the API Keys section.
  const isEnterprise = profile?.subscription_status === 'enterprise';

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (isEnterprise) fetchApiKeys();
    else setKeysLoading(false);
  }, [profile]);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/v1/keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setKeysLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewlyCreatedKey(data.key);
        setShowKey(true);
        setNewKeyName('');
        setShowCreateForm(false);
        fetchApiKeys();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create key');
      }
    } catch {
      alert('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Revoke this API key? Any services using it will stop working immediately.')) return;
    try {
      const res = await fetch(`/api/v1/keys/${keyId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchApiKeys();
      }
    } catch {
      alert('Failed to revoke key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName }),
      });
      if (res.ok) {
        setMessage('Profile updated successfully!');
      } else {
        setMessage('Failed to update profile.');
      }
    } catch {
      setMessage('Failed to update profile.');
    }
    setSaving(false);
  };

  // Step 2: tier-name -> human-readable label.
  const planName =
    profile?.subscription_status === 'enterprise' ? 'Enterprise'
      : profile?.subscription_status === 'growth' ? 'Growth'
        : profile?.subscription_status === 'starter' ? 'Starter'
          : 'Free';

  // FIX: revoked_at === null means ACTIVE (not revoked)
  const isRevoked = (key: ApiKeyDisplay) => key.revoked_at !== null;

  const activeKeys = apiKeys.filter(k => !isRevoked(k));
  const revokedKeys = apiKeys.filter(k => isRevoked(k));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Manage your account and API keys.</p>
      </div>

      {/* Profile */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <User className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold">Profile</h2>
            <p className="text-text-muted text-sm">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={updateProfile} className="space-y-4">
          <div>
            <label htmlFor="full-name" className="block text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary outline-none focus:border-accent"
              placeholder="Your name"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <span className="text-xs text-text-muted">
              Plan: <span className="font-semibold text-accent">{planName}</span>
            </span>
          </div>
          {message && (
            <p className={`text-sm ${message.includes('success') ? 'text-success' : 'text-danger'}`}>
              {message}
            </p>
          )}
        </form>
      </div>

      {/* API Keys */}
      <div className="glass-panel rounded-2xl p-6 glow-border">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Key className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 className="font-semibold text-foreground">API Keys</h2>        <p className="text-muted-foreground text-xs">
            {isEnterprise
              ? 'Manage keys for programmatic access to the WCAG Scanner API.'
              : 'Upgrade to Enterprise to access the developer API.'}
          </p>
      </div>
    </div>
  </div>


        {!isEnterprise ? (
          <div className="bg-surface-elevated/50 border border-border rounded-lg p-4 text-center">
            <p className="text-text-secondary text-sm mb-2">API access is available on the Enterprise plan.</p>
            <a
              href="/pricing"
              className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover font-medium"
            >
              See Enterprise →
            </a>
          </div>
        ) : keysLoading ? (
          <div className="text-center py-4">
            <span className="inline-block w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Newly created key banner */}
            {newlyCreatedKey && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-success mb-1">API Key Created</p>
                    <p className="text-xs text-text-muted mb-2">
                      Copy this key now. You won't be able to see it again.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs font-mono text-text-primary break-all">
                        {showKey ? newlyCreatedKey : newlyCreatedKey.substring(0, 10) + '...'}
                      </code>
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="p-1.5 text-text-muted hover:text-text-primary"
                        title={showKey ? 'Hide' : 'Show'}
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(newlyCreatedKey)}
                        className="p-1.5 text-text-muted hover:text-text-primary"
                        title="Copy"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setNewlyCreatedKey(null); setShowKey(false); }}
                        className="text-xs text-text-muted hover:text-text-primary"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create form */}
            {showCreateForm && (
              <div className="bg-surface-elevated/50 border border-border rounded-lg p-4">
                <label className="block text-sm font-medium mb-2">Key Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. CI/CD Pipeline"
                    className="flex-1 px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary outline-none focus:border-accent text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                  />
                  <button
                    onClick={handleCreateKey}
                    disabled={creating || !newKeyName.trim()}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Active Keys */}
            <div>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Active Keys ({activeKeys.length})
              </h3>
              {activeKeys.length === 0 && !showCreateForm ? (
                <div className="text-center py-4">
                  <p className="text-text-secondary text-sm mb-3">No active API keys.</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create API Key
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between bg-surface-elevated/50 border border-border rounded-lg p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{key.name}</span>
                          {/* FIX: Show ACTIVE badge when NOT revoked */}
                          <span className="text-[10px] font-medium uppercase text-success border border-success/30 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        </div>
                        <p className="text-xs text-text-muted font-mono mt-0.5">{key.prefix}...</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {key.tier} • {key.rate_limit}/hr • Created {new Date(key.created_at).toLocaleDateString()}
                          {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      {/* FIX: Show trash button for ACTIVE keys */}
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="p-2 text-text-muted hover:text-danger transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revoked Keys */}
            {revokedKeys.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Revoked Keys ({revokedKeys.length})
                </h3>
                <div className="space-y-2 opacity-60">
                  {revokedKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between bg-surface-elevated/30 border border-border rounded-lg p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{key.name}</span>
                          <span className="text-[10px] font-medium uppercase text-danger border border-danger/30 px-1.5 py-0.5 rounded">
                            Revoked
                          </span>
                        </div>
                        <p className="text-xs text-text-muted font-mono mt-0.5">{key.prefix}...</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          Revoked {new Date(key.revoked_at!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!showCreateForm && activeKeys.length > 0 && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full py-2 border-2 border-dashed border-border rounded-lg text-sm text-text-muted hover:text-text-primary hover:border-accent/50 transition-colors"
              >
                + New API Key
              </button>
            )}

            {/* Usage hint */}
            {apiKeys.length > 0 && (
              <div className="bg-surface-elevated/30 border border-border rounded-lg p-3">
                <p className="text-xs text-text-muted">
                  <strong className="text-text-secondary">Usage:</strong> Send the key as the{' '}
                  <code className="bg-background px-1 rounded text-accent">Authorization: Bearer YOUR_KEY</code> header to{' '}
                  <code className="bg-background px-1 rounded text-accent">POST /api/v1/scan</code>{' '}
                  with a JSON body containing <code className="bg-background px-1 rounded text-accent">{'{"url": "..."}'}</code>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-surface border border-danger/20 rounded-xl p-6">
        <h2 className="font-semibold mb-2 text-danger">Danger Zone</h2>
        <p className="text-text-secondary text-sm mb-4">
          Sign out from your account. Your data will be preserved.
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}