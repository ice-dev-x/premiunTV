const M3U_URL = "http://190.60.32.178:8178/playlist.m3u";

export async function home() {
  return [];
}

export async function liveCategories() {
  return [{
    playlist: {
      url: M3U_URL,
      format: "m3u",
      streamHeaders: {
        "User-Agent": "ExoPlayer/2.18.1 (Linux;Android 11)"
      }
    }
  }];
}

export async function liveChannels() {
  return { items: [] };
}

export async function resolve(ref) {
  return {
    url: ref,
    headers: {
      "User-Agent": "ExoPlayer/2.18.1 (Linux;Android 11)"
    }
  };
}