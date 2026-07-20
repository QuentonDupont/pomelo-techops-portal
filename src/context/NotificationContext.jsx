// src/context/NotificationContext.jsx
// Global in-memory notification store for the Pomelo TechOps Portal.
// Provides addNotification, markRead, markAllRead, clearAll, and seedNotifications.
//
// Notification shape:
// {
//   id: string (UUID),
//   type: 'ticket_message' | 'doc_edit' | 'doc_upload' | 'status_change',
//   title: string,
//   body: string,
//   ticketId?: string,   — navigate to My Tickets on click
//   docId?: string,      — navigate to Docs on click
//   actorName: string,   — who triggered the event
//   createdAt: Date,
//   read: boolean,
// }

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { API_ENABLED } from '../api/client.js';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/notificationsApi.js';

const NotificationContext = createContext(null);

// Server rows carry a namespaced id so mark-read knows to call the API and
// polling can replace them without touching client-local notifications.
const SERVER_PREFIX = 'srv:';
const isServerId = id => typeof id === 'string' && id.startsWith(SERVER_PREFIX);

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return {
        notifications: [
          { id: crypto.randomUUID(), read: false, createdAt: new Date(), ...action.payload },
          ...state.notifications,
        ],
      };
    case 'MARK_READ':
      return {
        notifications: state.notifications.map(n =>
          n.id === action.id ? { ...n, read: true } : n
        ),
      };
    case 'MARK_ALL_READ':
      return { notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case 'CLEAR_ALL':
      return { notifications: state.notifications.filter(n => isServerId(n.id)) };
    case 'SEED':
      return {
        notifications: [...action.payload, ...state.notifications.filter(n => isServerId(n.id))],
      };
    case 'MERGE_SERVER': {
      const local = state.notifications.filter(n => !isServerId(n.id));
      const merged = [...action.payload, ...local];
      merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { notifications: merged };
    }
    default:
      return state;
  }
}

export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { notifications: [] });

  const addNotification = useCallback(payload => dispatch({ type: 'ADD', payload }), []);
  const markRead = useCallback(id => {
    dispatch({ type: 'MARK_READ', id });
    if (isServerId(id)) markNotificationRead(id.slice(SERVER_PREFIX.length));
  }, []);
  const markAllRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_READ' });
    if (API_ENABLED) markAllNotificationsRead();
  }, []);
  const clearAll = useCallback(() => dispatch({ type: 'CLEAR_ALL' }), []);
  const seedNotifications = useCallback(items => dispatch({ type: 'SEED', payload: items }), []);

  const syncServerNotifications = useCallback(async () => {
    if (!API_ENABLED) return;
    const { data } = await listNotifications();
    if (!data) return;
    dispatch({
      type: 'MERGE_SERVER',
      payload: (data.notifications || []).map(n => ({
        id: `${SERVER_PREFIX}${n.id}`,
        type: n.type,
        title: n.title,
        body: n.body,
        ticketId: n.ticketKey || n.ticketId || undefined,
        read: n.read,
        createdAt: n.createdAt,
        actorName: 'System',
      })),
    });
  }, []);

  const unreadCount = state.notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications: state.notifications,
        unreadCount,
        addNotification,
        markRead,
        markAllRead,
        clearAll,
        seedNotifications,
        syncServerNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Polls the server feed while `enabled` (i.e. the session is authenticated in
// backend mode). 30s cadence — SLA warnings don't need sub-minute latency.
export function useServerNotificationSync(enabled) {
  const { syncServerNotifications } = useNotifications();
  useEffect(() => {
    if (!enabled || !API_ENABLED) return undefined;
    syncServerNotifications();
    const t = setInterval(syncServerNotifications, 30_000);
    return () => clearInterval(t);
  }, [enabled, syncServerNotifications]);
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

// ─── Relative time formatter ──────────────────────────────────────────────────
export function relativeTime(date) {
  if (!date) return '';
  const diffMs = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return 'Just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Seed generator — produces realistic mock notifications for a given user ──
export function buildSeedNotifications(userName) {
  const now = Date.now();
  const mins = m => new Date(now - m * 60 * 1000);

  // Different seeds depending on who logs in
  const isAdmin = ['Alex Lee', 'Quenton Dupont'].includes(userName);

  if (isAdmin) {
    return [
      {
        id: crypto.randomUUID(),
        read: false,
        createdAt: mins(8),
        type: 'ticket_message',
        title: 'New message on TKT-2026-0042',
        body: "It's the main Pomelo store — pomelo-fashion.myshopify.com",
        actorName: 'You',
        ticketId: 'TKT-2026-0042',
      },
      {
        id: crypto.randomUUID(),
        read: false,
        createdAt: mins(35),
        type: 'ticket_message',
        title: 'New message on TKT-2026-0047',
        body: "The VPN keeps dropping every 20 minutes when I'm on a call.",
        actorName: 'You',
        ticketId: 'TKT-2026-0047',
      },
      {
        id: crypto.randomUUID(),
        read: false,
        createdAt: mins(90),
        type: 'doc_edit',
        title: 'Document updated: VPN Setup Guide',
        body: 'Prim Srisawat made changes to the VPN Setup Guide.',
        actorName: 'Prim Srisawat',
        docId: 'doc-001',
      },
      {
        id: crypto.randomUUID(),
        read: true,
        createdAt: mins(200),
        type: 'status_change',
        title: 'TKT-2026-0038 marked Resolved',
        body: 'Slack notifications not working on mobile has been resolved.',
        actorName: 'Prim Srisawat',
        ticketId: 'TKT-2026-0038',
      },
      {
        id: crypto.randomUUID(),
        read: true,
        createdAt: mins(400),
        type: 'doc_edit',
        title: 'Document updated: IT Security Policy',
        body: 'Alex Lee updated the IT Security Policy — version bumped to 4.0.',
        actorName: 'Alex Lee',
        docId: 'doc-007',
      },
    ];
  }

  // Regular user seed
  return [
    {
      id: crypto.randomUUID(),
      read: false,
      createdAt: mins(4),
      type: 'ticket_message',
      title: 'IT Team replied on TKT-2026-0042',
      body: "Hi, I've received your ticket. Can you confirm which Shopify store you're trying to access?",
      actorName: 'Kai Nguyen',
      ticketId: 'TKT-2026-0042',
    },
    {
      id: crypto.randomUUID(),
      read: false,
      createdAt: mins(22),
      type: 'status_change',
      title: 'TKT-2026-0042 moved to In Progress',
      body: 'Kai Nguyen has started working on your Shopify access issue.',
      actorName: 'Kai Nguyen',
      ticketId: 'TKT-2026-0042',
    },
    {
      id: crypto.randomUUID(),
      read: false,
      createdAt: mins(180),
      type: 'doc_edit',
      title: 'Document updated: New Employee IT Onboarding',
      body: 'The IT Onboarding Guide you rely on has been updated by Prim Srisawat.',
      actorName: 'Prim Srisawat',
      docId: 'doc-002',
    },
    {
      id: crypto.randomUUID(),
      read: true,
      createdAt: mins(1440),
      type: 'ticket_message',
      title: 'IT Team replied on TKT-2026-0038',
      body: 'Glad that resolved it! Marking this ticket as resolved.',
      actorName: 'Prim Srisawat',
      ticketId: 'TKT-2026-0038',
    },
    {
      id: crypto.randomUUID(),
      read: true,
      createdAt: mins(2200),
      type: 'status_change',
      title: 'TKT-2026-0038 marked Resolved',
      body: 'Your Slack notification issue has been resolved.',
      actorName: 'Prim Srisawat',
      ticketId: 'TKT-2026-0038',
    },
  ];
}
