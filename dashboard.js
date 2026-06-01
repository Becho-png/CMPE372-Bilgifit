// BilgiFit — Dashboard interactive logic

(function () {
  const searchInput = document.getElementById("searchFacilities");
  const tableBody = document.getElementById("reservationsBody");
  const tableEmpty = document.getElementById("tableEmpty");
  const navItems = document.querySelectorAll(".nav__item");
  const viewDetailsBtn = document.getElementById("viewDetailsBtn");
  const quickActions = document.querySelectorAll(".quick-action");
  const toast = document.getElementById("toast");

  /* ---------- TOAST ---------- */
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2200);
  }

  /* ---------- TABLE FILTER ---------- */
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    const rows = tableBody.querySelectorAll("tr");
    let visible = 0;

    rows.forEach((row) => {
      const facility = row.children[0].textContent.toLowerCase();
      const match = facility.includes(q);
      row.style.display = match ? "" : "none";
      if (match) visible++;
    });

    tableEmpty.hidden = visible > 0;
  });

  /* ---------- SIDEBAR NAV ---------- */
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      navItems.forEach((n) => n.classList.remove("nav__item--active"));
      item.classList.add("nav__item--active");

      const route = item.dataset.route;
      if (route !== "dashboard") {
        const label = item.textContent;
        showToast(label + " — coming soon");
      }
    });
  });

  /* ---------- VIEW DETAILS ---------- */
  viewDetailsBtn.addEventListener("click", () => {
    showToast("Pilates Core / Today 18:00 / Studio A — confirmed.");
  });

  /* ---------- QUICK ACTIONS ---------- */
  const ACTION_MESSAGES = {
    reserve: "Opening facility booking...",
    join: "Opening group sessions...",
    trainer: "Opening personal trainers...",
  };

  quickActions.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      showToast(ACTION_MESSAGES[action] || "Action triggered.");
    });
  });

  /* ---------- LIVE OCCUPANCY (mock tick) ---------- */
  // Simulates a small async-looking update so the live state feels alive.
  const occupiedEls = [
    document.getElementById("liveOccupied"),
    document.getElementById("statOccupied"),
  ];
  let occupied = 8;
  const capacity = 10;

  setInterval(() => {
    const delta = Math.random() < 0.5 ? -1 : 1;
    occupied = Math.max(5, Math.min(capacity, occupied + delta));
    occupiedEls.forEach((el) => { if (el) el.textContent = String(occupied); });
  }, 5000);
})();
