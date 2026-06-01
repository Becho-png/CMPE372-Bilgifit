// BilgiFit — Login / Register interactive logic

(function () {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MIN_PASSWORD = 6;
  const ALLOWED_EMAIL_RE = /@(bilgi\.edu\.tr|bilgiedu\.net)$/i;

  const tabs = document.querySelectorAll(".tab");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const heroTitle = document.getElementById("heroTitle");
  const heroLede = document.getElementById("heroLede");
  const formTitle = document.getElementById("formTitle");
  const formSub = document.getElementById("formSub");

  const COPY = {
    login: {
      hero: "Welcome back to BilgiFit.",
      lede: "Use your Bilgi account to manage reservations, classes and trainer sessions.",
      title: "Log in",
      sub: "Continue with your campus credentials.",
    },
    register: {
      hero: "Join BilgiFit today.",
      lede: "Create your campus account to start booking gym slots, classes and personal trainers.",
      title: "Create account",
      sub: "Use your @bilgi.edu.tr or @bilgiedu.net email to sign up.",
    },
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle("tab--active", isActive);
        t.setAttribute("aria-selected", String(isActive));
      });

      const showLogin = target === "login";
      loginForm.hidden = !showLogin;
      registerForm.hidden = showLogin;

      const copy = COPY[target];
      heroTitle.textContent = copy.hero;
      heroLede.textContent = copy.lede;
      formTitle.textContent = copy.title;
      formSub.textContent = copy.sub;

      clearAllErrors(loginForm);
      clearAllErrors(registerForm);
      hideBanner("loginBanner");
      hideBanner("registerBanner");
    });
  });

  function setError(inputId, message) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const field = input.closest(".field");
    const errEl = field.querySelector('[data-error-for="' + inputId + '"]');
    field.classList.add("has-error");
    errEl.textContent = message;
  }

  function clearError(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const field = input.closest(".field");
    const errEl = field.querySelector('[data-error-for="' + inputId + '"]');
    field.classList.remove("has-error");
    errEl.textContent = "";
  }

  function clearAllErrors(form) {
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
    form.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
  }

  function showBanner(id, message, kind) {
    const el = document.getElementById(id);
    el.textContent = message;
    el.hidden = false;
    el.classList.remove("is-success", "is-error");
    el.classList.add(kind === "success" ? "is-success" : "is-error");
  }

  function hideBanner(id) {
    const el = document.getElementById(id);
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("is-success", "is-error");
  }

  [loginForm, registerForm].forEach((form) => {
    form.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => clearError(input.id));
    });
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors(loginForm);
    hideBanner("loginBanner");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    let valid = true;

    if (!email) {
      setError("loginEmail", "Email is required.");
      valid = false;
    } else if (!EMAIL_RE.test(email)) {
      setError("loginEmail", "Please enter a valid email address.");
      valid = false;
    } else if (!ALLOWED_EMAIL_RE.test(email)) {
      setError("loginEmail", "Use your @bilgi.edu.tr or @bilgiedu.net campus email.");
      valid = false;
    }

    if (!password) {
      setError("loginPassword", "Password is required.");
      valid = false;
    } else if (password.length < MIN_PASSWORD) {
      setError("loginPassword", "Password must be at least " + MIN_PASSWORD + " characters.");
      valid = false;
    }

    if (!valid) return;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showBanner("loginBanner", data.message || "Login failed.", "error");
        return;
      }

      localStorage.setItem("bilgifitUser", JSON.stringify(data.user));
      showBanner("loginBanner", "Login successful! Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 900);

    } catch (error) {
      showBanner("loginBanner", "Server connection failed.", "error");
    }
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors(registerForm);
    hideBanner("registerBanner");

    const fullname = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regConfirm").value;

    let valid = true;

    if (!fullname) {
      setError("regName", "Full name is required.");
      valid = false;
    } else if (fullname.length < 2) {
      setError("regName", "Please enter your full name.");
      valid = false;
    }

    if (!email) {
      setError("regEmail", "Email is required.");
      valid = false;
    } else if (!EMAIL_RE.test(email)) {
      setError("regEmail", "Please enter a valid email address.");
      valid = false;
    } else if (!ALLOWED_EMAIL_RE.test(email)) {
      setError("regEmail", "Only @bilgi.edu.tr or @bilgiedu.net emails are accepted.");
      valid = false;
    }

    if (!password) {
      setError("regPassword", "Password is required.");
      valid = false;
    } else if (password.length < MIN_PASSWORD) {
      setError("regPassword", "Password must be at least " + MIN_PASSWORD + " characters.");
      valid = false;
    }

    if (!confirm) {
      setError("regConfirm", "Please confirm your password.");
      valid = false;
    } else if (password && confirm !== password) {
      setError("regConfirm", "Passwords do not match.");
      valid = false;
    }

    if (!valid) return;

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullname: fullname,
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showBanner("registerBanner", data.message || "Registration failed.", "error");
        return;
      }

      showBanner("registerBanner", "Account created! You can now log in.", "success");
      registerForm.reset();

    } catch (error) {
      showBanner("registerBanner", "Server connection failed.", "error");
    }
  });
})();
