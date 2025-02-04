function validateBrandForm(brandName) {
    if (!brandName || brandName.trim().length < 2) {
        return "Brand name must be at least 2 characters long";
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(brandName)) {
        return "Brand name can only contain letters, numbers, spaces and hyphens";
    }
    return null;
}

function updateBrand(brandId) {
    fetch(`/admin/brands/${brandId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const brand = data.brand;
                document.getElementById('updateBrandId').value = brand._id;
                document.getElementById('updateBrandName').value = brand.brandName;
                document.getElementById('currentBrandImage').src = `/uploads/re-image/${brand.brandImage}`;
                
                const updateModal = new bootstrap.Modal(document.getElementById('updateBrandModal'));
                updateModal.show();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to fetch brand details'
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Something went wrong!'
            });
        });
}

document.getElementById('updateBrandForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const brandName = document.getElementById('updateBrandName').value;
    const validationError = validateBrandForm(brandName);
    
    if (validationError) {
        Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: validationError
        });
        return;
    }

    const formData = new FormData(this);
    const brandId = document.getElementById('updateBrandId').value;
    
    Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to update this brand?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, update it!'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/admin/brands/${brandId}`, {
                method: 'PUT',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Updated!',
                        text: 'Brand has been updated successfully.',
                        showConfirmButton: false,
                        timer: 1500
                    }).then(() => {
                        location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message || 'Failed to update brand'
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Something went wrong!'
                });
            });
        }
    });
});

// Add brand form validation
document.querySelector('form[action="/admin/addBrands"]').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const brandName = this.querySelector('input[name="brand"]').value;
    const validationError = validateBrandForm(brandName);
    
    if (validationError) {
        Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: validationError
        });
        return;
    }

    const fileInput = this.querySelector('input[type="file"]');
    if (fileInput.files.length === 0) {
        Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: 'Please select a brand image'
        });
        return;
    }

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(fileInput.files[0].type)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid File',
            text: 'Please upload only JPG, JPEG or PNG files'
        });
        return;
    }

    // File size validation (max 2MB)
    if (fileInput.files[0].size > 2 * 1024 * 1024) {
        Swal.fire({
            icon: 'error',
            title: 'File Too Large',
            text: 'Image size should not exceed 2MB'
        });
        return;
    }

    this.submit();
});

function deleteBrand(brandId) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/admin/brands/delete/${brandId}`, {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Deleted!',
                        text: 'Brand has been deleted successfully.',
                        showConfirmButton: false,
                        timer: 1500
                    }).then(() => {
                        location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Oops...',
                        text: data.message || 'Something went wrong!'
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Something went wrong!'
                });
            });
        }
    });
}

function loadDeletedBrands() {
    const table = document.getElementById('deletedBrandsTable');
    const tbody = document.getElementById('deletedBrandsBody');
    
    Swal.fire({
        title: 'Loading...',
        text: 'Fetching deleted brands',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    fetch('/admin/brands/deleted')
        .then(response => response.json())
        .then(data => {
            Swal.close();
            
            if (data.success) {
                if (!data.brands || data.brands.length === 0) {
                    Swal.fire({
                        icon: 'info',
                        title: 'No Deleted Brands',
                        text: 'There are no deleted brands to display'
                    });
                    table.style.display = 'none';
                    return;
                }

                tbody.innerHTML = data.brands.map(brand => `
                    <tr>
                        <td>${brand.brandName}</td>
                        <td>
                            <img src="/uploads/re-image/${brand.brandImage}" 
                                 alt="${brand.brandName}" 
                                 width="50" 
                                 height="50"
                                 class="rounded">
                        </td>
                        <td>
                            <button class="btn btn-success btn-sm" 
                                    onclick="restoreBrand('${brand._id}')">
                                <i class="fas fa-trash-restore me-2"></i>Restore
                            </button>
                        </td>
                    </tr>
                `).join('');
                
                table.style.display = 'block';
            } else {
                throw new Error(data.message || 'Failed to load deleted brands');
            }
        })
        .catch(error => {
            console.error('Error in loadDeletedBrands:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load deleted brands. Please try again.'
            });
            table.style.display = 'none';
        });
}

function showTopBrands() {
    fetch('/admin/brands/top')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('topBrandsTableBody');
                tbody.innerHTML = data.topBrands.map(brand => `
                    <tr>
                        <td>${brand._id}</td>
                        <td>${brand.totalOrders}</td>
                        <td>₹${brand.totalRevenue.toLocaleString()}</td>
                    </tr>
                `).join('');
                
                // Show the modal
                const modal = new bootstrap.Modal(document.getElementById('topBrandsModal'));
                modal.show();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to fetch top brands'
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Something went wrong!'
            });
        });
}

function restoreBrand(brandId) {
    Swal.fire({
        title: 'Restore Brand?',
        text: "This will make the brand active again",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, restore it!'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/admin/brands/restore/${brandId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Restored!',
                        text: 'Brand has been restored successfully.',
                        showConfirmButton: false,
                        timer: 1500
                    }).then(() => {
                        location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message || 'Failed to restore brand'
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Something went wrong!'
                });
            });
        }
    });
}
