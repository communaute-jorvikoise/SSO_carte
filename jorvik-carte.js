(function () {
  const VERSION = "0.1.0";
  const MAX_COORD = 408;
  const BG_COLOR = "#645F58";
  const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

  function getScriptBaseUrl() {
    const currentScript =
      document.currentScript ||
      document.querySelector('script[src*="jorvik-carte.js"]');
    if (!currentScript || !currentScript.src) {
      return "./";
    }
    const url = new URL(currentScript.src);
    return url.href.slice(0, url.href.lastIndexOf("/") + 1);
  }

  function loadLeaflet(callback) {
    if (window.L && typeof window.L.map === "function") {
      callback();
      return;
    }

    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector('script[src*="leaflet.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", callback, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.defer = true;
    script.addEventListener("load", callback, { once: true });
    document.head.appendChild(script);
  }

  function initMapContainer(container, baseUrl) {
    if (container.dataset.jorvikMapReady === "true") return;
    container.dataset.jorvikMapReady = "true";

    const rawFilters = (container.dataset.filters || "all")
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const imageUrl =
      container.dataset.imageUrl || `${baseUrl}carte_jorvik_vierge.png?v=${VERSION}`;

    // Mise en forme du conteneur avec coins arrondis et fond #645F58
    container.style.position = "relative";
    container.style.overflow = "hidden";
    container.style.borderRadius = container.style.borderRadius || "12px";
    container.style.backgroundColor = BG_COLOR;
    if (!container.style.minHeight) {
      container.style.minHeight = "550px";
    }

    // Zone d'affichage de la carte Leaflet
    const mapDiv = document.createElement("div");
    mapDiv.style.width = "100%";
    mapDiv.style.height = "100%";
    mapDiv.style.minHeight = container.style.minHeight;
    container.appendChild(mapDiv);

    // Barre discrète de coordonnées X, Y en bas à gauche
    const hud = document.createElement("div");
    hud.textContent = "X: — , Y: —";
    hud.style.position = "absolute";
    hud.style.left = "10px";
    hud.style.bottom = "10px";
    hud.style.zIndex = "500";
    hud.style.padding = "4px 10px";
    hud.style.borderRadius = "8px";
    hud.style.backgroundColor = "rgba(100, 95, 88, 0.9)";
    hud.style.color = "#ffffff";
    hud.style.fontFamily = "monospace";
    hud.style.fontSize = "13px";
    hud.style.pointerEvents = "none";
    container.appendChild(hud);

    // CRS personnalisé : (0,0) en haut à gauche, (408,408) en bas à droite
    const JorvikCRS = L.Util.extend({}, L.CRS.Simple, {
      transformation: new L.Transformation(1, 0, 1, 0)
    });

    const bounds = [
      [0, 0],
      [MAX_COORD, MAX_COORD]
    ];

    const map = L.map(mapDiv, {
      crs: JorvikCRS,
      minZoom: -1,
      maxZoom: 3,
      zoomSnap: 0.25,
      attributionControl: false
    });

    L.imageOverlay(imageUrl, bounds).addTo(map);
    map.fitBounds(bounds);

    map.on("mousemove", (e) => {
      const x = Math.max(0, Math.min(MAX_COORD, e.latlng.lng)).toFixed(1);
      const y = Math.max(0, Math.min(MAX_COORD, e.latlng.lat)).toFixed(1);
      hud.textContent = `X: ${x} , Y: ${y}`;
    });

    map.on("click", (e) => {
      const x = Math.max(0, Math.min(MAX_COORD, Math.round(e.latlng.lng)));
      const y = Math.max(0, Math.min(MAX_COORD, Math.round(e.latlng.lat)));
      console.log(`[Jorvik Carte] Filtres actifs: ${rawFilters.join(", ")} -> { "x": ${x}, "y": ${y} }`);
      L.popup()
        .setLatLng([e.latlng.lat, e.latlng.lng])
        .setContent(`Coordonnées : <b>X: ${x}, Y: ${y}</b>`)
        .openOn(map);
    });
  }

  function start() {
    const baseUrl = getScriptBaseUrl();
    const containers = document.querySelectorAll("[data-jorvik-map]");
    if (!containers.length) return;

    loadLeaflet(() => {
      containers.forEach((el) => initMapContainer(el, baseUrl));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();