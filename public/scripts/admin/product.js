function softDeleteCategory(productId) {
    console.log("Product ID to delete:", productId); // Debug log
    if (!productId) {
        alert("Invalid Product ID.");
        return;
    }

    if (confirm("Are you sure you want to delete this Product?")) {
        fetch(`/admin/deleteProduct/${productId}`, {
            method: "POST",
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.message) {
                    alert(data.message);
                    location.reload();
                } else {
                    alert(data.error);
                }
            })
            .catch((error) => {
                console.error("Error:", error);
                alert("Failed to delete Product.");
            });
    }
}