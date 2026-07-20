// src/components/assets/AssetDetailDrawer.jsx
// Right-hand drawer for one asset: metadata, assignment history, linked
// tickets, and (with assets.manage) link/unlink by ticket key.

import { useState } from 'react';
import { X, Link2, History, Ticket } from 'lucide-react';
import { S } from '../../lib/styles.js';
import { linkAssetTicket, unlinkAssetTicket, getAsset } from '../../api/assetsApi.js';
import { listTickets } from '../../api/ticketsApi.js';
import { ASSET_STATUS_META, ASSET_TYPE_LABEL } from './AssetsPage.jsx';

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 18, 30, 0.35)',
  zIndex: 1100,
};
const drawer = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  width: '440px',
  maxWidth: '92vw',
  background: 'var(--bg-elevated)',
  borderLeft: '1px solid var(--border-default)',
  boxShadow: '-12px 0 32px rgba(0,0,0,0.12)',
  zIndex: 1101,
  overflowY: 'auto',
  padding: '22px',
};
const sectionTitle = {
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  margin: '18px 0 8px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

export default function AssetDetailDrawer({ detail, onClose, canManage, onToast }) {
  const [data, setData] = useState(detail);
  const [linkKey, setLinkKey] = useState('');
  const { asset, history, tickets } = data;
  const meta = ASSET_STATUS_META[asset.status] || ASSET_STATUS_META['in-stock'];

  const refresh = async () => {
    const { data: fresh } = await getAsset(asset.id);
    if (fresh) setData(fresh);
  };

  const doLink = async () => {
    const key = linkKey.trim().toUpperCase();
    if (!key) return;
    const { data: found, error } = await listTickets({ search: key, limit: 5 });
    if (error) return onToast?.(error, 'error');
    const match = (found.tickets || []).find(t => t.key === key);
    if (!match) return onToast?.(`No ticket ${key} found.`, 'error');
    const { error: linkErr } = await linkAssetTicket(asset.id, match.id);
    if (linkErr) return onToast?.(linkErr, 'error');
    onToast?.(`${asset.tag} linked to ${key}.`);
    setLinkKey('');
    refresh();
  };

  const rows = [
    ['Type', ASSET_TYPE_LABEL[asset.type]],
    ['Serial', asset.serial],
    ['Model', asset.model],
    ['Vendor', asset.vendor],
    ['Purchased', asset.purchaseDate ? String(asset.purchaseDate).slice(0, 10) : null],
    ['Warranty until', asset.warrantyExpires ? String(asset.warrantyExpires).slice(0, 10) : null],
    ['Cost', asset.cost != null ? `$${Number(asset.cost).toLocaleString()}` : null],
    ['Notes', asset.notes],
  ].filter(([, v]) => v);

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={drawer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {asset.tag}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {asset.name}
            </div>
            <div style={{ marginTop: '6px' }}>
              <span style={S.badge(meta.color)}>{meta.label}</span>
              {asset.assigneeEmail && (
                <span
                  style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}
                >
                  → {asset.assigneeName || asset.assigneeEmail}
                </span>
              )}
            </div>
          </div>
          <button
            style={{ ...S.ghostBtn, padding: '5px 8px' }}
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ ...S.card, marginTop: '16px', padding: '14px' }}>
          {rows.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                fontSize: '12.5px',
                padding: '4px 0',
              }}
            >
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
              <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{v}</span>
            </div>
          ))}
          {!rows.length && (
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              No additional details.
            </div>
          )}
        </div>

        <div style={sectionTitle}>
          <Ticket size={13} /> Linked tickets
        </div>
        {tickets.length ? (
          tickets.map(t => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                marginBottom: '6px',
              }}
            >
              <div style={{ fontSize: '12.5px', minWidth: 0 }}>
                <b style={{ color: 'var(--accent-primary)' }}>{t.key}</b>{' '}
                <span style={{ color: 'var(--text-primary)' }}>{t.title}</span>
                <span style={{ color: 'var(--text-muted)' }}> · {t.status}</span>
              </div>
              {canManage && (
                <button
                  style={{ ...S.ghostBtn, padding: '3px 8px', fontSize: '11.5px' }}
                  onClick={async () => {
                    const { error } = await unlinkAssetTicket(asset.id, t.id);
                    if (error) return onToast?.(error, 'error');
                    refresh();
                  }}
                >
                  Unlink
                </button>
              )}
            </div>
          ))
        ) : (
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No linked tickets.</div>
        )}
        {canManage && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              style={{ ...S.input, flex: 1 }}
              placeholder="TKT-2026-0000"
              value={linkKey}
              onChange={e => setLinkKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLink()}
            />
            <button style={{ ...S.ghostBtn }} onClick={doLink}>
              <Link2 size={13} style={{ marginRight: '5px', verticalAlign: '-2px' }} />
              Link
            </button>
          </div>
        )}

        <div style={sectionTitle}>
          <History size={13} /> Assignment history
        </div>
        {history.length ? (
          history.map(h => (
            <div
              key={h.id}
              style={{
                fontSize: '12.5px',
                padding: '7px 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {h.userName || h.userEmail}
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                {new Date(h.assignedAt).toLocaleDateString()} →{' '}
                {h.returnedAt ? new Date(h.returnedAt).toLocaleDateString() : 'current'}
                {h.assignedBy ? ` · by ${h.assignedBy}` : ''}
              </div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Never assigned.</div>
        )}
      </div>
    </>
  );
}
