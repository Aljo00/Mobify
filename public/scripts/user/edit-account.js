let cropper;

// Open cropper modal when the user taps on the profile image
document
  .getElementById("profileImagePreview")
  .addEventListener("click", function () {
    const src = this.src; // Get current image source
    document.getElementById("cropImage").src = src;

    // Show modal
    const cropModal = new bootstrap.Modal(document.getElementById("cropModal"));
    cropModal.show();

    // Initialize Cropper.js after the modal is displayed
    document.getElementById("cropImage").onload = () => {
      if (cropper) {
        cropper.destroy();
      }
      cropper = new Cropper(document.getElementById("cropImage"), {
        aspectRatio: 1, // For a perfect circle
        viewMode: 1,
        autoCropArea: 1,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
      });
    };
  });

// Save cropped image
document
  .getElementById("saveCroppedImage")
  .addEventListener("click", function () {
    if (cropper) {
      // Get cropped image data
      const canvas = cropper.getCroppedCanvas({
        width: 100,
        height: 100,
      });

      // Convert canvas to a Data URL
      const croppedImageURL = canvas.toDataURL("image/png");

      // Update the profile image preview with the cropped image
      document.getElementById("profileImagePreview").src = croppedImageURL;

      // Close the modal
      const cropModal = bootstrap.Modal.getInstance(
        document.getElementById("cropModal")
      );
      cropModal.hide();

      // Optionally: Send the cropped image data to the server
      // Example:
      const formData = new FormData();
      formData.append("profileImage", croppedImageURL);
      fetch("/upload-profile-image", {
        method: "POST",
        body: formData,
      });
    }
  });

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

    // Email syntax validation
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(altEmail)) {
      isValid = false;
      document.getElementById("altEmail").classList.add("is-invalid");
      document.getElementById("altEmail").nextElementSibling.textContent =
        "Please enter a valid email address.";
    }

    if (email === altEmail) {
      isValid = false;
      document.getElementById("altEmail").classList.add("is-invalid");
      document.getElementById("altEmail").nextElementSibling.textContent =
        "Alternate email must be different from the original email.";
    }

    if (phone === altPhone) {
      isValid = false;
      document.getElementById("altPhone").classList.add("is-invalid");
      document.getElementById("altPhone").nextElementSibling.textContent =
        "Alternate phone number must be different from the original phone number.";
    }

    if (isValid && form.checkValidity()) {
      try {
        // Show preloader
        Swal.fire({
          title: "Updating...",
          text: "Please wait while we update your account.",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

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

  const profileImageInput = document.getElementById("profileImage");
  const profileImagePreview = document.getElementById("profileImagePreview");

  profileImageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        profileImagePreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
});
