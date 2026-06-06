const form = document.querySelector("#preference-form");
const roomList = document.querySelector("#room-list");
const insightBox = document.querySelector("#insight-box");
const resetButton = document.querySelector("#reset-button");
const matchCount = document.querySelector("#match-count");

const fields = {
  budget: document.querySelector("#budget"),
  targetArea: document.querySelector("#target-area"),
  needAircon: document.querySelector("#need-aircon"),
  needWifi: document.querySelector("#need-wifi"),
  allowCooking: document.querySelector("#allow-cooking"),
  privateBath: document.querySelector("#private-bath"),
  priority: document.querySelector("#priority"),
  maxWalk: document.querySelector("#max-walk"),
  foodAccess: document.querySelector("#food-access")
};

function getPreferences() {
  return {
    budget: Number(fields.budget.value),
    targetArea: fields.targetArea.value,
    needAircon: fields.needAircon.checked,
    needWifi: fields.needWifi.checked,
    allowCooking: fields.allowCooking.checked,
    privateBath: fields.privateBath.checked,
    priority: fields.priority.value,
    maxWalk: Number(fields.maxWalk.value),
    foodAccess: fields.foodAccess.value
  };
}

function getMatchLabel(score) {
  if (score >= 82) return "Strong";
  if (score >= 68) return "Good";
  if (score >= 50) return "Fair";
  return "Weak";
}

async function fetchRecommendations(preferences) {
  const response = await fetch("/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences)
  });

  if (!response.ok) {
    throw new Error("Recommendation API failed");
  }

  return response.json();
}

function renderRooms(data) {
  matchCount.textContent = String(data.strongMatches);
  insightBox.textContent = `${data.summary} The top result is ${data.rooms[0].name} because it best balances your selected priority with practical tradeoffs.`;

  roomList.innerHTML = data.rooms.map((room, index) => `
    <article class="room-card">
      <div class="room-image" style="background-image: url('${room.image}')" role="img" aria-label="${room.name}"></div>
      <div class="room-content">
        <div class="room-topline">
          <div>
            <h3 class="room-title">${index + 1}. ${room.name}</h3>
            <p class="room-meta">${room.area} · ${room.notes}</p>
          </div>
          <div class="score-badge">${room.score}<span>${getMatchLabel(room.score)} fit</span></div>
        </div>
        <div class="chips">
          <span class="chip ${room.aircon ? "good" : "warn"}">${room.aircon ? "Aircon" : "No aircon"}</span>
          <span class="chip ${room.wifi ? "good" : "warn"}">${room.wifi ? "Fast Wi-Fi" : "Basic Wi-Fi"}</span>
          <span class="chip ${room.cooking ? "good" : "warn"}">${room.cooking ? "Cooking ok" : "Limited cooking"}</span>
          <span class="chip ${room.privateBath ? "good" : "warn"}">${room.privateBath ? "Private bath" : "Shared bath"}</span>
        </div>
        <p class="ai-note">${room.aiNote}</p>
        <div class="tradeoffs">
          ${room.tradeoffs.map((tradeoff) => `<span class="tradeoff">${tradeoff}</span>`).join("")}
        </div>
      </div>
    </article>
  `).join("");
}

async function refreshRecommendations() {
  try {
    const data = await fetchRecommendations(getPreferences());
    renderRooms(data);
  } catch (error) {
    console.error(error);
    matchCount.textContent = "0";
    insightBox.textContent = "The recommendation API is not reachable. Start the backend with npm start inside the backend folder.";
    roomList.innerHTML = "";
  }
}

form.addEventListener("input", refreshRecommendations);
resetButton.addEventListener("click", () => {
  form.reset();
  refreshRecommendations();
});

refreshRecommendations();