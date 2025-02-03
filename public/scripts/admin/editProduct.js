// Attach event listener to publish button
const publishButton = document.getElementById("publishBtn");
publishButton.addEventListener("click", validateAndSubmit);

function validateAndSubmit(event) {
  event.preventDefault();
  console.log('🚀 Starting form submission');

  if (validateForm()) {
    // Get form data
    const formElement = document.getElementById('editProductForm');
    const formData = new FormData(formElement);

    // Log form data for debugging
    console.log('Form action:', formElement.action);
    formData.forEach((value, key) => {
      console.log(`${key}:`, value);
    });

    // Get all combos with unique IDs
    const combos = Array.from(document.querySelectorAll('.combo-row')).map((row, index) => ({
      id: index,
      ram: row.querySelector('input[name="ram"]').value.trim(),
      storage: row.querySelector('input[name="storage"]').value.trim(),
      quantity: parseInt(row.querySelector('input[name="quantity"]').value),
      regularPrice: parseFloat(row.querySelector('input[name="regularPrice"]').value),
      salePrice: parseFloat(row.querySelector('input[name="salePrice"]').value),
      color: row.querySelector('input[name="color"]').value.trim()
    }));

    // Remove any existing combos data
    formData.delete('combos');
    
    // Add the stringified combos data
    formData.append('combos', JSON.stringify(combos));

    // Show loading state with progress
    const loadingToast = Swal.fire({
      title: 'Updating Product...',
      html: 'Please wait while we process your request',
      timerProgressBar: true,
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false
    });

    // Make the fetch request
    fetch(formElement.action, {
      method: 'POST',
      body: formData
    })
    .then(async response => {
      const responseData = await response.json();
      console.log('Server response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update product');
      }
      
      return responseData;
    })
    .then(data => {
      loadingToast.close();
      
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: data.message,
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        window.location.href = '/admin/products';
      });
    })
    .catch(error => {
      console.error('Update error:', error);
      loadingToast.close();
      
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message,
        confirmButtonText: 'Try Again'
      });
    });
  }
}

function collectComboData() {
  const comboRows = document.querySelectorAll('.combo-row');
  return Array.from(comboRows).map(row => ({
    ram: row.querySelector('input[name="ram"]').value.trim(),
    storage: row.querySelector('input[name="storage"]').value.trim(),
    quantity: parseInt(row.querySelector('input[name="quantity"]').value),
    regularPrice: parseFloat(row.querySelector('input[name="regularPrice"]').value),
    salePrice: parseFloat(row.querySelector('input[name="salePrice"]').value),
    color: row.querySelector('input[name="color"]').value.trim()
  }));
}

// View Image and Enable Cropping
function viewImage(event, index) {
  const input = event.target;
  const reader = new FileReader();

  reader.onload = () => {
    const dataURL = reader.result;
    const image = document.getElementById("imgView" + index);
    image.src = dataURL;

    const cropper = new Cropper(image, {
      aspectRatio: 1,
      viewMode: 1,
      guides: true,
      background: false,
      autoCropArea: 1,
      zoomable: true,
      ready() {
        // Set the crop box dimensions here
        this.cropper.setCropBoxData({
          width: 283.15,
          height: 220,
        });
      },
    });

    const cropperContainer = document.querySelector(
      "#croppedImg" + index
    ).parentNode;
    cropperContainer.style.display = "block";

    const saveButton = document.querySelector("#saveButton" + index);
    saveButton.addEventListener("click", async () => {
      const croppedCanvas = cropper.getCroppedCanvas({
        width: image.naturalWidth, // Use the natural width of the image
        height: image.naturalHeight, // Use the natural height of the image
      });

      const croppedImage = document.getElementById("croppedImg" + index);
      croppedImage.src = croppedCanvas.toDataURL("image/png"); // Use lossless PNG format

      const timestamp = new Date().getTime();
      const fileName = `cropped-img-${timestamp}-${index}.png`;

      await croppedCanvas.toBlob((blob) => {
        const input = document.getElementById("input" + index);
        const imgFile = new File([blob], fileName, { type: blob.type });
        const fileList = new DataTransfer();
        fileList.items.add(imgFile);
        input.files = fileList.files;
      }, "image/png"); // Use lossless format

      cropperContainer.style.display = "none";
      cropper.destroy();
    });
  };

  reader.readAsDataURL(input.files[0]);
}

// Update the validateForm function
function validateForm() {
  clearErrorMessages();
  let isValid = true;
  const errors = {};

  // Debug log
  console.log('Starting validation...');

  // Get form values
  const formData = {
    productName: document.querySelector('input[name="productName"]').value.trim(),
    description: document.querySelector('#descriptionid').value.trim(),
    brand: document.querySelector('select[name="brand"]').value.trim(),
    category: document.querySelector('select[name="category"]').value.trim()
  };

  // Debug log form values
  console.log('Form values:', formData);

  // Basic field validation
  if (!formData.productName) errors.productName = 'Product name is required';
  if (!formData.description) errors.description = 'Description is required';
  if (!formData.brand) errors.brand = 'Brand is required';
  if (!formData.category) errors.category = 'Category is required';

  // Validate combos
  const combos = document.querySelectorAll('.combo-row');
  
  if (combos.length === 0) {
    errors.combos = 'At least one combination is required';
  } else {
    combos.forEach((combo, index) => {
      const ram = combo.querySelector('input[name="ram"]').value.trim();
      const storage = combo.querySelector('input[name="storage"]').value.trim();
      const quantity = combo.querySelector('input[name="quantity"]').value;
      const regularPrice = combo.querySelector('input[name="regularPrice"]').value;
      const salePrice = combo.querySelector('input[name="salePrice"]').value;
      const color = combo.querySelector('input[name="color"]').value.trim();

      // Validate each combo field
      if (!ram) errors[`combo-${index}-ram`] = 'RAM is required';
      if (!storage) errors[`combo-${index}-storage`] = 'Storage is required';
      if (!quantity || quantity < 1) errors[`combo-${index}-quantity`] = 'Valid quantity is required';
      if (!regularPrice || regularPrice <= 0) errors[`combo-${index}-price`] = 'Valid regular price is required';
      if (!salePrice || salePrice <= 0) errors[`combo-${index}-sale`] = 'Valid sale price is required';
      if (parseFloat(salePrice) >= parseFloat(regularPrice)) errors[`combo-${index}-sale`] = 'Sale price must be less than regular price';
      if (!color) errors[`combo-${index}-color`] = 'Color is required';
    });
  }

  // If there are any errors
  if (Object.keys(errors).length > 0) {
    console.log('Validation errors:', errors);
    isValid = false;

    // Show error messages
    Object.entries(errors).forEach(([field, message]) => {
      const errorDiv = document.getElementById(`${field}-error`) || 
                      document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = message;
      
      if (!errorDiv.id) {
        errorDiv.id = `${field}-error`;
        const inputElement = document.querySelector(`[name="${field}"]`);
        if (inputElement) {
          inputElement.parentNode.appendChild(errorDiv);
        }
      }
    });

    // Show summary alert
    Swal.fire({
      icon: 'warning',
      title: 'Validation Failed',
      html: Object.values(errors).map(err => `• ${err}`).join('<br>'),
      confirmButtonText: 'OK'
    });
  } else {
    console.log('Validation passed');
  }

  return isValid;
}

// Update error message display
function displayErrorMessage(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.innerHTML = `
      <div class="alert alert-danger alert-dismissible fade show mb-0">
        <i class="fas fa-exclamation-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    errorElement.style.display = 'block';
  }
}

// Add this helper function to validate specific fields
function validateField(value, rules) {
  if (!value && rules.required) {
    return rules.required;
  }
  if (rules.pattern && !rules.pattern.test(value)) {
    return rules.message;
  }
  if (rules.min && value < rules.min) {
    return `Value must be at least ${rules.min}`;
  }
  return null;
}

const addComboBtn = document.getElementById("addComboBtn");
const productCombosContainer = document.getElementById("product-combos");

// Add Event Listener for "Add Another Combo" Button
addComboBtn.addEventListener("click", () => {
  // Create a new combo row
  const newRow = document.createElement("div");
  newRow.classList.add("row", "combo-row");

  newRow.innerHTML = `
        <div class="col-lg-3">
            <label class="form-label">RAM</label>
            <input name="ram" type="text" class="form-control border" required>
            <div id="comboRAM-error" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Storage</label>
            <input name="storage" type="text" class="form-control border" required>
            <div id="comboStorage-error" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Quantity</label>
            <input name="quantity" type="number" class="form-control border" required>
            <div id="comboQuantity-error" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Regular Price</label>
            <input name="regularPrice" type="number" class="form-control border" required>
            <div id="comboReg-error" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Sale Price</label>
            <input name="salePrice" type="number" class="form-control border" required>
            <div id="comboSale-error" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Color</label>
            <input name="color" type="text" class="form-control border" placeholder="e.g., Red, Blue, Green" required>
            <div id="comboColor-error" class="error-message"></div>+
        </div>
        <div class="col-lg-3 d-flex align-items-center">
            <button type="button" class="btn btn-danger delete-combo-btn">Delete</button>
        </div>
    `;

  // Append the new row to the product-combos container
  productCombosContainer.appendChild(newRow);

  // Attach delete functionality to the "Delete" button of the new row
  newRow
    .querySelector(".delete-combo-btn")
    .addEventListener("click", handleDeleteRow);
});

// Function to Handle Row Deletion
function handleDeleteRow() {
  const comboRows = document.querySelectorAll(".combo-row");

  // Prevent deletion if it's the only remaining row
  if (comboRows.length > 1) {
    this.closest(".combo-row").remove(); // Remove the current row
  } else {
    alert("At least one combo is required."); // Alert the user
  }
}

document.querySelectorAll(".delete-combo-btn").forEach((btn) => {
  btn.addEventListener("click", handleDeleteRow);
});

// Add event listeners for existing delete buttons (if any)
document.querySelectorAll(".delete-combo-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    btn.closest(".combo-row").remove(); // Remove the row
  });
});

// Display and Clear Error Messages
function displayErrorMessage(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.innerHTML = `
      <div class="error-toast animated slideInRight">
        <div class="error-toast-content">
          <i class="fas fa-exclamation-circle error-icon"></i>
          <span class="error-message-text">${message}</span>
        </div>
      </div>
    `;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorElement.querySelector('.error-toast').classList.add('slideOutRight');
      setTimeout(() => {
        errorElement.innerHTML = '';
      }, 300);
    }, 5000);
  }
}

function clearErrorMessages() {
  const errorElements = document.getElementsByClassName("error-message");
  Array.from(errorElements).forEach((element) => {
    element.innerText = "";
    element.style.display = "none";
  });
}

function validateCombo(combo, index) {
  const errors = {};
  
  const validations = {
    ram: {
      value: combo.querySelector('input[name="ram"]').value.trim(),
      rules: {
        required: "RAM specification is required",
        pattern: {
          regex: /^[0-9]+GB$/i,
          message: "RAM should be in format: 8GB"
        }
      }
    },
    storage: {
      value: combo.querySelector('input[name="storage"]').value.trim(),
      rules: {
        required: "Storage specification is required",
        pattern: {
          regex: /^[0-9]+(GB|TB)$/i,
          message: "Storage should be in format: 128GB or 1TB"
        }
      }
    },
    quantity: {
      value: parseInt(combo.querySelector('input[name="quantity"]').value),
      rules: {
        required: "Quantity is required",
        min: {
          value: 1,
          message: "Quantity must be at least 1"
        }
      }
    },
    regularPrice: {
      value: parseFloat(combo.querySelector('input[name="regularPrice"]').value),
      rules: {
        required: "Regular price is required",
        min: {
          value: 0,
          message: "Price cannot be negative"
        }
      }
    },
    salePrice: {
      value: parseFloat(combo.querySelector('input[name="salePrice"]').value),
      rules: {
        required: "Sale price is required",
        min: {
          value: 0,
          message: "Price cannot be negative"
        },
        lessThanRegular: {
          compare: parseFloat(combo.querySelector('input[name="regularPrice"]').value),
          message: "Sale price must be less than regular price"
        }
      }
    },
    color: {
      value: combo.querySelector('input[name="color"]').value.trim(),
      rules: {
        required: "Color is required",
        pattern: {
          regex: /^[A-Za-z]+(,[A-Za-z]+)*$/,
          message: "Colors should be comma-separated (e.g., Red,Blue,Black)"
        }
      }
    }
  };

  Object.entries(validations).forEach(([field, config]) => {
    const { value, rules } = config;
    
    if (rules.required && !value) {
      errors[`combo${field}-error-${index}`] = rules.required;
    } else if (rules.pattern && !rules.pattern.regex.test(value)) {
      // Changed from rules.pattern.test to rules.pattern.regex.test
      errors[`combo${field}-error-${index}`] = rules.pattern.message;
    } else if (rules.min && value < rules.min.value) {
      errors[`combo${field}-error-${index}`] = rules.min.message;
    } else if (rules.lessThanRegular && value >= rules.lessThanRegular.compare) {
      errors[`combo${field}-error-${index}`] = rules.lessThanRegular.message;
    }
  });

  return errors;
}

// Add this helper function for showing toasts
function showToast(message, type = 'error') {
  Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  }).fire({
    icon: type,
    title: message
  });
}

function deleteSingleImage(imageId, productId) {
  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: "/admin/deleteimage",
        method: "POST",
        data: {
          imagePublicId: imageId,
          productIdToServer: productId,
        },
        success: (response) => {
          if (response.status === true) {
            Swal.fire({
              icon: "success",
              title: "Success",
              text: response.message,
              showConfirmButton: false,
              timer: 1500,
            }).then(() => {
              window.location.reload();
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: response.message || "Failed to delete image",
              showConfirmButton: true,
            });
          }
        },
        error: (xhr) => {
          const errorMessage =
            xhr.responseJSON?.message ||
            "Something went wrong. Please try again.";
          Swal.fire({
            icon: "error",
            title: "Error",
            text: errorMessage,
            showConfirmButton: true,
          });
        },
      });
    }
  });
}
