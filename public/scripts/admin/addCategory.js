function handleFormSumbit(event) {
    event.preventDefault(); // Prevent default form submission

    if (!validateForm()) {
        return;
    }

    const name = document.getElementById("name").value;
    const description = document.getElementById("description").value;

    fetch('/admin/addCategory', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error);
                });
            }
            return response.json();
        })
        .then(data => {
            Swal.fire({
                icon: 'success',
                title: "Success",
                text: "Category added successfully",
            });
            document.getElementById("name").value = "";
            document.getElementById("description").value = "";
        })
        .catch(error => {
            if (error.message === "Category already exists..") {
                Swal.fire({
                    icon: 'error',
                    title: "Oops",
                    text: "Category already exists..",
                });
                document.getElementById("name").value = "";
                document.getElementById("description").value = "";
            } else {
                Swal.fire({
                    icon: 'error',
                    title: "Oops",
                    text: "An error occurred in adding category",
                });
            }
        });
}

function validateForm() {
    clearErrorMessages();
    const name = document.getElementById("name").value.trim();
    const description = document.getElementById("description").value.trim();
    let isValid = true;

    if (name === "") {
        displayErrorMessage("name-error", "Please enter a name");
        isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(name)) {
        displayErrorMessage("name-error", "Name field only contains alphabets");
        isValid = false;
    }

    if (description === "") {
        displayErrorMessage("description-error", "Please enter a description");
        isValid = false;
    }

    return isValid;
}

function displayErrorMessage(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.innerText = message;
    errorElement.style.display = "block";
}

function clearErrorMessages() {
    const errorElements = document.getElementsByClassName("error-message");
    Array.from(errorElements).forEach((element) => {
        element.innerText = "";
        element.style.display = "none";
    });
}

function softDeleteCategory(categoryId) {
    if (confirm("Are you sure you want to delete this category?")) {
        fetch(`/admin/deleteCategory/${categoryId}`, {
            method: "POST",
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.message) {
                    alert(data.message);
                    location.reload(); // Reload the page after deletion
                } else {
                    alert(data.error);
                }
            })
            .catch((error) => {
                console.error("Error:", error);
                alert("Failed to delete category.");
            });
    }
}