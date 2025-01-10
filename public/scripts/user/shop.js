let currentProductCount = 6;

  function submitFilters() {
    document.getElementById('filtersForm').submit();
  }

  function clearFilters() {
    document.getElementById('category').value = "";
    document.getElementById('brand').value = "";
    document.getElementById('priceRange').value = "";
    document.getElementById('ram').value = "";
    document.getElementById('storage').value = "";
    document.getElementById('color').value = "";
    document.querySelectorAll('input[name="sort"]').forEach(input => input.checked = false);
    document.getElementById('filtersForm').submit();
  }

  function showMore() {
    const productContainer = document.getElementById('productContainer');
    const products = <%- JSON.stringify(products) %>;
    const newProducts = products.slice(currentProductCount, currentProductCount + 6);
    newProducts.forEach(product => {
      const productElement = document.createElement('div');
      productElement.className = 'col-lg-3 col-md-4 col-sm-6 col-12 mix new-arrivals mb-4';
      productElement.innerHTML = `
        <div class="product__item compact">
          <a href="/product/${product._id}">
            <div class="product__item__pic" style="background-image: url('${product.productImage[0]}');">
              <img src="${product.productImage[1]}" class="hover-image" alt="Second Image" />
              <span class="product-category ${product.category === 'New Phone' ? 'new-phone' : 'refurbished'}">${product.category}</span>
            </div>
          </a>
          <div class="product__item__text">
            <h6 class="product-name">${product.productName}</h6>
            <h5 class="product-price">
              ₹${product.combos[0].salePrice.toLocaleString()}
              <span class="text-muted">
                <del>₹${product.combos[0].regularPrice.toLocaleString()}</del>
              </span>
              ${product.combos[0].regularPrice > product.combos[0].salePrice ? `<span class="product-discount">-${Math.round(((product.combos[0].regularPrice - product.combos[0].salePrice) / product.combos[0].regularPrice) * 100)}%</span>` : ''}
            </h5>
            <div class="action-buttons">
              ${product.combos[0].quantity !== 0 ? `<a href="/addToCart?id=${product._id}" class="add-cart" data-id="${product._id}">Add To Cart</a>` : `<span class="add-cart" style="background-color: red">Out of Stock</span>`}
              <a href="/addToWishlist?id=${product._id}" class="wishlist-btn"><i class="fa fa-heart"></i></a>
            </div>
          </div>
        </div>
      `;
      productContainer.appendChild(productElement);
    });
    currentProductCount += 6;
    if (currentProductCount >= products.length) {
      document.getElementById('showMoreBtn').style.display = 'none';
    }
  }
