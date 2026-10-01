const M3U_URL = "https://raw.githubusercontent.com/JMigue85/IPTV-SV/refs/heads/main/IPTVSV.m3u";

let cachedCategorias = null;
let lastFetch = 0;

async function getCategorias() {
  if (cachedCategorias && (Date.now() - lastFetch < 300000)) {
    return cachedCategorias;
  }

  const res = await kino.fetch(M3U_URL);
  if (!res.ok) return [];

  const text = await res.text();
  const lines = text.split('\n');

  const categoriasMap = new Map();
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Ignorar líneas de opciones VLC, KODIPROP, etc.
    if (line.startsWith('#EXTVLCOPT') || line.startsWith('#KODIPROP')) continue;

    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const titleMatch = line.split(',').pop();

    currentItem = {
      id: `ch-${i}`,
      title: titleMatch ? titleMatch.trim() : "Canal Desconocido",
      kind: "live",
      poster: logoMatch && logoMatch[1] ? logoMatch[1] : "https://raw.githubusercontent.com/ice-dev-x/premiunTV/main/icon.png",
      _groupName: groupMatch ? groupMatch[1].trim() : "Otros"
    };

    } else if (line.startsWith('http') && currentItem) {
      currentItem.ref = line;

      const groupName = currentItem._groupName;
      const groupId = groupName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!categoriasMap.has(groupId)) {
        categoriasMap.set(groupId, { id: groupId, title: groupName, items: [] });
      }

      delete currentItem._groupName;
      categoriasMap.get(groupId).items.push(currentItem);
      currentItem = null;

    } else if (line.startsWith('#') && currentItem && !line.startsWith('#EXTINF')) {
      // Cualquier otra línea de directiva desconocida: ignorar pero mantener currentItem
      continue;
    }
  }

  cachedCategorias = Array.from(categoriasMap.values());
  lastFetch = Date.now();
  return cachedCategorias;
}

export async function home() {
  const categorias = await getCategorias();
  return categorias.map(cat => ({
    id: `row-${cat.id}`,
    title: cat.title,
    items: cat.items
  }));
}

export async function liveCategories() {
  const categorias = await getCategorias();
  return categorias.map(cat => ({
    id: cat.id,
    title: cat.title
  }));
}

export async function liveChannels({ categoryId }) {
  const categorias = await getCategorias();
  const categoria = categorias.find(c => c.id === categoryId);
  return { items: categoria ? categoria.items : [] };
}

export async function resolve(ref) {
  return {
    url: ref,
    headers: {
      "User-Agent": "VLC/3.0.16 LibVLC/3.0.16"
    }
  };
}