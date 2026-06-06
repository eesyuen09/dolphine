const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatLog = document.querySelector("#chat-log");
const detectedMetrics = document.querySelector("#detected-metrics");
const chatRoomList = document.querySelector("#chat-room-list");
const promptButtons = document.querySelectorAll("[data-prompt]");

function detectPreferences(text) {
  const request = text.toLowerCase();
  const budgetMatch = request.match(/(?:under|below|budget|up to|less than)\s*\$?\s*(\d{3,4})/);
  const area = ["Raffles Place", "Buona Vista", "Tanjong Pagar", "Paya Lebar"].find((place) => request.includes(place.toLowerCase())) || "Buona Vista";
  const mrtMinutesMatch = request.match(/(\d+)\s*(?:min|minute|minutes).*?(?:mrt|station)/);

  return {
    budget: budgetMatch ? Number(budgetMatch[1]) : 1200,
    targetArea: area,
    needAircon: request.includes("aircon") || request.includes("air-con") || request.includes("ac"),
    needWifi: request.includes("wifi") || request.includes("wi-fi") || request.includes("internet"),
    allowCooking: request.includes("cook") || request.includes("cooking"),
    privateBath: request.includes("private bath") || request.includes("own bathroom") || request.includes("private bathroom"),
    priority: detectPriority(request),
    maxWalk: mrtMinutesMatch ? Number(mrtMinutesMatch[1]) : request.includes("close to mrt") || request.includes("near mrt") ? 5 : 8,
    foodAccess: request.includes("food") || request.includes("hawker") || request.includes("court") ? "must" : "good",
    limit: 3
  };
}

function detectPriority(request) {
  if (request.includes("comfort") || request.includes("quiet") || request.includes("spacious")) return "comfort";
  if (request.includes("cheapest") || request.includes("cheap") || request.includes("affordable")) return "budget";
  if (request.includes("mrt") || request.includes("station")) return "mrt";
  if (request.includes("food") || request.includes("hawker")) return "food";
  return "balanced";
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

function addMessage(sender, text) {
  const message = document.createElement("div");
  message.className = `chat-message ${sender}`;
  message.textContent = text;
  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderDetectedMetrics(preferences) {
  const metrics = [
    `Budget: up to $${preferences.budget}`,
    `Commute area: ${preferences.targetArea}`,
    `MRT walk: ${preferences.maxWalk} min`,
    `Priority: ${preferences.priority}`,
    preferences.needAircon ? "Aircon required" : "Aircon flexible",
    preferences.privateBath ? "Private bath preferred" : "Bathroom flexible",
    preferences.allowCooking ? "Cooking needed" : "Cooking flexible",
    preferences.foodAccess === "must" ? "Food court access important" : "Food access flexible"
  ];

  detectedMetrics.innerHTML = metrics.map((metric) => `<span>${metric}</span>`).join("");
}

function renderChatRooms(rooms, preferences) {
  chatRoomList.innerHTML = rooms.map((room, index) => `
    <article class="room-card compact-card">
      <div class="room-image" style="background-image: url('${room.image}')" role="img" aria-label="${room.name}"></div>
      <div class="room-content">
        <div class="room-topline">
          <div>
            <h3 class="room-title">${index + 1}. ${room.name}</h3>
            <p class="room-meta">${room.area} · $${room.rent}/mo · ${room.mrtWalk} min to MRT · ${room.commuteMinutes} min to ${preferences.targetArea}</p>
          </div>
          <div class="score-badge">${room.score}<span>fit score</span></div>
        </div>
        <p class="ai-note">${room.aiNote}</p>
      </div>
    </article>
  `).join("");
}

async function handleRequest(text) {
  const preferences = detectPreferences(text);
  addMessage("user", text);
  renderDetectedMetrics(preferences);

  try {
    const data = await fetchRecommendations(preferences);
    addMessage("assistant", `I detected a $${preferences.budget} budget, ${preferences.targetArea} commute target, ${preferences.maxWalk}-minute MRT preference, and ${preferences.priority} priority. I ranked the strongest matches on the right.`);
    renderChatRooms(data.rooms, preferences);
  } catch (error) {
    console.error(error);
    addMessage("assistant", "I cannot reach the recommendation API yet. Start the backend with npm start inside the backend folder.");
    chatRoomList.innerHTML = "";
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  handleRequest(text);
  chatInput.value = "";
});

promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chatInput.value = button.dataset.prompt;
    chatInput.focus();
  });
});

addMessage("assistant", "Tell me your preferred budget, work or study area, MRT needs, food access, and any must-have room features. I will turn that into a ranked shortlist.");
handleRequest(chatInput.value);