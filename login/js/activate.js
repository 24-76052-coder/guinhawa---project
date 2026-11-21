/* ==========================================================================
   GUINHAWA — Staff account activation
   ========================================================================== */

(function (window, document) {
  "use strict";

  var Store = window.GuinhawaStore;
  var form = document.getElementById("activationForm");
  if (!Store || !form) return;

  var token = form.getAttribute("data-token") || "";
  var newPassword = document.getElementById("newPassword");
  var confirmPassword = document.getElementById("confirmPassword");
  var button = document.getElementById("activateButton");
  var status = document.getElementById("activateStatus");
  var successPanel = document.getElementById("successPanel");
  var successMessage = document.getElementById("successMessage");
  var newPasswordError = document.getElementById("newPassword-error");
  var confirmPasswordError = document.getElementById("confirmPassword-error");

  function setStatus(message, type) {
    status.textContent = message || "";
    status.classList.remove("is-info", "is-error");
    if (type) status.classList.add(type === "error" ? "is-error" : "is-info");
  }

  function setBusy(busy) {
    var label = button.querySelector(".login-button__label");
    button.disabled = busy;
    button.classList.toggle("is-loading", busy);
    if (label) label.textContent = busy ? "Activating" : "Activate my account";
  }

  function fieldOf(input) {
    return input ? input.closest(".field") : null;
  }

  function clearFieldError(input, errorElement) {
    var field = fieldOf(input);
    if (field) field.classList.remove("is-invalid");
    if (errorElement) errorElement.textContent = "";
  }

  function fieldError(input, errorElement, message) {
    var field = fieldOf(input);
    if (field) field.classList.add("is-invalid");
    if (errorElement) errorElement.textContent = message;
    if (input) input.focus();
  }

  function passwordProblem(value) {
    if (value.length < 10) return "Use at least 10 characters.";
    if (value.length > 128) return "Use 128 characters or fewer.";
    if (!/[a-z]/.test(value)) return "Include at least one lowercase letter.";
    if (!/[A-Z]/.test(value)) return "Include at least one uppercase letter.";
    if (!/[0-9]/.test(value)) return "Include at least one number.";
    return "";
  }

  function wirePasswordToggle(buttonId, input) {
    var toggle = document.getElementById(buttonId);
    if (!toggle || !input) return;

    toggle.addEventListener("click", function () {
      var visible = input.type === "text";
      input.type = visible ? "password" : "text";
      toggle.classList.toggle("is-visible", !visible);
      toggle.setAttribute("aria-pressed", String(!visible));
      toggle.setAttribute("aria-label", visible ? "Show password" : "Hide password");
      input.focus();
    });
  }

  wirePasswordToggle("toggleNewPassword", newPassword);
  wirePasswordToggle("toggleConfirmPassword", confirmPassword);

  newPassword.addEventListener("input", function () {
    clearFieldError(newPassword, newPasswordError);
    setStatus("", "");
  });

  confirmPassword.addEventListener("input", function () {
    clearFieldError(confirmPassword, confirmPasswordError);
    setStatus("", "");
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var value = newPassword.value;
    var confirm = confirmPassword.value;

    if (!token) {
      setStatus("This activation link is invalid. Ask your Administrator for a new one.", "error");
      return;
    }

    var problem = passwordProblem(value);
    if (problem) {
      fieldError(newPassword, newPasswordError, problem);
      return;
    }

    if (value !== confirm) {
      fieldError(confirmPassword, confirmPasswordError, "The two passwords do not match.");
      return;
    }

    clearFieldError(newPassword, newPasswordError);
    clearFieldError(confirmPassword, confirmPasswordError);
    setBusy(true);
    setStatus("Saving your password\u2026", "info");

    Store.activateStaffAccount(token, value, confirm).then(function (result) {
      setBusy(false);

      if (!result.ok) {
        setStatus(result.message, "error");
        return;
      }

      var username = result.body && result.body.username ? result.body.username : "";
      if (username && successMessage) {
        successMessage.textContent = "Sign in as @" + username + " with your new password.";
      }

      form.classList.add("is-hidden");
      var links = document.querySelector(".login-links");
      if (links) links.classList.add("is-hidden");
      successPanel.classList.remove("is-hidden");
      successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})(window, document);
