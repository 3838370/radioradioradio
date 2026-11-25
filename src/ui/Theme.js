// Theme: 1-bit, like an old handheld screen. Pure black and white, with a few greys for
// hierarchy; red only for errors. The HTML side uses the same values as CSS variables in
// index.html.
RA.Theme = {
  bg: [0, 0, 0], panel: [0, 0, 0], card: [0, 0, 0],
  text: [228, 228, 228], bright: [255, 255, 255], dim: [150, 150, 150], faint: [62, 62, 62],
  accent: [255, 255, 255], err: [255, 90, 74], mood: [235, 235, 235],
  // code: numbers brightest (they're draggable), punctuation and comments dimmest
  str: [196, 196, 196], num: [255, 255, 255], kw: [238, 238, 238], live: [255, 255, 255], comment: [118, 118, 118],
  roles: {
    drums: [255, 255, 255], perc: [255, 255, 255], bass: [255, 255, 255],
    keys: [255, 255, 255], lead: [255, 255, 255], texture: [255, 255, 255],
  },
  flavours: { saw: [228, 228, 228], acid: [228, 228, 228], drill: [228, 228, 228], boc: [228, 228, 228], minimal: [228, 228, 228], dub: [228, 228, 228], space: [228, 228, 228], dark: [228, 228, 228], ae: [228, 228, 228] },
  font: 'monospace',
  size: { code: 12, small: 11, title: 13 },
};
