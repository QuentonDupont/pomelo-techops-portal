// src/components/docs/studio/diff.js
// Minimal LCS-based line diff for the version-history viewer.
// Returns [{ type: 'eq' | 'add' | 'del', text }] comparing `oldText` → `newText`.

export function lineDiff(oldText, newText) {
  const a = String(oldText || '').split('\n');
  const b = String(newText || '').split('\n');
  const n = a.length;
  const m = b.length;

  // LCS length table.
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'eq', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: a[i] });
      i++;
    } else {
      out.push({ type: 'add', text: b[j] });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: 'del', text: a[i] });
    i++;
  }
  while (j < m) {
    out.push({ type: 'add', text: b[j] });
    j++;
  }
  return out;
}

export const diffStats = diff => ({
  added: diff.filter(d => d.type === 'add').length,
  removed: diff.filter(d => d.type === 'del').length,
});
