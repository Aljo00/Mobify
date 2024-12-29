// Attach event listener to publish button
const publishButton = document.getElementById('publishBtn');
publishButton.addEventListener('click', validateAndSubmit);

function validateAndSubmit(event) {
  event.preventDefault();

  if (validateForm()) {
    // Collect combo data from the form
    let combos = [];
    const comboRows = document.querySelectorAll('.combo-row');

    comboRows.forEach((row) => {
      const ram = row.querySelector('input[name="ram"]').value;
      const storage = row.querySelector('input[name="storage"]').value;
      const quantity = row.querySelector('input[name="quantity"]').value;
      const regularPrice = row.querySelector('input[name="regularPrice"]').value;
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
    const combosField = document.createElement('input');
    combosField.type = 'hidden';
    combosField.name = 'combos';
    combosField.value = JSON.stringify(combos); // Convert the combos array to a JSON string
    document.forms[0].appendChild(combosField);

    // Submit the form using AJAX
    const formData = new FormData(document.forms[0]);
    fetch(document.forms[0].action, {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data); // Log the response for debugging
        if (data.message) {
          Swal.fire({
            icon: 'success',
            title: 'Added Successfully',
            text: data.message,
            timer: 1000,
            showConfirmButton: false,
          }).then(() => {
            window.location.href = '/admin/products';
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: data.error || 'An error occurred while adding the product.',
            timer: 1000,
            showConfirmButton: false,
          });
        }
      })
      .catch((error) => {
        console.error(error); // Log the error for debugging
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'An error occurred while adding the product.',
          timer: 1000,
          showConfirmButton: false,
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
    const image = document.getElementById('imgView' + index);
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

    const cropperContainer = document.querySelector('#croppedImg' + index).parentNode;
    cropperContainer.style.display = 'block';

    const saveButton = document.querySelector('#saveButton' + index);
    saveButton.addEventListener('click', async () => {
      const croppedCanvas = cropper.getCroppedCanvas({
        width: 283.15,
        height: 220,
      });
      const croppedImage = document.getElementById('croppedImg' + index);
      croppedImage.src = croppedCanvas.toDataURL('image/jpeg', 1.0);

      const timestamp = new Date().getTime();
      const fileName = `cropped-img-${timestamp}-${index}.png`;

      await croppedCanvas.toBlob((blob) => {
        const input = document.getElementById('input' + index);
        const imgFile = new File([blob], fileName, { type: blob.type });
        const fileList = new DataTransfer();
        fileList.items.add(imgFile);
        input.files = fileList.files;
      });

      cropperContainer.style.display = 'none';
      cropper.destroy();
    });
  };

  reader.readAsDataURL(input.files[0]);
}

function validateForm() {
  clearErrorMessages();
  let isValid = true;

  const comboSet = new Set();

  // Validate Product Name
  const name = document.getElementsByName('productName')[0].value.trim();
  if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
    displayErrorMessage('productName-error', 'Product name should contain only alphabetic characters and numbers.');
    isValid = false;
  }

  // Validate Product Description
  const description = document.getElementById('descriptionid').value.trim();
  if (!/.+/.test(description)) {
    displayErrorMessage('description-error', 'Product description cannot be empty.');
    isValid = false;
  }

  // Validate Combos
  const combos = document.querySelectorAll('.combo-row');
  combos.forEach((combo, index) => {
    const ram = combo.querySelector('input[name="ram"]').value.trim();
    const storage = combo.querySelector('input[name="storage"]').value.trim();
    const quantity = combo.querySelector('input[name="quantity"]').value.trim();
    const regularPrice = combo.querySelector('input[name="regularPrice"]').value.trim();
    const salePrice = combo.querySelector('input[name="salePrice"]').value.trim();
    const color = combo.querySelector('input[name="color"]').value.trim();

    // Check if any field is empty
    if (ram === '') {
      displayErrorMessage(`comboRAM-error-${index}`, 'This is Empty');
      isValid = false;
    }

    if (storage === '') {
      displayErrorMessage(`comboStorage-error-${index}`, 'This is Empty');
      isValid = false;
    }

    if (quantity === '') {
      displayErrorMessage(`comboQuantity-error-${index}`, 'This is Empty');
      isValid = false;
    }

    if (regularPrice === '') {
      displayErrorMessage(`comboReg-error-${index}`, 'This is Empty');
      isValid = false;
    }

    if (salePrice === '') {
      displayErrorMessage(`comboSale-error-${index}`, 'This is Empty');
      isValid = false;
    }

    if (color === '') {
      displayErrorMessage(`comboColor-error-${index}`, 'This is Empty');
      isValid = false;
    }

    // Check if regular price is greater than sale price
    if (parseFloat(regularPrice) <= parseFloat(salePrice)) {
      displayErrorMessage(`comboReg-error-${index}`, 'Regular price must be greater than sale price.');
      isValid = false;
    }

    // Check for duplicate combos
    const comboKey = `${ram}-${storage}-${regularPrice}-${salePrice}-${color}`;
    if (comboSet.has(comboKey)) {
      displayErrorMessage(`combo-error-${index}`, 'Duplicate combo detected.');
      isValid = false;
    } else {
      comboSet.add(comboKey); // Add comboKey to the set if unique
    }
  });

  // Validate Images
  const images = document.querySelectorAll('input[type="file"]');
  let imageCount = 0;
  images.forEach((input) => {
    if (input.files.length > 0) imageCount++;
  });
  if (imageCount < 2) {
    displayErrorMessage('images-error', 'At least two images must be selected.');
    isValid = false;
  }

  return isValid; // Return the overall validation result
}

// Display and Clear Error Messages
function displayErrorMessage(elementId, message) {
  const errorElement = document.getElementById(elementId);
  errorElement.innerText = message;
  errorElement.style.display = 'block';
  errorElement.classList.add('shake');
  setTimeout(() => {
    errorElement.classList.remove('shake');
  }, 500);
}

function clearErrorMessages() {
  const errorElements = document.getElementsByClassName('error-message');
  Array.from(errorElements).forEach((element) => {
    element.innerText = '';
    element.style.display = 'none';
  });
}

const addComboBtn = document.getElementById('addComboBtn');
const productCombosContainer = document.getElementById('product-combos');

// Add Event Listener for "Add Another Combo" Button
addComboBtn.addEventListener('click', () => {
  // Create a new combo row
  const newRow = document.createElement('div');
  newRow.classList.add('row', 'combo-row');

  const comboIndex = document.querySelectorAll('.combo-row').length;

  newRow.innerHTML = `
        <div class="col-lg-3">
            <label class="form-label">RAM</label>
            <input name="ram" type="text" class="form-control border" required>
            <div id="comboRAM-error-${comboIndex}" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Storage</label>
            <input name="storage" type="text" class="form-control border" required>
            <div id="comboStorage-error-${comboIndex}" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Quantity</label>
            <input name="quantity" type="number" class="form-control border" required>
            <div id="comboQuantity-error-${comboIndex}" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Regular Price</label>
            <input name="regularPrice" type="number" class="form-control border" required>
            <div id="comboReg-error-${comboIndex}" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Sale Price</label>
            <input name="salePrice" type="number" class="form-control border" required>
            <div id="comboSale-error-${comboIndex}" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Color</label>
            <input name="color" type="text" class="form-control border" placeholder="e.g., Red, Blue, Green" required>
            <div id="comboColor-error-${comboIndex}" class="error-message"></div>
        </div>
        <div class="col-lg-3 d-flex align-items-center">
            <button type="button" class="btn btn-danger delete-combo-btn">Delete</button>
        </div>
    `;

  // Append the new row to the product-combos container
  productCombosContainer.appendChild(newRow);

  // Attach delete functionality to the "Delete" button of the new row
  newRow.querySelector('.delete-combo-btn').addEventListener('click', handleDeleteRow);
});

// Function to Handle Row Deletion
function handleDeleteRow() {
  const comboRows = document.querySelectorAll('.combo-row');

  // Prevent deletion if it's the only remaining row
  if (comboRows.length > 1) {
    this.closest('.combo-row').remove(); // Remove the current row
  } else {
    alert('At least one combo is required.'); // Alert the user
  }
}

// Add event listeners for existing delete buttons (if any)
document.querySelectorAll('.delete-combo-btn').forEach((btn) => {
  btn.addEventListener('click', handleDeleteRow);
});
