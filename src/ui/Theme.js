// Theme: as cores do canvas (HUD, cartões, código, sequenciador).
// NÃO se mudam aqui: são lidas das variáveis de :root em styles.css, para cada cor estar
// num só sítio. Os valores abaixo só servem quando o styles.css não está carregado (test.html).

// --variável do CSS -> [r, g, b]; fallback quando a variável não existe
function cssColor(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
    if (!m) return fallback;
    const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } catch (e) {
    return fallback;
  }
}

const W = [255, 255, 255];
export const Theme = {
  bg: cssColor('bg', [0, 0, 0]), panel: cssColor('panel', [0, 0, 0]), card: cssColor('card', [0, 0, 0]),
  text: cssColor('text', [228, 228, 228]), bright: cssColor('bright', W), dim: cssColor('dim', [150, 150, 150]),
  faint: cssColor('faint', [62, 62, 62]), accent: cssColor('accent', W), err: cssColor('err', [255, 90, 74]),
  mood: cssColor('mood', [235, 235, 235]),
  // code: numbers brightest (they're draggable), punctuation and comments dimmest
  str: cssColor('code-str', [196, 196, 196]), num: cssColor('code-num', W), kw: cssColor('code-kw', [238, 238, 238]),
  live: cssColor('code-live', W), comment: cssColor('code-comment', [118, 118, 118]),
  roles: {
    drums: cssColor('role-drums', W), perc: cssColor('role-perc', W), bass: cssColor('role-bass', W),
    keys: cssColor('role-keys', W), lead: cssColor('role-lead', W), texture: cssColor('role-texture', W),
  },
  font: 'monospace',
  size: { code: 12, small: 11, title: 13 },
};
