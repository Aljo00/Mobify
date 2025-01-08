document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("editAccountForm");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    event.stopPropagation();

    const email = document.getElementById("email").value;
    const altEmail = document.getElementById("altEmail").value;
    const phone = document.getElementById("phone").value;
    const altPhone = document.getElementById("altPhone").value;

    let isValid = true;

    if (email === altEmail) {
      isValid = false;
      document.getElementById("altEmail").classList.add("is-invalid");
      document.getElementById("altEmail").nextElementSibling.textContent = "Alternate email must be different from the original email.";
    }

    if (phone === altPhone) {
      isValid = false;
      document.getElementById("altPhone").classList.add("is-invalid");
      document.getElementById("altPhone").nextElementSibling.textContent = "Alternate phone number must be different from the original phone number.";
    }

    if (isValid && form.checkValidity()) {
      try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          Swal.fire({
            icon: "success",
            title: "Success",
            text: result.message,
            timer: 1500,
            showConfirmButton: false,
          }).then(() => {
            window.location.href = "/account";
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: result.message,
            timer: 1500,
            showConfirmButton: false,
          });
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "An unexpected error occurred. Please try again.",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } else {
      form.classList.add("was-validated");
    }
  });

  const inputs = form.querySelectorAll("input[required], input[pattern]");

  inputs.forEach((input) => {
    input.addEventListener("input", function () {
      if (input.checkValidity()) {
        input.classList.remove("is-invalid");
        input.classList.add("is-valid");
      } else {
        input.classList.remove("is-valid");
        input.classList.add("is-invalid");
      }
    });
  });
});
