'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SubdomainConfig } from '@/types';

export default function AdminPage() {
  const [subdomains, setSubdomains] = useState<SubdomainConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState({
    subdomain: '',
    type: 'markdown' as 'redirect' | 'markdown' | 'html',
    content: '',
    title: '',
    description: '',
  });
  const router = useRouter();

  const fetchSubdomains = async () => {
    try {
      const res = await fetch('/api/subdomains');
      if (res.status === 401) {
        router.push('/login?redirect=/admin');
        return;
      }
      const data = await res.json();
      setSubdomains(data);
    } catch (err) {
      console.error('Failed to fetch subdomains:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubdomains();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/subdomains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowNew(false);
        setFormData({ subdomain: '', type: 'markdown', content: '', title: '', description: '' });
        fetchSubdomains();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create');
      }
    } catch {
      alert('Failed to create subdomain');
    }
  };

  const handleUpdate = async (subdomain: string) => {
    try {
      const res = await fetch(`/api/subdomains/${subdomain}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setEditing(null);
        fetchSubdomains();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update');
      }
    } catch {
      alert('Failed to update subdomain');
    }
  };

  const handleDelete = async (subdomain: string) => {
    if (!confirm(`Delete ${subdomain}?`)) return;

    try {
      await fetch(`/api/subdomains/${subdomain}`, { method: 'DELETE' });
      fetchSubdomains();
    } catch {
      alert('Failed to delete');
    }
  };

  const startEdit = (sub: SubdomainConfig) => {
    setEditing(sub.subdomain);
    setFormData({
      subdomain: sub.subdomain,
      type: sub.type,
      content: sub.content,
      title: sub.title || '',
      description: sub.description || '',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">byaxon admin</h1>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-white transition text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Subdomains</h2>
          <button
            onClick={() => {
              setShowNew(true);
              setFormData({ subdomain: '', type: 'markdown', content: '', title: '', description: '' });
            }}
            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition"
          >
            + New Subdomain
          </button>
        </div>

        {/* New Subdomain Form */}
        {showNew && (
          <div className="mb-6 p-6 bg-zinc-900 rounded-lg border border-zinc-800">
            <h3 className="font-medium mb-4">Create New Subdomain</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="subdomain"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase() })}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-zinc-500"
                  pattern="[a-z0-9-]+"
                  required
                />
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'redirect' | 'markdown' | 'html' })}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-zinc-500"
                >
                  <option value="markdown">Markdown</option>
                  <option value="redirect">Redirect</option>
                  <option value="html">HTML</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-zinc-500"
              />
              <textarea
                placeholder={formData.type === 'redirect' ? 'https://example.com' : 'Content...'}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-zinc-500 min-h-[120px] font-mono"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 transition"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="px-4 py-2 bg-zinc-800 text-white text-sm rounded hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subdomains List */}
        <div className="space-y-4">
          {subdomains.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No subdomains yet. Create your first one!
            </div>
          ) : (
            subdomains.map((sub) => (
              <div key={sub.subdomain} className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                {editing === sub.subdomain ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="px-3 py-2 bg-zinc-700 rounded text-sm text-zinc-400">
                        {sub.subdomain}.byaxon.com
                      </div>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'redirect' | 'markdown' | 'html' })}
                        className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm"
                      >
                        <option value="markdown">Markdown</option>
                        <option value="redirect">Redirect</option>
                        <option value="html">HTML</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder="Title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm"
                    />
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm min-h-[120px] font-mono"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(sub.subdomain)}
                        className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-4 py-2 bg-zinc-800 text-white text-sm rounded hover:bg-zinc-700 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium">{sub.subdomain}.byaxon.com</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          sub.type === 'redirect' ? 'bg-blue-900 text-blue-300' :
                          sub.type === 'markdown' ? 'bg-green-900 text-green-300' :
                          'bg-purple-900 text-purple-300'
                        }`}>
                          {sub.type}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-400">
                        {sub.type === 'redirect' ? (
                          <span>→ {sub.content}</span>
                        ) : (
                          <span>{sub.title || 'Untitled'}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(sub)}
                        className="text-zinc-400 hover:text-white text-sm transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(sub.subdomain)}
                        className="text-red-400 hover:text-red-300 text-sm transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
