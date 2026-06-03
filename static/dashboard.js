// BilgiFit dashboard and booking prototype logic.

(function () {
  const routes = {
    dashboard: {
      title: "Dashboard",
      sub: "Overview of your reservations and live facility state",
    },
    facility: {
      title: "Facility Booking",
      sub: "Compare slots, check capacity, and reserve a facility",
    },
    sessions: {
      title: "Group Sessions",
      sub: "Join instructor-led classes with available capacity",
    },
    trainers: {
      title: "Personal Trainers",
      sub: "Book one-on-one support from available trainers",
    },
    profile: {
      title: "My Profile",
      sub: "Manage contact details and active membership information",
    },
  };

  let facilities = [];
  let groupSessions = [];
  let trainers = [];
  let reservations = [];

  const joinedSessions = new Set();
  const bookedTrainers = new Set();
  let activeRoute = "dashboard";
  let activeFilter = "all";
  let pendingFacilityId = null;
  let toastTimer = null;

  const content = document.getElementById("content");
  const pageTitle = document.getElementById("pageTitle");
  const pageSub = document.getElementById("pageSub");
  const searchInput = document.getElementById("globalSearch");
  const navItems = document.querySelectorAll(".nav__item");
  const modalOverlay = document.getElementById("modalOverlay");
  const modalBody = document.getElementById("modalBody");
  const confirmModalBtn = document.getElementById("confirmModalBtn");
  const cancelModalBtn = document.getElementById("cancelModalBtn");
  const toast = document.getElementById("toast");
  const liveOccupied = document.getElementById("liveOccupied");

  navItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(item.dataset.route);
    });
  });

  searchInput.addEventListener("input", () => renderRoute());
  cancelModalBtn.addEventListener("click", closeModal);
  confirmModalBtn.addEventListener("click", confirmReservation);

  content.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    if (action === "quick") navigate(target.dataset.route);
    if (action === "filter") setFacilityFilter(target.dataset.filter);
    if (action === "reserve") openReservationModal(Number(target.dataset.id));
    if (action === "join") joinSession(Number(target.dataset.id));
    if (action === "trainer") bookTrainer(Number(target.dataset.id));
    if (action === "cancel-reservation") cancelReservation(Number(target.dataset.index));
    if (action === "save-profile") saveProfile();
  });

  async function loadDashboardData() {
    try {
      const [facilitiesRes, sessionsRes, trainersRes, reservationsRes] =
        await Promise.all([
          fetch("/api/facilities"),
          fetch("/api/sessions"),
          fetch("/api/trainers"),
          fetch("/api/reservations")
        ]);

      facilities = await facilitiesRes.json();
      groupSessions = await sessionsRes.json();
      trainers = await trainersRes.json();
      reservations = await reservationsRes.json();

      navigate("dashboard");
    } catch (error) {
      console.error(error);
      showToast("Database connection failed.");
      navigate("dashboard");
    }
  }

  function navigate(route) {
    activeRoute = route;
    navItems.forEach((item) => item.classList.toggle("nav__item--active", item.dataset.route === route));
    pageTitle.textContent = routes[route].title;
    pageSub.textContent = routes[route].sub;
    searchInput.value = "";
    renderRoute();
  }

  function renderRoute() {
    const query = searchInput.value.trim().toLowerCase();
    if (activeRoute === "dashboard") content.innerHTML = dashboardHTML(query);
    if (activeRoute === "facility") content.innerHTML = facilityHTML(query);
    if (activeRoute === "sessions") content.innerHTML = sessionsHTML(query);
    if (activeRoute === "trainers") content.innerHTML = trainersHTML(query);
    if (activeRoute === "profile") content.innerHTML = profileHTML();
    updateOccupancy();
  }

  function dashboardHTML(query) {
    const filtered = reservations.filter((reservation) => matches(query, reservation.facility));

    const nextReservation = reservations[0] || {
      facility: "No reservation",
      date: "-",
      time: "-",
      status: "Pending"
    };

    return `
      <section class="top-row">
        <article class="next-card">
          <p class="next-card__label">Next reservation</p>
          <h2 class="next-card__title">${escapeHTML(nextReservation.facility)}</h2>
          <p class="next-card__meta">${escapeHTML(nextReservation.date)} / ${escapeHTML(nextReservation.time)} / ${escapeHTML(nextReservation.status)}</p>
          <button type="button" class="btn btn--primary next-card__btn" data-action="quick" data-route="sessions">View classes</button>
        </article>
        <article class="stat-card stat-card--accent">
          <p class="stat-card__value">${reservations.length}</p>
          <p class="stat-card__label">Bookings this week</p>
        </article>
        <article class="stat-card">
          <p class="stat-card__value"><span id="statOccupied">${currentGymBooked()}</span>/10</p>
          <p class="stat-card__label">Gym occupancy</p>
        </article>
        <article class="stat-card">
          <p class="stat-card__value">${openCourtCount()}</p>
          <p class="stat-card__label">Open courts</p>
        </article>
      </section>

      <section class="bottom-row">
        <div class="reservations">
          <h3 class="section-title">Upcoming reservations</h3>
          <div class="table-card">
            ${reservationTable(filtered)}
          </div>
        </div>
        <aside class="quick-actions">
          <h3 class="section-title">Quick actions</h3>
          ${quickAction("facility", "Reserve facility", "Book available gym/court time")}
          ${quickAction("sessions", "Join class", "Browse group sessions")}
          ${quickAction("trainers", "Book trainer", "Find one-on-one support")}
        </aside>
      </section>
    `;
  }

  function facilityHTML(query) {
    const items = facilities.filter((facility) => {
      const filterMatch = activeFilter === "all" || facility.type === activeFilter;
      return filterMatch && matches(query, facility.name + " " + facility.type + " " + facility.time);
    });

    return `
      <div class="filters" role="tablist" aria-label="Facility filters">
        ${filterButton("all", "All")}
        ${filterButton("gym", "Gym")}
        ${filterButton("boxing", "Boxing")}
        ${filterButton("basketball", "Basketball")}
      </div>
      <section class="cards-grid">
        ${items.map(facilityCard).join("") || emptyState("No matching facility slots.")}
      </section>
    `;
  }

  function sessionsHTML(query) {
    const items = groupSessions.filter((session) => matches(query, session.name + " " + session.instructor + " " + session.level));
    return `
      <section class="cards-grid cards-grid--two">
        ${items.map(sessionCard).join("") || emptyState("No matching group sessions.")}
      </section>
    `;
  }

  function trainersHTML(query) {
    const items = trainers.filter((trainer) => matches(query, trainer.name + " " + trainer.specialty));
    return `
      <section class="cards-grid cards-grid--two">
        ${items.map(trainerCard).join("") || emptyState("No matching trainers.")}
      </section>
    `;
  }

  function profileHTML() {
    const user = readUser();
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <div class="profile-card__avatar" aria-hidden="true">${initials(user.fullname)}</div>
          <div>
            <h2>${escapeHTML(user.fullname)}</h2>
            <p>Member since 2026</p>
          </div>
        </div>
        <div class="profile-form">
          <label>
            Full name
            <input type="text" id="profileName" value="${escapeHTML(user.fullname)}" />
            <span class="error" id="profileNameError"></span>
          </label>
          <label>
            Email
            <input type="email" id="profileEmail" value="${escapeHTML(user.email)}" />
            <span class="error" id="profileEmailError"></span>
          </label>
          <label>
            Phone
            <input type="tel" id="profilePhone" value="+90 555 010 3720" />
            <span class="error" id="profilePhoneError"></span>
          </label>
          <label>
            Address
            <input type="text" id="profileAddress" value="Istanbul Bilgi University Sports Center" />
          </label>
        </div>
        <div class="membership-card">
          <div>
            <p class="membership-card__title">Campus Fitness Plan</p>
            <p class="membership-card__sub">Active member access for gym, courts, classes, and PT booking.</p>
          </div>
          <span class="badge badge--active">Active</span>
        </div>
        <button type="button" class="btn btn--primary profile-card__save" data-action="save-profile">Save changes</button>
      </article>
    `;
  }

  function reservationTable(items) {
    if (!items.length) return emptyState("No matching reservations.");
    return `
      <table class="table">
        <thead>
          <tr>
            <th>Facility</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((reservation) => {
            const originalIndex = reservations.indexOf(reservation);
            const statusClass = reservation.status === "Active" ? "badge--active" : "badge--pending";
            return `
              <tr>
                <td class="td-strong">${escapeHTML(reservation.facility)}</td>
                <td>${escapeHTML(reservation.date)}</td>
                <td>${escapeHTML(reservation.time)}</td>
                <td><span class="badge ${statusClass}">${escapeHTML(reservation.status)}</span></td>
                <td><button type="button" class="text-btn" data-action="cancel-reservation" data-index="${originalIndex}">Cancel</button></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  function quickAction(route, title, sub) {
    return `
      <button type="button" class="quick-action" data-action="quick" data-route="${route}">
        <span class="quick-action__body">
          <span class="quick-action__title">${title}</span>
          <span class="quick-action__sub">${sub}</span>
        </span>
        <span class="quick-action__arrow" aria-hidden="true">&gt;</span>
      </button>
    `;
  }

  function filterButton(filter, label) {
    const active = activeFilter === filter ? "filter-btn--active" : "";
    return `<button type="button" class="filter-btn ${active}" data-action="filter" data-filter="${filter}" role="tab">${label}</button>`;
  }

  function facilityCard(facility) {
    const percent = Math.round((facility.booked / facility.capacity) * 100);
    const isFull = facility.booked >= facility.capacity;
    const tone = percent >= 90 ? "capacity-fill--high" : percent >= 60 ? "capacity-fill--mid" : "capacity-fill--low";
    return `
      <article class="booking-card">
        <div class="booking-card__head">
          <div>
            <h2>${escapeHTML(facility.name)}</h2>
            <p>${escapeHTML(facility.time)} / ${escapeHTML(capitalize(facility.type))}</p>
          </div>
          <span class="badge ${isFull ? "badge--pending" : "badge--active"}">${isFull ? "Full" : "Available"}</span>
        </div>
        <div class="capacity-row">
          <span>Capacity</span>
          <strong>${facility.booked}/${facility.capacity} (${percent}%)</strong>
        </div>
        <div class="capacity-bar" aria-hidden="true">
          <span class="capacity-fill ${tone}" style="width:${percent}%"></span>
        </div>
        <button type="button" class="btn ${isFull ? "btn--disabled" : "btn--primary"}" data-action="reserve" data-id="${facility.id}" ${isFull ? "disabled" : ""}>
          ${isFull ? "Full" : "Reserve slot"}
        </button>
      </article>
    `;
  }

  function sessionCard(session) {
    const isFull = session.count >= session.max;
    const isJoined = joinedSessions.has(session.id);
    return `
      <article class="booking-card">
        <div class="booking-card__head">
          <div>
            <h2>${escapeHTML(session.name)}</h2>
            <p>${escapeHTML(session.instructor)} / ${escapeHTML(session.schedule)}</p>
          </div>
          <span class="level-badge">${escapeHTML(session.level)}</span>
        </div>
        <p class="booking-card__meta">${session.count}/${session.max} participants</p>
        <button type="button" class="btn ${isFull || isJoined ? "btn--disabled" : "btn--primary"}" data-action="join" data-id="${session.id}" ${isFull || isJoined ? "disabled" : ""}>
          ${isJoined ? "Joined" : isFull ? "Full" : "Join session"}
        </button>
      </article>
    `;
  }

  function trainerCard(trainer) {
    const isBooked = bookedTrainers.has(trainer.id);
    return `
      <article class="booking-card">
        <div class="trainer-head">
          <div class="trainer-avatar" aria-hidden="true">${initials(trainer.name)}</div>
          <div>
            <h2>${escapeHTML(trainer.name)}</h2>
            <p>${escapeHTML(trainer.specialty)}</p>
          </div>
        </div>
        <p class="booking-card__meta">Rating ${trainer.rating} / ${trainer.sessions} sessions</p>
        <button type="button" class="btn ${trainer.available && !isBooked ? "btn--primary" : "btn--disabled"}" data-action="trainer" data-id="${trainer.id}" ${trainer.available && !isBooked ? "" : "disabled"}>
          ${isBooked ? "Booked" : trainer.available ? "Book session" : "Unavailable"}
        </button>
      </article>
    `;
  }

  function setFacilityFilter(filter) {
    activeFilter = filter;
    renderRoute();
  }

  function openReservationModal(id) {
    const facility = facilities.find((item) => item.id === id);
    if (!facility || facility.booked >= facility.capacity) return;
    pendingFacilityId = id;
    modalBody.textContent = "Reserve " + facility.name + " for " + facility.time + "?";
    modalOverlay.hidden = false;
  }

  function closeModal() {
    pendingFacilityId = null;
    modalOverlay.hidden = true;
  }

  function confirmReservation() {
    const facility = facilities.find((item) => item.id === pendingFacilityId);
    if (!facility) return;
    if (facility.booked >= facility.capacity) {
      showToast("This slot is already full.");
      closeModal();
      renderRoute();
      return;
    }
    facility.booked += 1;
    reservations.unshift({
      facility: facility.name,
      date: "Today",
      time: facility.time.split("-")[0],
      status: "Active",
    });
    showToast("Reservation confirmed.");
    closeModal();
    navigate("dashboard");
  }

  function joinSession(id) {
    const session = groupSessions.find((item) => item.id === id);
    if (!session || session.count >= session.max || joinedSessions.has(id)) return;
    session.count += 1;
    joinedSessions.add(id);
    reservations.unshift({ facility: session.name, date: "This week", time: session.schedule, status: "Active" });
    showToast("Group session joined.");
    renderRoute();
  }

  function bookTrainer(id) {
    const trainer = trainers.find((item) => item.id === id);
    if (!trainer || !trainer.available || bookedTrainers.has(id)) return;
    bookedTrainers.add(id);
    reservations.unshift({ facility: "PT " + trainer.name, date: "Fri", time: "12:00", status: "Pending" });
    showToast("Trainer booking requested.");
    renderRoute();
  }

  function cancelReservation(index) {
    if (!reservations[index]) return;
    reservations[index].status = "Cancelled";
    showToast("Reservation cancelled.");
    renderRoute();
  }

  function saveProfile() {
    const name = document.getElementById("profileName");
    const email = document.getElementById("profileEmail");
    const phone = document.getElementById("profilePhone");
    clearProfileErrors();

    let valid = true;
    if (!name.value.trim()) {
      setInlineError("profileNameError", "Full name is required.");
      valid = false;
    }
    if (!/^[^\s@]+@(bilgi\.edu\.tr|bilgiedu\.net)$/i.test(email.value.trim())) {
      setInlineError("profileEmailError", "Use a valid Bilgi email address.");
      valid = false;
    }
    if (phone.value.replace(/\D/g, "").length < 7) {
      setInlineError("profilePhoneError", "Phone number is too short.");
      valid = false;
    }
    if (!valid) return;

    const updatedUser = {
      fullname: name.value.trim(),
      email: email.value.trim(),
    };
    localStorage.setItem("bilgifitUser", JSON.stringify(updatedUser));
    showToast("Profile updated successfully.");
    renderRoute();
  }

  function clearProfileErrors() {
    ["profileNameError", "profileEmailError", "profilePhoneError"].forEach((id) => setInlineError(id, ""));
  }

  function setInlineError(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2200);
  }

  function updateOccupancy() {
    liveOccupied.textContent = String(currentGymBooked());
    const statOccupied = document.getElementById("statOccupied");
    if (statOccupied) statOccupied.textContent = String(currentGymBooked());
  }

  function currentGymBooked() {
    const gymSlots = facilities.filter((facility) => facility.type === "gym").map((facility) => facility.booked);
    if (!gymSlots.length) return 0;
    return Math.max.apply(null, gymSlots);
  }

  function openCourtCount() {
    return facilities.filter((facility) => facility.type === "basketball" && facility.booked < facility.capacity).length;
  }

  function readUser() {
    try {
      const user = JSON.parse(localStorage.getItem("bilgifitUser"));
      if (user && user.fullname && user.email) return user;
    } catch (error) {
      return fallbackUser();
    }
    return fallbackUser();
  }

  function fallbackUser() {
    return { fullname: "Zeynep Kaya", email: "zeynep@bilgi.edu.tr" };
  }

  function initials(name) {
    return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
  }

  function matches(query, text) {
    return !query || text.toLowerCase().includes(query);
  }

  function emptyState(message) {
    return `<p class="empty-state">${message}</p>`;
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  loadDashboardData();
})();
