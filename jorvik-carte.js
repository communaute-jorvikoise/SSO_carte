(function () {
  const VERSION = "0.1.1";
  const MAX_COORD = 408;
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

  function clampCoord(val) {
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

    // Cadre carré sans coins arrondis et sans espaces vides latéraux
    container.style.position = "relative";
    container.style.overflow = "hidden";
    container.style.aspectRatio = "1 / 1";
    container.style.width = container.style.width || "100%";
    container.style.maxWidth = container.style.maxWidth || "720px";
    container.style.height = "auto";
    container.style.borderRadius = "0px";
    container.style.backgroundColor = BG_COLOR;

    const mapDiv = document.createElement("div");
    mapDiv.style.width = "100%";
    mapDiv.style.height = "100%";
    mapDiv.style.borderRadius = "0px";
    mapDiv.style.backgroundColor = BG_COLOR;
    container.appendChild(mapDiv);

    // Affichage des coordonnées entières en bas à gauche, sans coins arrondis
    const hud = document.createElement("div");
    hud.textContent = "X: — , Y: —";
    hud.style.position = "absolute";
    hud.style.left = "10px";
    hud.style.bottom = "10px";
    hud.style.zIndex = "500";
    hud.style.padding = "4px 10px";
    hud.style.borderRadius = "0px";
    hud.style.backgroundColor = "rgba(100, 95, 88, 0.92)";
    hud.style.color = "#ffffff";
    hud.style.fontFamily = "monospace";
    hud.style.fontSize = "13px";
    hud.style.pointerEvents = "none";
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
      minZoom: -2,
      maxZoom: 3,
      zoomSnap: 0.25,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      attributionControl: false
    });

    L.imageOverlay(imageUrl, bounds).addTo(map);

    function fitSquareMap() {
      map.invalidateSize();
      const minZoom = map.getBoundsZoom(bounds, true);
      map.setMinZoom(minZoom);
      map.fitBounds(bounds, { padding: [0, 0], animate: false });
    }

    fitSquareMap();
    setTimeout(fitSquareMap, 150);
    window.addEventListener("resize", fitSquareMap);

    map.on("mousemove", (e) => {
      const x = clampCoord(e.latlng.lng);
      const y = clampCoord(e.latlng.lat);
      hud.textContent = `X: ${x} , Y: ${y}`;
    });

    map.on("click", (e) => {
      const x = clampCoord(e.latlng.lng);
      const y = clampCoord(e.latlng.lat);
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