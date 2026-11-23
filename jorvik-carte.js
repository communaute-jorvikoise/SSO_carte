(function () {
  const VERSION = "0.1.2";
  const MAX_COORD = 408;
  const MAX_SIZE_PX = 1192;
  const BG_COLOR = "#645F58";
  const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

  function getScriptBaseUrl() {
    const currentScript =
      document.currentScript ||
      document.querySelector('script[src*="jorvik-carte.js"]');
    if (!currentScript || !currentScript.src) {
      return "https://communaute-jorvikoise.github.io/SSO_carte/";
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
      if (window.L && typeof window.L.map === "function") {
        callback();
      } else {
        existingScript.addEventListener("load", callback, { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.addEventListener("load", callback, { once: true });
    document.head.appendChild(script);
  }

  function toIntCoord(val) {
    return Math.max(0, Math.min(MAX_COORD, Math.round(val)));
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

    // Taille carrée responsive : max 1192px, s'adapte à l'espace disponible / mobile
    container.style.setProperty("position", "relative", "important");
    container.style.setProperty("overflow", "hidden", "important");
    container.style.setProperty("width", "100%", "important");
    container.style.setProperty("max-width", `${MAX_SIZE_PX}px`, "important");
    container.style.setProperty("aspect-ratio", "1 / 1", "important");
    container.style.setProperty("height", "auto", "important");
    container.style.setProperty("border-radius", "0px", "important");
    container.style.setProperty("background-color", BG_COLOR, "important");

    const mapDiv = document.createElement("div");
    mapDiv.style.setProperty("width", "100%", "important");
    mapDiv.style.setProperty("height", "100%", "important");
    mapDiv.style.setProperty("border-radius", "0px", "important");
    mapDiv.style.setProperty("background-color", BG_COLOR, "important");
    container.appendChild(mapDiv);

    // Affichage des coordonnées entières uniquement, sans coins arrondis
    const hud = document.createElement("div");
    hud.textContent = "X: — , Y: —";
    hud.style.setProperty("position", "absolute", "important");
    hud.style.setProperty("left", "10px", "important");
    hud.style.setProperty("bottom", "10px", "important");
    hud.style.setProperty("z-index", "500", "important");
    hud.style.setProperty("padding", "4px 10px", "important");
    hud.style.setProperty("border-radius", "0px", "important");
    hud.style.setProperty("background-color", "rgba(100, 95, 88, 0.92)", "important");
    hud.style.setProperty("color", "#ffffff", "important");
    hud.style.setProperty("font-family", "monospace", "important");
    hud.style.setProperty("font-size", "13px", "important");
    hud.style.setProperty("pointer-events", "none", "important");
    container.appendChild(hud);

    const JorvikCRS = L.Util.extend({}, L.CRS.Simple, {
      transformation: new L.Transformation(1, 0, 1, 0)
    });

    const bounds = [
      [0, 0],
      [MAX_COORD, MAX_COORD]
    ];

    const map = L.map(mapDiv, {
      crs: JorvikCRS,
      minZoom: -3,
      maxZoom: 4,
      zoomSnap: 0,
      zoomDelta: 0.5,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      attributionControl: false
    });

    L.imageOverlay(imageUrl, bounds).addTo(map);

    function syncSquareSize() {
      const rect = container.getBoundingClientRect();
      const availableWidth = Math.min(MAX_SIZE_PX, Math.max(200, rect.width || MAX_SIZE_PX));
      const sizePx = Math.round(availableWidth);

      container.style.setProperty("width", `${sizePx}px`, "important");
      container.style.setProperty("height", `${sizePx}px`, "important");
      mapDiv.style.setProperty("width", `${sizePx}px`, "important");
      mapDiv.style.setProperty("height", `${sizePx}px`, "important");

      map.invalidateSize({ animate: false });

      // Zoom exact pour que [0..408] remplisse exactement sizePx x sizePx
      const exactZoom = Math.log2(sizePx / MAX_COORD);
      map.setMinZoom(exactZoom);
      map.setView([MAX_COORD / 2, MAX_COORD / 2], exactZoom, { animate: false });
    }

    syncSquareSize();
    setTimeout(syncSquareSize, 150);
    window.addEventListener("resize", syncSquareSize);

    map.on("mousemove", (e) => {
      const x = toIntCoord(e.latlng.lng);
      const y = toIntCoord(e.latlng.lat);
      hud.textContent = `X: ${x} , Y: ${y}`;
    });

    map.on("click", (e) => {
      const x = toIntCoord(e.latlng.lng);
      const y = toIntCoord(e.latlng.lat);
      console.log(
        `[Jorvik Carte] Filtres actifs: ${rawFilters.join(", ")} -> { "x": ${x}, "y": ${y} }`
      );
      L.popup()
        .setLatLng([y, x])
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