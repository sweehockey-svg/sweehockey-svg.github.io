const SWEDEN_VIEW = {
  lat: 62.4,
  lon: 16.3,
  zoom: 5,
};

const dom = {
  showUser: document.querySelector("#show-user"),
  showAll: document.querySelector("#show-all"),
  searchInput: document.querySelector("#search-input"),
  resultCount: document.querySelector("#result-count"),
  cards: document.querySelector("#cards"),
  selectedTitle: document.querySelector("#selected-title"),
  selectedMeta: document.querySelector("#selected-meta"),
  selectedDescription: document.querySelector("#selected-description"),
  selectedStatus: document.querySelector("#selected-status"),
  selectedImage: document.querySelector("#selected-image"),
};

const state = {
  allPlaces: [],
  places: [],
  activePlaceId: null,
  map: null,
  markerLayer: null,
  markers: new Map(),
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderImage(imagePath, altText, className) {
  if (!imagePath) {
    return "";
  }

  return `
    <div class="${className}">
      <img
        src="${encodeURI(imagePath)}"
        alt="${escapeHtml(altText)}"
        loading="lazy"
        referrerpolicy="no-referrer"
        onerror="this.parentElement.remove()"
      />
    </div>
  `;
}

function popupContent(place) {
  return `
    <div class="tree-popup">
      ${renderImage(place.image, place.name, "tree-popup-image")}
      <strong>${escapeHtml(place.name)}</strong>
      <span>${escapeHtml(place.city)}</span>
      <p>${escapeHtml(place.description)}</p>
    </div>
  `;
}

function markerStyle(isActive) {
  return {
    radius: isActive ? 14 : 9,
    color: isActive ? "#7a1027" : "#a73d57",
    weight: isActive ? 5 : 3,
    fillColor: isActive ? "#ff6f91" : "#f6a0b8",
    fillOpacity: isActive ? 0.96 : 0.82,
  };
}

function initMap() {
  state.map = L.map("map", {
    zoomControl: true,
    minZoom: 4,
    preferCanvas: true,
  }).setView([SWEDEN_VIEW.lat, SWEDEN_VIEW.lon], SWEDEN_VIEW.zoom);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 20,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  }).addTo(state.map);

  L.control.scale({
    imperial: false,
    position: "bottomleft",
  }).addTo(state.map);

  state.markerLayer = L.layerGroup().addTo(state.map);
}

function setSelectedImage(place) {
  if (!place || !place.image) {
    dom.selectedImage.className = "selected-image is-empty";
    dom.selectedImage.innerHTML = "<span>Ingen bild vald än</span>";
    return;
  }

  dom.selectedImage.className = "selected-image";
  dom.selectedImage.innerHTML = `
    <img
      src="${encodeURI(place.image)}"
      alt="${escapeHtml(place.name)}"
      loading="lazy"
      referrerpolicy="no-referrer"
    />
  `;

  dom.selectedImage.querySelector("img").addEventListener("error", () => {
    dom.selectedImage.className = "selected-image is-empty";
    dom.selectedImage.innerHTML = "<span>Bild kunde inte laddas</span>";
  });
}

function setPanel(place, statusText) {
  if (!place) {
    dom.selectedTitle.textContent = "Ingen vald plats ännu";
    dom.selectedMeta.textContent = "";
    dom.selectedDescription.textContent = "";
    dom.selectedStatus.textContent = statusText || "Status: redo";
    setSelectedImage(null);
    return;
  }

  dom.selectedTitle.textContent = place.name;
  dom.selectedMeta.textContent = `${place.city} · ${place.source}`;
  dom.selectedDescription.textContent = place.description;
  dom.selectedStatus.textContent = statusText;
  setSelectedImage(place);
}

function updateResultCount() {
  const total = state.places.length;
  dom.resultCount.textContent = `${total} träd`;
}

function renderCards() {
  if (state.places.length === 0) {
    dom.cards.innerHTML = `
      <article class="card">
        <span class="card-title">Inga träffar</span>
        <span class="card-meta">Testa en annan sökning</span>
        <span class="card-body">Sökfältet filtrerar namn, stad och beskrivning.</span>
      </article>
    `;
    return;
  }

  dom.cards.innerHTML = state.places
    .map((place) => {
      const activeClass = place.id === state.activePlaceId ? " card-active" : "";
      const imageHtml = renderImage(place.image, place.name, "card-image");

      return `
        <button class="card${activeClass}" type="button" onclick="selectPlace('${escapeHtml(place.id)}')">
          ${imageHtml}
          <span class="card-title">${escapeHtml(place.name)}</span>
          <span class="card-meta">${escapeHtml(place.city)} · ${escapeHtml(place.source)}</span>
          <span class="card-body">${escapeHtml(place.description)}</span>
        </button>
      `;
    })
    .join("");
}

function renderMarkers() {
  state.markerLayer.clearLayers();
  state.markers.clear();

  state.places.forEach((place) => {
    const isActive = place.id === state.activePlaceId;
    const marker = L.circleMarker([place.lat, place.lon], markerStyle(isActive));

    marker.bindPopup(popupContent(place), {
      autoPanPadding: [30, 30],
      closeButton: true,
    });

    marker.on("click", () => {
      selectPlace(place.id, false);
    });

    if (isActive) {
      marker.bindTooltip(place.name, {
        permanent: true,
        direction: "top",
        offset: [0, -14],
        className: "place-tooltip",
      });
      marker.openTooltip();
    }

    marker.addTo(state.markerLayer);
    state.markers.set(place.id, marker);
  });
}

function focusMarker(place, openPopup = true) {
  const marker = state.markers.get(place.id);
  if (!marker) {
    return;
  }

  state.map.flyTo([place.lat, place.lon], 17, {
    animate: true,
    duration: 0.8,
  });

  if (openPopup) {
    window.setTimeout(() => {
      marker.openPopup();
    }, 250);
  }
}

function fitPlaces(places) {
  if (places.length === 0) {
    state.map.setView([SWEDEN_VIEW.lat, SWEDEN_VIEW.lon], SWEDEN_VIEW.zoom);
    return;
  }

  if (places.length === 1) {
    state.map.setView([places[0].lat, places[0].lon], 17, { animate: false });
    return;
  }

  const bounds = L.latLngBounds(places.map((place) => [place.lat, place.lon]));
  state.map.fitBounds(bounds, {
    padding: [40, 40],
    maxZoom: 14,
  });
}

function selectPlace(placeId, shouldFly = true) {
  const place = state.places.find((item) => item.id === placeId);

  if (!place) {
    setPanel(null, `Status: hittade inte platsen ${placeId}`);
    return;
  }

  state.activePlaceId = place.id;
  renderCards();
  renderMarkers();
  setPanel(place, `Status: hoppade till ${place.name}`);

  if (shouldFly) {
    focusMarker(place, true);
  } else {
    const marker = state.markers.get(place.id);
    if (marker) {
      marker.openPopup();
    }
  }
}

function applyFilter(query) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    state.places = [...state.allPlaces];
  } else {
    state.places = state.allPlaces.filter((place) => {
      const haystack = [
        place.name,
        place.city,
        place.description,
        place.source,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }

  if (!state.places.some((place) => place.id === state.activePlaceId)) {
    state.activePlaceId = state.places[0]?.id || null;
  }

  renderCards();
  renderMarkers();
  updateResultCount();

  if (state.places.length === 0) {
    fitPlaces([]);
    setPanel(null, "Status: inga träd matchar din sökning");
    return;
  }

  fitPlaces(state.places);

  if (state.activePlaceId) {
    const activePlace = state.places.find((place) => place.id === state.activePlaceId);
    setPanel(activePlace, `Status: visar ${state.places.length} träd`);
    renderMarkers();
  }
}

function showAllPlaces() {
  if (state.places.length === 0) {
    setPanel(null, "Status: inga träd att visa");
    return;
  }

  fitPlaces(state.places);

  if (state.activePlaceId) {
    const activePlace = state.places.find((place) => place.id === state.activePlaceId);
    if (activePlace) {
      setPanel(activePlace, `Status: visar alla ${state.places.length} träd`);
    }
  }
}

function loadUserPlaces() {
  state.allPlaces = [...USER_PLACES];
  dom.searchInput.value = "";
  state.places = [...state.allPlaces];
  state.activePlaceId = state.places[0]?.id || null;

  renderCards();
  renderMarkers();
  updateResultCount();

  if (state.places.length === 0) {
    fitPlaces([]);
    setPanel(null, "Status: inga träd ännu");
    return;
  }

  fitPlaces(state.places);
  selectPlace(state.activePlaceId, state.places.length === 1);
}

window.selectPlace = selectPlace;

dom.showUser.addEventListener("click", () => {
  loadUserPlaces();
});

dom.showAll.addEventListener("click", () => {
  showAllPlaces();
});

dom.searchInput.addEventListener("input", (event) => {
  applyFilter(event.target.value);
});

initMap();
loadUserPlaces();
