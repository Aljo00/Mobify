// const cropper = require("cropper")

function validateAndSubmit(params) {
    if(validateForm()){
        document.forms[0].submit();
    }
}

function viewImage1(event) {

    document.getElementById("imgView1").src = URL.createObjectURL(event.target.files[0])
    
}

function viewImage2(event) {

    document.getElementById("imgView2").src = URL.createObjectURL(event.target.files[0])
    
}

function viewImage3(event) {

    document.getElementById("imgView3").src = URL.createObjectURL(event.target.files[0])
    
}

function viewImage4(event) {

    document.getElementById("imgView4").src = URL.createObjectURL(event.target.files[0])
    
}

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
        });

        const cropperContainer = document.querySelector("#croppedImg" + index).parentNode;
        cropperContainer.style.display = "block";

        const saveButton = document.querySelector("#saveButton" + index);
        saveButton.addEventListener('click', async () => {
            const croppedCanvas = cropper.getCroppedCanvas();
            const croppedImage = document.getElementById('croppedImg' + index);
            croppedImage.src = croppedCanvas.toDataURL('image/jpeg', 1.0);

            const timestamp = new Date().getTime();
            const fileName = `cropped-img-${timestamp}-${index}.png`;

            await croppedCanvas.toBlob(blob => {
                const input = document.getElementById('input' + index);
                const imgFile = new File([blob], fileName, { type: blob.type });
                const fileList = new DataTransfer();
                fileList.items.add(imgFile);
                input.files = fileList.files;
            });

            cropperContainer.style.display = "none";
            cropper.destroy();
        });
    };

    reader.readAsDataURL(input.files[0]);
}

function validateForm() {
    clearErrorMessages();
    const name = document.getElementsByName('productName')[0].value;
    const description = document.getElementById('descriptionid').value;
    const price = document.getElementsByName('regularPrice')[0].value;
    const saleprice = document.getElementsByName('salePrice')[0].value;
    const color = document.getElementsByName('color')[0].value;
    const images = document.getElementById('input1')
    const quantity=document.getElementsByName('quantity')
    let isValid = true
    if (name.trim() === "") {
displayErrorMessage('productName-error', 'Please enter a product name.');
isValid = false;
} else if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
displayErrorMessage('productName-error', 'Product name should contain only alphabetic characters.');
isValid = false;
}

if (description.trim() === "") {
displayErrorMessage('description-error', 'Please enter a product description.');
isValid = false;
} else if (!/^[a-zA-Z\s]+$/.test(description.trim())) {
displayErrorMessage('description-error', 'Product description should contain only alphabetic characters.');
isValid = false;
}





    if ( parseInt(quantity) < 0) {
        displayErrorMessage('quantity-error', 'Please enter a valid non-negative quantity.');
        isValid = false;
    }




    if (!/^\d+(\.\d{1,2})?$/.test(price) || parseFloat(price) < 0) {
        displayErrorMessage('regularPrice-error', 'Please enter a valid non-negative price.');
        isValid = false;
    }




    if (!/^\d+(\.\d{1,2})?$/.test(saleprice) || parseFloat(saleprice) < 0) {
        displayErrorMessage('salePrice-error', 'Please enter a valid non-negative price.');
        isValid = false;
    }
    if (parseFloat(price) <= parseFloat(saleprice)) {
displayErrorMessage('regularPrice-error', 'Regular price must be greater than sale price.');
isValid = false;
}


    if (color.trim() === "") {
        displayErrorMessage('color-error', 'Please enter a color.');
        isValid = false;
    }


    if (images.files.length === 0) {
        displayErrorMessage("images-error",'Please select an image.');
        isValid = false;
    }
    return isValid;
}


function displayErrorMessage(elementId, message) {
    var errorElement = document.getElementById(elementId);
    errorElement.innerText = message;
    errorElement.style.display = "block";
}


function clearErrorMessages() {
    const errorElements = document.getElementsByClassName('error-message');
    Array.from(errorElements).forEach(element => {
        element.innerText = '';
    });
    const errorMessage = document.getElementById('errorMessage');


}
