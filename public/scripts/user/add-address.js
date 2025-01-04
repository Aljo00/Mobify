// Attach event listener to the form
document
  .getElementById("addAddressForm")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent form submission
    if (validateForm()) {
      this.submit(); // Submit the form if validation passes
    }
  });

// Validate the entire form on submission
function validateForm() {
  let isValid = true;

  const addressType = document.querySelector(
    'input[name="addressType"]:checked'
  );
  const houseName = document.getElementById("houseName");
  const city = document.getElementById("city");
  const landMark = document.getElementById("landMark");
  const state = document.getElementById("state");
  const pincode = document.getElementById("pincode");
  const phone = document.getElementById("phone");
  const altPhone = document.getElementById("altPhone");

  // Validate each field and display error messages
  if (!addressType) {
    isValid = false;
    document.getElementById("addressTypeError").textContent =
      "Please select an address type.";
  } else {
    document.getElementById("addressTypeError").textContent = "";
  }

  isValid = validateInput(houseName, "House name is required.") && isValid;
  isValid = validateInput(city, "City is required.") && isValid;
  isValid = validateInput(landMark, "Landmark is required.") && isValid;
  isValid = validateInput(state, "State is required.") && isValid;
  isValid = validatePincode(pincode, "Pincode must be 6 digits.") && isValid;
  isValid = validatePhone(phone, "Phone number must be 10 digits.") && isValid;
  isValid =
    validatePhone(altPhone, "Alternate phone number must be 10 digits.") &&
    isValid;

  // Scroll to the first invalid field for better UX
  if (!isValid) {
    const firstInvalid = document.querySelector(".is-invalid");
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalid.focus();
    }
  }

  return isValid;
}

// Helper function for general input validation
function validateInput(input, errorMessage) {
  if (!input.value.trim()) {
    setValidationState(input, false, errorMessage);
    return false;
  } else {
    setValidationState(input, true, "");
    return true;
  }
}

// Helper function for phone number validation
function validatePhone(input, errorMessage) {
  const phonePattern = /^[0-9]{10}$/;
  const isValid = phonePattern.test(input.value.trim());
  setValidationState(input, isValid, errorMessage);
  return isValid;
}

// Helper function for pincode validation
function validatePincode(input, errorMessage) {
  const pincodePattern = /^[0-9]{6}$/;
  const isValid = pincodePattern.test(input.value.trim());
  setValidationState(input, isValid, errorMessage);
  return isValid;
}

// Helper function to set validation state
function setValidationState(input, isValid, errorMessage) {
  if (isValid) {
    input.classList.remove("is-invalid");
    input.classList.add("is-valid");
    input.nextElementSibling.textContent = "";
  } else {
    input.classList.add("is-invalid");
    input.classList.remove("is-valid");
    input.nextElementSibling.textContent = errorMessage;
  }
}