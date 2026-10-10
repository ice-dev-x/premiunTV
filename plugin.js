const RENAME_MAP = {
  "Anime":                           "🎌 Animé",
  "Música":                          "🎵 Música",
  "Deportes":                        "⚽ Deportes",
  "Cine / Películas":                "🎬 Cine & Películas",
  "Cine / Películas Premium":        "🎬 Cine Premium",
  "Entretenimiento / Cine / Series": "📺 Series & Entretenimiento",
  "Entretenimiento Premium":         "⭐ Entretenimiento Premium",
  "Informativos":                    "📰 Informativos",
  "Documentales y Cultura":          "🎓 Documentales & Cultura",
  "Infantiles":                      "👶 Para Niños",
  "Doramas / Asia":                  "🌸 Doramas & Asia",
  "Fashion":                         "👗 Fashion",
  "Religiosos":                      "⛪ Religiosos",
  "Tecnología":                      "💻 Tecnología",
  "DSports":                         "📡 DSports",
  "FOX Sports":                      "🦊 FOX Sports",
  "Movistar Deportes":               "📡 Movistar Deportes",
  "Sky Sports":                      "🌐 Sky Sports",
  "Tigo Sports / Fox":               "📡 Tigo Sports",
  "Win Sports":                      "🏆 Win Sports",
  "ESPN":                            "🏅 ESPN",
  "FIFA+":                           "⚽ FIFA+",
  "Canela TV":                       "🍿 Canela TV",
  "FreeTV":                          "📺 FreeTV",
  "LG Channels":                     "📺 LG Channels",
  "Rakuten TV":                      "🎥 Rakuten TV",
  "Sony Channels":                   "🎬 Sony Channels",
  "RUN:TIME TV":                     "⏱ RUN:TIME TV",
  "Telemundo Noticias":              "📰 Telemundo Noticias",
  "TV Chichicasteca":                "📡 TV Chichicasteca",
};

let cachedCategorias = null;
let lastFetch = 0;

async function getCategorias() {
  if (cachedCategorias && (Date.now() - lastFetch < 300000)) {
    return cachedCategorias;
  }

  let text;
  try {
    const res = await kino.fetch(M3U_URL);
    if (!res.ok) throw new Error("Fallo al descargar la lista");
    text = await res.text();
  } catch (error) {
    // Si la descarga falla, intentamos devolver la última lista buena guardada
    const backup = await kino.storage.get("backup_categorias");
    return backup || [];
  }

  const lines = text.split('\n');
  const categoriasMap = new Map();
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('#') && !line.startsWith('#EXTINF:')) continue;

    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const titleMatch = line.split(',').pop();
      const rawGroup = groupMatch ? groupMatch[1].trim() : "Otros";

      currentItem = {
        // El id se asignará cuando tengamos la URL en la siguiente línea
        title: titleMatch ? titleMatch.trim() : "Canal Desconocido",
        kind: "live",
        logo: logoMatch && logoMatch[1] ? logoMatch[1] : "https://placehold.co/300x450/222222/ffffff?text=TV",
        _groupName: rawGroup,
        _displayName: RENAME_MAP[rawGroup] || rawGroup,
      };

    } else if (line.startsWith('http') && currentItem) {
      currentItem.ref = line;
      
      // Asignar un ID estable usando la URL del canal para evitar que cambien de posición
      currentItem.id = "ch-" + kino.crypto.hash("sha1", line).slice(0, 16);

      const groupId = `sv-${currentItem._groupName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')}`;

      if (!categoriasMap.has(groupId)) {
        categoriasMap.set(groupId, { id: groupId, title: currentItem._displayName, items: [] });
      }

      delete currentItem._groupName;
      delete currentItem._displayName;
      categoriasMap.get(groupId).items.push(currentItem);
      currentItem = null;
    }
  }

  cachedCategorias = Array.from(categoriasMap.values());
  lastFetch = Date.now();

  // Guardar la lista válida para cuando falle la descarga en el futuro
  try {
    await kino.storage.set("backup_categorias", cachedCategorias);
  } catch (e) {
    // Silenciamos posibles errores de guardado si la API de storage no está lista
  }

  return cachedCategorias;
}

export async function home() {
  const categorias = await getCategorias();
  return categorias.map(cat => ({
    id: `row-${cat.id}`,
    title: cat.title,
    items: cat.items.slice(0, 20)
  }));
}

export async function liveCategories() {
  const categorias = await getCategorias();
  return categorias.map(cat => ({ id: cat.id, title: cat.title }));
}

export async function liveChannels({ categoryId }) {
  const categorias = await getCategorias();
  const categoria = categorias.find(c => c.id === categoryId);
  return { items: categoria ? categoria.items : [] };
}

export async function resolve(ref) {
  let targetUrl = ref;
  
  // Si es un enlace acortado/redirección de jmp2.uk, seguimos el salto HTTP
  if (ref.includes("jmp2.uk")) {
    try {
      const res = await kino.fetch(ref, { 
        redirect: "follow",
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
        }
      });
      if (res.url) {
        targetUrl = res.url;
      }
    } catch (e) {
      // Si falla la redirección, mantenemos el original como respaldo
      targetUrl = ref;
    }
  }

  return {
    url: targetUrl,
    headers: { 
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.samsung.com/" 
    }
  };
}


const _u = "aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS9pY2UtZGV2LXgvODg1NzAyNGIxOGNlZmQxODdiYjViZWE5MWVkNDg2ZDEvcmF3LzA3YjYxZmVjMzU5OTg5YjdlM2M4YzFiOWJhNThjMjZjYTkxMTZkZDUvbGlzdGEubTN1";
const M3U_URL = typeof atob === "function" 
  ? atob(_u) 
  : Buffer.from(_u, "base64").toString("utf-8");