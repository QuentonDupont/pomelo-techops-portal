// src/hooks/useDocumentManager.js
// Custom React hook that manages upload queue, filters, selection, export, pagination, and bookmarks.

import { useState, useCallback, useEffect } from 'react';
import { listDocs, uploadDocs, bulkExportDocs } from '../api/docsApi.js';

const BOOKMARKS_KEY = 'pomelo_doc_bookmarks';

const DEFAULT_FILTERS = { search: '', category: 'All', format: '', status: 'Active', dateFrom: '', dateTo: '' };
const DEFAULT_QUEUE_ITEM = { id: '', file: null, status: 'queued', progress: 0, error: null, category: 'Other', title: '', description: '', tags: '', author: '', version: '1.0', visibility: 'Public' };

// ─── Auto-categorization rules ────────────────────────────────────────────────
const CATEGORY_RULES = [
  { keywords: ['vpn', 'network', 'wifi', 'access', 'firewall', 'connectivity'], category: 'Network & Access' },
  { keywords: ['onboard', 'welcome', 'new employee', 'orientation', 'setup', 'first day'], category: 'Onboarding' },
  { keywords: ['password', 'mfa', 'security', '2fa', 'auth', 'compliance'], category: 'Security' },
  { keywords: ['software', 'app', 'license', 'install', 'saas', 'request'], category: 'Software & Apps' },
  { keywords: ['hardware', 'laptop', 'device', 'equipment', 'replacement'], category: 'Hardware' },
  { keywords: ['backup', 'storage', 'data', 'recovery', 'archive'], category: 'Data & Storage' },
  { keywords: ['policy', 'procedure', 'standard', 'guideline', 'sla'], category: 'Policies' },
];

export const autoDetectCategory = (filename) => {
  const lower = filename.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) return rule.category;
  }
  return 'Other';
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export default function useDocumentManager() {
  // Docs + pagination
  const [docs, setDocs]           = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [docsError, setDocsError] = useState(null);

  // Filters
  const [filters, setFiltersState] = useState(DEFAULT_FILTERS);

  // Upload queue
  const [queue, setQueue]               = useState([]);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSummary, setUploadSummary]   = useState(null);

  // Selection (for bulk ops)
  const [selectedIds, setSelectedIds] = useState([]);

  // Bookmarks (persisted to localStorage)
  const [bookmarks, setBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || []; }
    catch { return []; }
  });

  // Export state
  const [exportLoading, setExportLoading] = useState(false);

  // ─── Load docs ─────────────────────────────────────────────────────────────
  const loadDocs = useCallback(async (overrideFilters) => {
    setLoading(true);
    setDocsError(null);
    const f = { ...(overrideFilters || filters), page };
    const { data, error } = await listDocs(f);
    setLoading(false);
    if (error) { setDocsError(error); return; }
    setDocs(data.docs);
    setTotalDocs(data.total);
  }, [filters, page]);

  useEffect(() => { loadDocs(); }, [filters, page]);

  // ─── Filter management ─────────────────────────────────────────────────────
  const setFilter = useCallback((key, value) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  // ─── Queue management ──────────────────────────────────────────────────────
  const addToQueue = useCallback((files) => {
    const newItems = Array.from(files).map(file => ({
      ...DEFAULT_QUEUE_ITEM,
      id: 'q-' + Date.now() + '-' + Math.random(),
      file,
      title: file.name.replace(/\.[^.]+$/, ''),
      category: autoDetectCategory(file.name),
      autoDetected: true,
    }));
    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const removeFromQueue = useCallback((id) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setUploadSummary(null);
    setUploadProgress(0);
  }, []);

  const updateQueueItem = useCallback((id, updates) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates, autoDetected: false } : item));
  }, []);

  const setBulkCategory = useCallback((category) => {
    setQueue(prev => prev.map(item => ({ ...item, category, autoDetected: false })));
  }, []);

  const removeErrored = useCallback(() => {
    setQueue(prev => prev.filter(item => item.status !== 'error'));
  }, []);

  // ─── Upload ────────────────────────────────────────────────────────────────
  const uploadAll = useCallback(async () => {
    const pending = queue.filter(item => item.status === 'queued' || item.status === 'error');
    if (!pending.length) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadSummary(null);

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading', progress: 0 } : q));

      const { data, error } = await uploadDocs([item], (p) => {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: p } : q));
        setUploadProgress(Math.round(((i + p / 100) / pending.length) * 100));
      });

      if (error) {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error } : q));
        failed++;
      } else {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'complete', progress: 100 } : q));
        succeeded++;
      }
    }

    setUploading(false);
    setUploadProgress(100);
    setUploadSummary({ succeeded, failed });
    loadDocs();
  }, [queue, loadDocs]);

  const uploadSelected = useCallback(async (ids) => {
    setQueue(prev => prev.map(item =>
      ids.includes(item.id) ? item : { ...item, status: item.status === 'queued' ? 'skipped' : item.status }
    ));
    await uploadAll();
  }, [uploadAll]);

  // ─── Export ────────────────────────────────────────────────────────────────
  const bulkExport = useCallback(async (ids, format, onDone) => {
    setExportLoading(true);
    const { data, error } = await bulkExportDocs(ids);
    setExportLoading(false);
    if (error || !data) return;
    onDone?.(data, format);
  }, []);

  // ─── Selection ─────────────────────────────────────────────────────────────
  const toggleSelected = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => setSelectedIds(docs.map(d => d.id)), [docs]);
  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ─── Bookmarks ─────────────────────────────────────────────────────────────
  const toggleBookmark = useCallback((id) => {
    setBookmarks(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isBookmarked = useCallback((id) => bookmarks.includes(id), [bookmarks]);

  return {
    // Docs
    docs, totalDocs, loading, docsError, loadDocs,
    // Filters
    filters, setFilter, resetFilters,
    // Pagination
    page, setPage,
    // Queue
    queue, addToQueue, removeFromQueue, clearQueue, updateQueueItem, setBulkCategory, removeErrored,
    // Upload
    uploading, uploadProgress, uploadSummary, uploadAll, uploadSelected,
    // Selection
    selectedIds, toggleSelected, selectAll, clearSelection,
    // Bookmarks
    bookmarks, toggleBookmark, isBookmarked,
    // Export
    exportLoading, bulkExport,
  };
}
