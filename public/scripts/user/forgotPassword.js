document.addEventListener("DOMContentLoaded", function () {
  const email = document.getElementById("email");
  const form = document.getElementById("forgotPasswordForm");

  // Create error elements for each input
  const createErrorElement = (input) => {
    const errorDiv = document.createElement("div");
    errorDiv.className = "invalid-feedback";
    input.parentNode.appendChild(errorDiv);
    return errorDiv;
  };

  const errorElements = {
    email: createErrorElement(email),
  };

  // Validation patterns
  const patterns = {
    email: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  };

  // Error messages
  const errorMessages = {
    email: {
      required: "Please enter your email address",
      pattern: "Please enter a valid email address",
    },
  };

  // Real-time validation
  const validateInput = (input, pattern) => {
    const value = input.value.trim();
    const errorElement = errorElements[input.id];

    // Required field validation
    if (!value) {
      input.classList.add("is-invalid");
      input.classList.remove("is-valid");
      errorElement.textContent = errorMessages[input.id].required;
      return false;
    }

    // Pattern validation
    if (pattern && !pattern.test(value)) {
      input.classList.add("is-invalid");
      input.classList.remove("is-valid");
      errorElement.textContent = errorMessages[input.id].pattern;
      return false;
    }

    input.classList.remove("is-invalid");
    input.classList.add("is-valid");
    errorElement.textContent = ""; // Clear the error message
    return true;
  };

  // Add input event listener for real-time validation
  email.addEventListener("input", () => validateInput(email, patterns.email));

  // Form submission with AJAX and SweetAlert preloader
  form.addEventListener("submit", async function (e) {
    e.preventDefault(); // Prevent default form submission

    // Validate email field
    const isEmailValid = validateInput(email, patterns.email);

    if (!isEmailValid) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please enter a valid email address.",
        showConfirmButton: false,
        allowOutsideClick: false,
      });
      return;
    }

    // Show SweetAlert preloader
    Swal.fire({
      title: "Sending Email...",
      text: "Please wait while we process your request.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading(); // Show loading spinner
      },
    });

    // Prepare form data
    const formData = new FormData(form);
    const formObject = {};
    formData.forEach((value, key) => {
      formObject[key] = value;
    });

    try {
      // Send AJAX request
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formObject),
      });

      const data = await response.json();

      if (response.ok) {
        // Close the preloader and show success notification
        Swal.fire({
          icon: "success",
          title: "Email Sent",
          text: "A password reset link has been sent to your email.",
          showConfirmButton: false,
          allowOutsideClick: false,
        });
      } else {
        // Close the preloader and show error notification
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Failed to send email. Please try again.",
          showConfirmButton: false,
          allowOutsideClick: false,
        });
      }
    } catch (error) {
      // Close the preloader and show server error notification
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Something went wrong. Please try again later.",
        showConfirmButton: false,
        allowOutsideClick: false,
      });
    }
  });
});
