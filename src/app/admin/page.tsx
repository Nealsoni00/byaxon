'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SubdomainConfig } from '@/types';

interface ImageInfo {
  url: string;
  pathname: string;
  uploadedAt: string;
  size: number;
}

export default function AdminPage() {
  const [subdomains, setSubdomains] = useState<SubdomainConfig[]>([]);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'subdomains' | 'images'>('subdomains');
  const [uploading, setUploading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    subdomain: '',
    type: 'markdown' as 'redirect' | 'markdown' | 'html' | 'iframe',
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
      setSubdomains(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch subdomains:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/images');
      if (res.ok) {
        const data = await res.json();
        setImages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch images:', err);
    }
  };

  useEffect(() => {
    fetchSubdomains();
    fetchImages();
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Copy markdown to clipboard
        await navigator.clipboard.writeText(data.markdown);
        setCopiedUrl(data.url);
        setTimeout(() => setCopiedUrl(null), 3000);
        fetchImages();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to upload');
      }
    } catch {
      alert('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (url: string) => {
    if (!confirm('Delete this image?')) return;

    try {
      await fetch('/api/images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      fetchImages();
    } catch {
      alert('Failed to delete image');
    }
  };

  const copyMarkdown = async (url: string, name: string) => {
    const markdown = `![${name}](${url})`;
    await navigator.clipboard.writeText(markdown);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('subdomains')}
            className={`pb-3 px-1 text-sm font-medium transition ${
              activeTab === 'subdomains'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Subdomains
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`pb-3 px-1 text-sm font-medium transition ${
              activeTab === 'images'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Images
          </button>
        </div>

        {activeTab === 'subdomains' && (
          <>
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
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'redirect' | 'markdown' | 'html' | 'iframe' })}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-zinc-500"
                    >
                      <option value="markdown">Markdown</option>
                      <option value="redirect">Redirect</option>
                      <option value="html">HTML</option>
                      <option value="iframe">iFrame</option>
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
                    placeholder={formData.type === 'redirect' || formData.type === 'iframe' ? 'https://example.com' : 'Content... (use ![alt](url) for images)'}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-zinc-500 min-h-[200px] font-mono"
                    required
                  />
                  <p className="text-xs text-zinc-500">
                    Tip: Upload images in the Images tab and copy the markdown reference
                  </p>
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
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'redirect' | 'markdown' | 'html' | 'iframe' })}
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
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm min-h-[200px] font-mono"
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
                              sub.type === 'iframe' ? 'bg-orange-900 text-orange-300' :
                              'bg-purple-900 text-purple-300'
                            }`}>
                              {sub.type}
                            </span>
                          </div>
                          <div className="text-sm text-zinc-400">
                            {sub.type === 'redirect' ? (
                              <span>→ {sub.content}</span>
                            ) : sub.type === 'iframe' ? (
                              <span>⧉ {sub.content}</span>
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
          </>
        )}

        {activeTab === 'images' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Images</h2>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className={`px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition cursor-pointer inline-block ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploading ? 'Uploading...' : '+ Upload Image'}
                </label>
              </div>
            </div>

            <p className="text-sm text-zinc-400 mb-6">
              Upload images and click to copy the markdown reference. Paste it into your subdomain content.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.length === 0 ? (
                <div className="col-span-full text-center py-12 text-zinc-500">
                  No images uploaded yet.
                </div>
              ) : (
                images.map((img) => (
                  <div
                    key={img.url}
                    className="relative group bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden"
                  >
                    <img
                      src={img.url}
                      alt={img.pathname}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        onClick={() => copyMarkdown(img.url, img.pathname.split('/').pop() || 'image')}
                        className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-zinc-200 transition"
                      >
                        {copiedUrl === img.url ? 'Copied!' : 'Copy MD'}
                      </button>
                      <button
                        onClick={() => handleDeleteImage(img.url)}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-500 transition"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-zinc-400 truncate">
                        {img.pathname.split('/').pop()}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {formatBytes(img.size)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
