// Attach event listener to publish button
const publishButton = document.getElementById("publishBtn");
publishButton.addEventListener("click", validateAndSubmit);

function validateAndSubmit(event) {
  event.preventDefault();

  if (validateForm()) {
    // Show SweetAlert2 loading indicator
    Swal.fire({
      title: 'Adding Product...',
      html: 'Please wait while we process your request',
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      }
    });

    // Collect combo data from the form
    let combos = [];
    const comboRows = document.querySelectorAll(".combo-row");

    comboRows.forEach((row) => {
      const ram = row.querySelector('input[name="ram"]').value;
      const storage = row.querySelector('input[name="storage"]').value;
      const quantity = row.querySelector('input[name="quantity"]').value;
      const regularPrice = row.querySelector(
        'input[name="regularPrice"]'
      ).value;
      const salePrice = row.querySelector('input[name="salePrice"]').value;
      const color = row.querySelector('input[name="color"]').value;

      combos.push({
        ram: ram,
        storage: storage,
        quantity: quantity,
        regularPrice: regularPrice,
        salePrice: salePrice,
        color: color,
      });
    });

    // Add combos as a hidden field (sending JSON string)
    const combosField = document.createElement("input");
    combosField.type = "hidden";
    combosField.name = "combos";
    combosField.value = JSON.stringify(combos); // Convert the combos array to a JSON string
    document.forms[0].appendChild(combosField);

    // Submit the form using AJAX
    const formData = new FormData(document.forms[0]);
    fetch(document.forms[0].action, {
      method: "POST",
      body: formData,
    })
      .then(async (response) => {
        try {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to add product');
          }
          return data;
        } catch (error) {
          Swal.close(); // Close loading indicator
          throw error;
        }
      })
      .then((data) => {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: data.message || "Product added successfully",
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          window.location.href = "/admin/products";
        });
      })
      .catch((error) => {
        console.error('Error:', error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "Failed to add product. Please try again.",
          confirmButtonColor: '#d33',
        });
      });
  }
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
          width: this.cropper.getContainerData().width * 0.7, // Example: 70% of container width
          height: this.cropper.getContainerData().height * 0.5, // Example: 50% of container height
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

function validateForm() {
  clearErrorMessages();
  let isValid = true;

  // Validate Brand
  const brand = document.querySelector('select[name="brand"]').value;
  if (!brand) {
    displayErrorMessage("brand-error", "Please select a brand");
    isValid = false;
  }

  // Validate Category
  const category = document.querySelector('select[name="category"]').value;
  if (!category) {
    displayErrorMessage("category-error", "Please select a category");
    isValid = false;
  }

  const comboSet = new Set();

  // Validate Product Name
  const name = document.getElementsByName("productName")[0].value.trim();
  if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
    displayErrorMessage(
      "productName-error",
      "Product name should contain only alphabetic characters and numbers."
    );
    isValid = false;
  }

  // Validate Product Description
  const description = document.getElementById("descriptionid").value.trim();
  if (!/.+/.test(description)) {
    displayErrorMessage(
      "description-error",
      "Product description cannot be empty."
    );
    isValid = false;
  }

  // Validate Combos
  const combos = document.querySelectorAll(".combo-row");
  combos.forEach((combo) => {
    const ram = parseFloat(combo.querySelector('input[name="ram"]').value);
    const storage = parseFloat(combo.querySelector('input[name="storage"]').value);
    const quantity = parseInt(combo.querySelector('input[name="quantity"]').value);
    const regularPrice = parseFloat(combo.querySelector('input[name="regularPrice"]').value);
    const salePrice = parseFloat(combo.querySelector('input[name="salePrice"]').value);
    const color = combo.querySelector('input[name="color"]').value.trim();

    // Get error elements specific to this combo row
    const ramError = combo.querySelector('[id^="comboRAM-error"]');
    const storageError = combo.querySelector('[id^="comboStorage-error"]');
    const quantityError = combo.querySelector('[id^="comboQuantity-error"]');
    const regError = combo.querySelector('[id^="comboReg-error"]');
    const saleError = combo.querySelector('[id^="comboSale-error"]');
    const colorError = combo.querySelector('[id^="comboColor-error"]');

    // Validate RAM (should be a positive number)
    if (isNaN(ram) || ram <= 0) {
      ramError.innerText = "RAM must be a positive number";
      ramError.style.display = "block";
      isValid = false;
    }

    // Validate Storage (should be a positive number)
    if (isNaN(storage) || storage <= 0) {
      storageError.innerText = "Storage must be a positive number";
      storageError.style.display = "block";
      isValid = false;
    }

    // Validate Quantity
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      quantityError.innerText = "Quantity must be a positive number";
      quantityError.style.display = "block";
      isValid = false;
    }

    // Validate Regular Price
    const regularPriceNum = parseFloat(regularPrice);
    if (isNaN(regularPriceNum) || regularPriceNum <= 0) {
      regError.innerText = "Regular price must be a positive number";
      regError.style.display = "block";
      isValid = false;
    }

    // Validate Sale Price
    const salePriceNum = parseFloat(salePrice);
    if (isNaN(salePriceNum) || salePriceNum <= 0) {
      saleError.innerText = "Sale price must be a positive number";
      saleError.style.display = "block";
      isValid = false;
    }

    // Validate Price Comparison
    if (regularPriceNum <= salePriceNum) {
      regError.innerText = "Regular price must be greater than sale price";
      regError.style.display = "block";
      isValid = false;
    }

    // Validate Color (should not be empty and contain only letters and spaces)
    if (!color || !/^[a-zA-Z\s,]+$/.test(color)) {
      colorError.innerText = "Color must contain only letters and spaces";
      colorError.style.display = "block";
      isValid = false;
    }

    // Check for duplicate combos
    const comboKey = `${ram}-${storage}-${color}`;
    if (comboSet.has(comboKey)) {
      ramError.innerText = "Duplicate combo detected";
      ramError.style.display = "block";
      isValid = false;
    } else {
      comboSet.add(comboKey);
    }
  });

  // Validate Images
  const images = document.querySelectorAll('input[type="file"]');
  let imageCount = 0;
  images.forEach((input) => {
    if (input.files.length > 0) imageCount++;
  });
  if (imageCount < 2) {
    displayErrorMessage(
      "images-error",
      "At least two images must be selected."
    );
    isValid = false;
  }

  if (!isValid) {
    // If form is invalid, ensure preloader is hidden
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.style.display = 'none';
    }
  }

  return isValid;
}

function displayErrorMessage(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.innerText = message;
    errorElement.style.display = "block";
    errorElement.classList.add("shake");
    setTimeout(() => {
      errorElement.classList.remove("shake");
    }, 500);
  }
}

function clearErrorMessages() {
  const errorElements = document.getElementsByClassName("error-message");
  Array.from(errorElements).forEach((element) => {
    element.innerText = "";
    element.style.display = "none";
  });
}

const addComboBtn = document.getElementById("addComboBtn");
const productCombosContainer = document.getElementById("product-combos");

// Add Event Listener for "Add Another Combo" Button
addComboBtn.addEventListener("click", () => {
  // Create a new combo row
  const newRow = document.createElement("div");
  newRow.classList.add("row", "combo-row", "mb-3");

  const comboIndex = document.querySelectorAll(".combo-row").length;

  newRow.innerHTML = `
        <div class="col-lg-3">
            <label class="form-label">RAM</label>
            <input name="ram" type="number" min="1" class="form-control border" placeholder="Enter RAM in GB" required>
            <div id="comboRAM-error-${comboIndex}" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Storage</label>
            <input name="storage" type="number" min="1" class="form-control border" placeholder="Enter Storage in GB" required>
            <div id="comboStorage-error-${comboIndex}" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Quantity</label>
            <input name="quantity" type="number" min="1" class="form-control border" required>
            <div id="comboQuantity-error-${comboIndex}" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Regular Price</label>
            <input name="regularPrice" type="number" min="0.01" step="0.01" class="form-control border" required>
            <div id="comboReg-error-${comboIndex}" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Sale Price</label>
            <input name="salePrice" type="number" min="0.01" step="0.01" class="form-control border" required>
            <div id="comboSale-error-${comboIndex}" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Color</label>
            <input name="color" type="text" class="form-control border" placeholder="e.g., Red, Blue, Green" pattern="^[a-zA-Z\\s,]+$" required>
            <div id="comboColor-error-${comboIndex}" class="error-message"></div>
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

// Add event listeners for existing delete buttons (if any)
document.querySelectorAll(".delete-combo-btn").forEach((btn) => {
  btn.addEventListener("click", handleDeleteRow);
});
