// src/api/docsApi.js
// REST API service layer for the Pomelo TechOps Documentation system.
// All functions fall back to mock data when no backend is available.

import axios from 'axios';
import { MOCK_DOCS } from '../mocks/docsMockData.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCK = !BASE_URL;

// ─── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
const simulateDelay = (ms = 400) => new Promise(r => setTimeout(r, ms));

const errorMessage = (err) => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message) return err.message;
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Wraps an async operation and returns { data, loading, error }.
 * @param {() => Promise<any>} fn
 * @returns {Promise<{ data: any, error: string|null }>}
 */
const wrap = async (fn) => {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
};

// ─── In-memory mock store (mutated on upload/update/delete) ───────────────────
let mockStore = [...MOCK_DOCS];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/docs — List all documents
// @param {{ category?: string, format?: string, search?: string, status?: string, page?: number, limit?: number }} filters
// @returns {{ data: { docs: Doc[], total: number, page: number, pages: number } }}
// ─────────────────────────────────────────────────────────────────────────────
export const listDocs = async (filters = {}) => {
  return wrap(async () => {
    if (USE_MOCK) {
      await simulateDelay(250);
      let result = [...mockStore];
      if (filters.category && filters.category !== 'All')
        result = result.filter(d => d.category === filters.category);
      if (filters.format)
        result = result.filter(d => d.format === filters.format);
      if (filters.status)
        result = result.filter(d => d.status === filters.status);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(d =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          (d.tags || []).some(t => t.toLowerCase().includes(q))
        );
      }
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const start = (page - 1) * limit;
      return {
        docs: result.slice(start, start + limit),
        total: result.length,
        page,
        pages: Math.ceil(result.length / limit),
      };
    }
    const { data } = await api.get('/api/docs', { params: filters });
    return data;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/docs/:id — Get single document
// @param {string} id
// ─────────────────────────────────────────────────────────────────────────────
export const getDoc = async (id) => {
  return wrap(async () => {
    if (USE_MOCK) {
      await simulateDelay(150);
      const doc = mockStore.find(d => d.id === id);
      if (!doc) throw new Error('Document not found.');
      doc.viewCount = (doc.viewCount || 0) + 1;
      return doc;
    }
    const { data } = await api.get(`/api/docs/${id}`);
    return data;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/docs/upload — Upload one or many files
// @param {FormData} formData — contains files[] + metadata
// @param {(progress: number) => void} onProgress
// ─────────────────────────────────────────────────────────────────────────────
export const uploadDocs = async (fileMetaList, onProgress) => {
  return wrap(async () => {
    if (USE_MOCK) {
      const results = [];
      for (let i = 0; i < fileMetaList.length; i++) {
        const item = fileMetaList[i];
        await simulateDelay(600);
        const newDoc = {
          id: 'doc-' + Date.now() + '-' + i,
          title: item.title || item.file.name.replace(/\.[^.]+$/, ''),
          description: item.description || '',
          category: item.category || 'Other',
          format: item.file.name.split('.').pop().toUpperCase(),
          icon: '📄',
          fileSize: item.file.size,
          viewCount: 0,
          version: item.version || '1.0',
          author: item.author || 'Unknown',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: item.tags ? item.tags.split(',').map(t => t.trim()) : [],
          visibility: item.visibility || 'Public',
          status: 'Active',
          content: `# ${item.title || item.file.name}\n\nDocument uploaded via Pomelo TechOps Portal.`,
        };
        mockStore.unshift(newDoc);
        results.push(newDoc);
        onProgress?.(Math.round(((i + 1) / fileMetaList.length) * 100));
      }
      return results;
    }
    const fd = new FormData();
    fileMetaList.forEach(item => fd.append('files', item.file));
    fd.append('meta', JSON.stringify(fileMetaList.map(({ file: _, ...m }) => m)));
    const { data } = await api.post('/api/docs/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress?.(Math.round((e.loaded / e.total) * 100)),
    });
    return data;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/docs/:id — Update document metadata
// @param {string} id
// @param {Partial<Doc>} updates
// ─────────────────────────────────────────────────────────────────────────────
export const updateDoc = async (id, updates) => {
  return wrap(async () => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const idx = mockStore.findIndex(d => d.id === id);
      if (idx === -1) throw new Error('Document not found.');
      mockStore[idx] = { ...mockStore[idx], ...updates, updatedAt: new Date().toISOString() };
      return mockStore[idx];
    }
    const { data } = await api.put(`/api/docs/${id}`, updates);
    return data;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/docs/:id — Soft delete (set status = Archived)
// @param {string} id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteDoc = async (id) => {
  return wrap(async () => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const idx = mockStore.findIndex(d => d.id === id);
      if (idx === -1) throw new Error('Document not found.');
      mockStore[idx] = { ...mockStore[idx], status: 'Archived', updatedAt: new Date().toISOString() };
      return { success: true };
    }
    const { data } = await api.delete(`/api/docs/${id}`);
    return data;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/docs/categories — List categories with counts
// ─────────────────────────────────────────────────────────────────────────────
export const getCategories = async () => {
  return wrap(async () => {
    if (USE_MOCK) {
      await simulateDelay(100);
      const counts = {};
      mockStore
        .filter(d => d.status === 'Active')
        .forEach(d => { counts[d.category] = (counts[d.category] || 0) + 1; });
      return Object.entries(counts).map(([category, count]) => ({ category, count }));
    }
    const { data } = await api.get('/api/docs/categories');
    return data;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/docs/bulk-export — Returns array of doc objects for client-side ZIP
// @param {string[]} ids
// ─────────────────────────────────────────────────────────────────────────────
export const bulkExportDocs = async (ids) => {
  return wrap(async () => {
    if (USE_MOCK) {
      await simulateDelay(500);
      return mockStore.filter(d => ids.includes(d.id));
    }
    const { data } = await api.post('/api/docs/bulk-export', { ids });
    return data;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Restore a document (set status = Active)
// @param {string} id
// ─────────────────────────────────────────────────────────────────────────────
export const restoreDoc = async (id) => updateDoc(id, { status: 'Active' });

// ─────────────────────────────────────────────────────────────────────────────
// Bulk archive
// @param {string[]} ids
// ─────────────────────────────────────────────────────────────────────────────
export const bulkArchive = async (ids) => {
  return wrap(async () => {
    await simulateDelay(400);
    ids.forEach(id => {
      const idx = mockStore.findIndex(d => d.id === id);
      if (idx !== -1) mockStore[idx] = { ...mockStore[idx], status: 'Archived' };
    });
    return { success: true, count: ids.length };
  });
};
