document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("resetPasswordForm");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");

  // Toggle password visibility
  document
    .getElementById("togglePassword")
    .addEventListener("click", function () {
      toggleVisibility(password, this);
    });

  document
    .getElementById("toggleConfirmPassword")
    .addEventListener("click", function () {
      toggleVisibility(confirmPassword, this);
    });

  function toggleVisibility(input, button) {
    const icon = button.querySelector("i");
    if (input.type === "password") {
      input.type = "text";
      icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      input.type = "password";
      icon.classList.replace("fa-eye-slash", "fa-eye");
    }
  }

  // Validate password requirements
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[@$!%*?&]/.test(password),
    };

    return Object.values(requirements).every(Boolean);
  };

  // Form submission with AJAX
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const passwordValue = password.value.trim();
    const confirmPasswordValue = confirmPassword.value.trim();

    // Validate password fields
    if (!validatePassword(passwordValue)) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Password must be at least 8 characters long and include an uppercase letter, lowercase letter, a number, and a special character.",
        showConfirmButton: true, // Adds the OK button
        confirmButtonText: "OK", // Label for the button
        allowOutsideClick: false,
      });
      return;
    }

    if (passwordValue !== confirmPasswordValue) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Passwords do not match. Please ensure both passwords are the same.",
        showConfirmButton: true, // Adds the OK button
        confirmButtonText: "OK", // Label for the button
        allowOutsideClick: false,
      });
      return;
    }

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

      // Safely parse JSON response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("JSON Parsing Error:", parseError);
        data = { message: "Unexpected error occurred" };
      }

      // Handle success and error based on status
      if (response.ok || response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Password Reset Successful",
          text: "Your password has been reset successfully!",
          showConfirmButton: false,
          allowOutsideClick: false,
        });
      } else {
        console.error("Error Response:", data);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Failed to reset password. Please try again.",
          showConfirmButton: true,
          confirmButtonText: "OK",
          allowOutsideClick: false,
        });
      }
    } catch (error) {
      console.error("Network or Server Error:", error);
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Something went wrong. Please try again later.",
        showConfirmButton: true,
        confirmButtonText: "OK",
        allowOutsideClick: false,
      });
    }
  });
});
