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

import { createContext, useContext, useReducer, useCallback } from 'react';

const NotificationContext = createContext(null);

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
      return { notifications: [] };
    case 'SEED':
      return { notifications: action.payload };
    default:
      return state;
  }
}

export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { notifications: [] });

  const addNotification = useCallback(payload => dispatch({ type: 'ADD', payload }), []);
  const markRead = useCallback(id => dispatch({ type: 'MARK_READ', id }), []);
  const markAllRead = useCallback(() => dispatch({ type: 'MARK_ALL_READ' }), []);
  const clearAll = useCallback(() => dispatch({ type: 'CLEAR_ALL' }), []);
  const seedNotifications = useCallback(items => dispatch({ type: 'SEED', payload: items }), []);

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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
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
