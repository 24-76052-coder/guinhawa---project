(function () {
  "use strict";

  var API = "/guinhawa_system/api";
  var form = document.getElementById("passwordForm");
  var current = document.getElementById("currentPassword");
  var next = document.getElementById("newPassword");
  var confirm = document.getElementById("confirmPassword");
  var button = document.getElementById("submitButton");
  var status = document.getElementById("status");
  var notice = document.getElementById("requiredNotice");

  var csrfToken = "";

  if (new URLSearchParams(window.location.search).get("required") === "1") {
    notice.hidden = false;
  }

  function setStatus(message, kind) {
    status.textContent = message || "";
    status.className = "status" + (kind ? " " + kind : "");
  }

  function fail(message) {
    setStatus(message, "error");
    button.disabled = false;
    button.textContent = "Save new password";
  }

  fetch(API + "/auth/me", { credentials: "same-origin", headers: { Accept: "application/json" } })
    .then(function (response) {
      if (response.status === 401) {
        window.location.replace("/guinhawa_system/login/index.php?expired=1");
        throw new Error("signed out");
      }
      return response.json();
    })
    .then(function (body) {
      csrfToken = body.csrfToken || "";
    })
    .catch(function (error) {
      if (error && error.message === "signed out") return;
      fail("Cannot reach the server. Reload the page and try again.");
    });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    setStatus("");

    if (!current.value || !next.value || !confirm.value) {
      fail("Fill in all three password fields.");
      return;
    }
    if (next.value.length < 8) {
      fail("The new password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(next.value) || !/[a-z]/.test(next.value) || !/[0-9]/.test(next.value)) {
      fail("Use uppercase, lowercase and at least one number.");
      return;
    }
    if (next.value !== confirm.value) {
      fail("The new passwords do not match.");
      confirm.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "Saving\u2026";

    fetch(API + "/auth/change-password", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        currentPassword: current.value,
        newPassword: next.value,
        confirmPassword: confirm.value,
      }),
    })
      .then(function (response) {
        return response.json().then(function (body) {
          return { ok: response.ok, status: response.status, body: body || {} };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          fail(result.body.error || "The password could not be changed.");
          return;
        }
        setStatus("Password saved. Opening your dashboard\u2026", "success");
        window.setTimeout(function () {
          window.location.href = "/guinhawa_system/index.php";
        }, 700);
      })
      .catch(function () {
        fail("Cannot reach the server. Reload the page and try again.");
      });
  });
})();
