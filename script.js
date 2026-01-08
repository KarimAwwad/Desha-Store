document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ script.js loaded successfully, bestie!");

    /* --------------------------
        VARIABLE SETUP
    -------------------------- */
    const uploadPopup = document.getElementById("uploadPopup");
    const closeBtn = document.querySelector(".close-btn");
    const form = document.getElementById("productForm");
    const tagSwitch = document.getElementById("productTag");
    const tagLabel = document.getElementById("tagLabel");
    const categorySelect = document.getElementById("productCategory");
    const popupTitle = document.getElementById("popupTitle");

    const productImageInput = document.getElementById("productImage");
    const imagePreview = document.getElementById("imagePreview");
    const uploadText = document.getElementById("uploadText");
    const imageUploadBox = document.getElementById("imageUploadBox");

    const deletePopup = document.getElementById("deletePopup");
    const confirmDeleteBtn = document.getElementById("confirmDelete");
    const cancelDeleteBtn = document.getElementById("cancelDelete");

    // 🔥 LOCK THE TAG BUTTON (READ-ONLY)
    tagSwitch.checked = true;
    tagSwitch.disabled = true;
    tagSwitch.style.cursor = "not-allowed";
    tagLabel.textContent = "SALE";

    // State Variables
    let currentGrid = null;
    let editMode = false;
    let editingCard = null;
    let storedImageSrc = null;
    let rawFile = null;
    let cardToDelete = null;

    /* --------------------------
        🎨 TOAST NOTIFICATION SYSTEM
    -------------------------- */
    function showToast(message, isError = true) {
        // Remove existing toast if user clicks fast
        const existingToast = document.querySelector('.desha-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'desha-toast';
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">${isError ? '⚠️' : '✅'}</span>
                <span>${message}</span>
            </div>
        `;

        // Polished Styles matching Noon Aesthetic
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%) translateY(100px)',
            background: isError ? '#333' : '#4CAF50',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '50px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: '10000',
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            whiteSpace: 'nowrap'
        });

        document.body.appendChild(toast);

        // Animate In
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        // Animate Out & Remove
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    /* --------------------------
        📉 COMPRESSION ENGINE
    -------------------------- */

    // This function shrinks 3MB images to ~200KB instantly
    function compressImage(file) {
        return new Promise((resolve) => {
            const maxWidth = 800; // Max width in pixels (Amazon standard for lists)
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const elem = document.createElement('canvas');
                    const scaleFactor = maxWidth / img.width;

                    const finalWidth = img.width > maxWidth ? maxWidth : img.width;
                    const finalHeight = img.width > maxWidth ? img.height * scaleFactor : img.height;

                    elem.width = finalWidth;
                    elem.height = finalHeight;

                    const ctx = elem.getContext('2d');
                    ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

                    ctx.canvas.toBlob((blob) => {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    }, 'image/jpeg', 0.8);
                };
            };
        });
    }

    /* --------------------------
        🔌 SUPABASE HELPERS
    -------------------------- */

    async function uploadImageToSupabase(file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const {data, error} = await supabaseClient
            .storage
            .from('product-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error("Upload error:", error);
            return null;
        }

        const {data: {publicUrl}} = supabaseClient
            .storage
            .from('product-images')
            .getPublicUrl(filePath);

        return publicUrl;
    }

    async function saveProductToSupabase(product) {
        const {data, error} = await supabaseClient
            .from("products")
            .insert([product])
            .select()
            .single();

        if (error) {
            console.error("❌ Supabase insert error:", error);
            return null;
        }
        return data;
    }

    /* --------------------------
        ⚡ UI CREATION
    -------------------------- */
    function createProductCard(product, isTemp = false) {
        const isSale = true;
        let showNewTag = false;
        let diffInSeconds = 0;
        const sevenDaysInSeconds = 7 * 24 * 60 * 60;
        if (isTemp || !product.created_at) {
            showNewTag = true;
        } else {
            const createdDate = new Date(product.created_at);
            const now = new Date();
            diffInSeconds = (now - createdDate) / 1000;
            if (diffInSeconds < sevenDaysInSeconds) {
                showNewTag = true;
            }
        }
        const tagHTML = `
            <div class="tags">
                ${showNewTag ? '<div class="tag new-tag">NEW</div>' : ""}
                <div class="tag sale">SALE</div>
            </div>
        `;

        // 🆕 NEW: STOCK LOGIC FOR VISUAL OVERLAY
        const stockCount = product.stock_quantity !== undefined ? product.stock_quantity : 1;
        const isOutOfStock = !isTemp && stockCount <= 0;

        // 🔥 SAFETY UPDATE: Stock quantity turns red when it's 10 or below
        const isLowStock = stockCount > 0 && stockCount <= 10;

        // 🆕 NEW: CHECK LOCAL STORAGE FOR QUANTITY
        const cartData = JSON.parse(localStorage.getItem('desha_cart')) || [];
        const quantityInCart = cartData.filter(item => item.id === product.id).length;

        const card = document.createElement("article");
        card.classList.add("card");
        if (isTemp) card.classList.add("optimistic");

        if (product.id) {
            card.dataset.id = product.id;
        }

        card.dataset.category = product.category;
        // 🆕 Store stock value in the card itself for editing later
        card.dataset.stock = stockCount;

        card.innerHTML = `
            <div class="img-wrap">
                <img src="${product.image_url}" alt="${product.name}" loading="lazy" style="${isOutOfStock ? 'filter: grayscale(1); opacity: 0.6;' : ''}">
                ${tagHTML}
                ${isOutOfStock ? '<div class="out-of-stock-badge" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:white; padding:10px; border-radius:5px; font-weight:bold; z-index:10;">SOLD OUT</div>' : ''}
            </div>
            <div class="meta">
                <p class="price">${product.price} L.E</p>
                <p class="product-name">${product.name}</p>
                <p class="stock-info" style="font-size: 11px; color: ${isOutOfStock || isLowStock ? 'red' : '#888'}; margin-top: 4px; font-weight: ${isLowStock ? 'bold' : 'normal'};">
                    ${isOutOfStock ? 'Currently Out of Stock' : 'In Stock: ' + stockCount}
                </p>
            </div>
            <div class="card-actions" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
                <div class="admin-btns-row" style="display: flex; gap: 15px; justify-content: center; align-items: center; width: 100%;">
                    <button class="edit-btn">✏️ Edit</button>
                    <button class="delete-btn">🗑️ Delete</button>
                </div>
                ${!isOutOfStock ? `
                <div class="cart-controls-wrapper" style="width: 100%; margin-top: 10px;">
                    <button class="add-to-cart-btn" style="${(quantityInCart > 0) ? 'display:none;' : 'display:block; width:100%;'}">
                        🛒 Add to Cart
                    </button>
                    <div class="noon-qty-selector" style="${(quantityInCart > 0) ? 'display:flex;' : 'display:none;'} align-items: center; justify-content: space-between; border: 2px solid #007bff; border-radius: 50px; padding: 4px 12px; background: #fff;">
                        <button class="minus-btn" style="background:none; border:none; color:#007bff; font-size:20px; cursor:pointer; font-weight:bold;">−</button>
                        <span class="qty-display" style="font-weight:bold; font-size:15px; color:#333;">x${quantityInCart}</span>
                        <button class="plus-btn" style="background:none; border:none; color:#007bff; font-size:20px; cursor:pointer; font-weight:bold;">+</button>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        if (showNewTag) {
            const remainingTimeMs = Math.max(0, (sevenDaysInSeconds - diffInSeconds) * 1000);
            setTimeout(() => {
                const tag = card.querySelector(".new-tag");
                if (tag) {
                    tag.style.opacity = "0";
                    tag.style.transition = "opacity 0.5s ease";
                    setTimeout(() => tag.remove(), 500);
                }
            }, remainingTimeMs);
        }

        attachCardListeners(card);
        return card;
    }

    function insertCardIntoGrid(card, category) {
        const grid = document.querySelector(`#${category}Grid`);
        if (grid) {
            // 🔥 GHOST FIX: Prevent duplication if card ID already exists in this grid
            if (card.dataset.id && grid.querySelector(`[data-id="${card.dataset.id}"]`)) return;
            const uploadArea = grid.querySelector(".upload-area");
            grid.insertBefore(card, uploadArea);
        }
    }

    /* --------------------------
        🖼️ IMAGE PREVIEW
    -------------------------- */
    tagSwitch.addEventListener("change", () => {
        tagLabel.textContent = tagSwitch.checked ? "SALE" : "NEW";
    });

    imageUploadBox.addEventListener("click", () => productImageInput.click());

    productImageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        rawFile = file;

        const reader = new FileReader();
        reader.onload = (evt) => {
            imagePreview.src = evt.target.result;
            imagePreview.style.display = "block";
            uploadText.style.display = "none";
            storedImageSrc = evt.target.result;
        };
        reader.readAsDataURL(file);
    });

    /* --------------------------
        📦 POPUP LOGIC
    -------------------------- */
    document.querySelectorAll(".upload-area").forEach(trigger => {
        trigger.addEventListener("click", () => {
            uploadPopup.style.display = "flex";
            currentGrid = trigger.closest(".grid");

            editMode = false;
            editingCard = null;
            storedImageSrc = null;
            rawFile = null;

            form.reset();

            // 🆕 Set default stock to 10 when opening add modal
            const stockInput = document.getElementById("productStock");
            if (stockInput) stockInput.value = 10;

            tagSwitch.checked = true;
            tagLabel.textContent = "SALE";

            imagePreview.style.display = "none";
            uploadText.style.display = "block";

            popupTitle.textContent = "Add New Product";
            form.querySelector("button[type='submit']").textContent = "Add Product";

            if (currentGrid.id.includes("men")) categorySelect.value = "men";
            if (currentGrid.id.includes("women")) categorySelect.value = "women";
            if (currentGrid.id.includes("children")) categorySelect.value = "children";
        });
    });

    closeBtn.addEventListener("click", () => uploadPopup.style.display = "none");

    /* --------------------------
        💾 THE "SNAPPY" SAVE
    -------------------------- */
    /* --------------------------
            💾 THE "SNAPPY" SAVE (UPDATED TO MOVE CATEGORIES)
        -------------------------- */
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("productName").value.trim();
        const price = document.getElementById("productPrice").value.trim();
        // 🆕 Capture Stock Value from form
        const stock = document.getElementById("productStock") ? document.getElementById("productStock").value : 10;
        const category = categorySelect.value;
        const productId = editMode && editingCard ? editingCard.dataset.id : null;

        if (!name || !price || (!storedImageSrc && !editMode)) {
            showToast("Please fill all fields, bestie!");
            return;
        }

        // Capture the OLD category before we update
        const oldCategory = editMode && editingCard ? editingCard.dataset.category : null;

        const productData = {
            id: productId,
            name,
            price,
            category,
            tag: "SALE",
            image_url: storedImageSrc,
            stock_quantity: parseInt(stock)
        };

        let activeCard;
        if (editMode && editingCard) {
            const newCard = createProductCard(productData);

            // 🔥 LOGIC CHANGE: Check if category changed
            if (oldCategory !== category) {
                editingCard.remove(); // Remove from old section
                insertCardIntoGrid(newCard, category); // Move to new section
            } else {
                editingCard.replaceWith(newCard); // Stay in same section
            }
            activeCard = newCard;
        } else {
            activeCard = createProductCard(productData, true);
            insertCardIntoGrid(activeCard, category);
        }

        uploadPopup.style.display = "none";
        form.reset();

        (async () => {
            let finalImageUrl = storedImageSrc;

            if (rawFile) {
                const compressedFile = await compressImage(rawFile);
                const publicUrl = await uploadImageToSupabase(compressedFile);
                if (publicUrl) finalImageUrl = publicUrl;
            }

            const dbProduct = {
                name,
                price,
                category,
                tag: "SALE",
                image_url: finalImageUrl,
                stock_quantity: parseInt(stock)
            };

            let saved;
            if (editMode && productId) {
                const {data, error} = await supabaseClient
                    .from("products")
                    .update(dbProduct)
                    .eq("id", productId)
                    .select()
                    .single();

                if (error) console.error("❌ Supabase Update Error:", error);
                saved = data;
            } else {
                saved = await saveProductToSupabase(dbProduct);
            }

            if (!saved) {
                if (!editMode) activeCard.remove();
                showToast("❌ Sync failed. Check console.");
                return;
            }

            activeCard.classList.remove("optimistic");
            activeCard.dataset.id = saved.id;
            activeCard.dataset.stock = saved.stock_quantity;
            activeCard.querySelector('img').src = saved.image_url;
            console.log("✅ Supabase Sync Complete!");

            fetchProducts();
        })();
    });

    /* --------------------------
        ✏️ Edit & Delete
    -------------------------- */
    function attachCardListeners(card) {
        card.querySelector(".edit-btn").addEventListener("click", () => {
            document.getElementById("productName").value = card.querySelector(".product-name").textContent;

            // 🔥 FIXED: Populates the price field by removing " L.E" and any extra whitespace
            document.getElementById("productPrice").value = card.querySelector(".price").textContent.replace("L.E", "").trim();

            // 🆕 Populate stock input in the edit popup
            const stockInput = document.getElementById("productStock");
            if (stockInput) stockInput.value = card.dataset.stock || 0;

            categorySelect.value = card.dataset.category;

            tagSwitch.checked = true;
            tagLabel.textContent = "SALE";

            const img = card.querySelector("img");
            imagePreview.src = img.src;
            imagePreview.style.display = "block";
            uploadText.style.display = "none";
            storedImageSrc = img.src;
            rawFile = null;

            editMode = true;
            editingCard = card;
            popupTitle.textContent = "Editing Product...";
            form.querySelector("button[type='submit']").textContent = "Update Product";

            uploadPopup.style.display = "flex";
        });

        card.querySelector(".delete-btn").addEventListener("click", () => {
            cardToDelete = card;
            deletePopup.style.display = "flex";
        });

        // 🛒 NOON-STYLE CART LISTENERS
        const addBtn = card.querySelector(".add-to-cart-btn");
        const qtySelector = card.querySelector(".noon-qty-selector");
        const qtyDisplay = card.querySelector(".qty-display");
        const plusBtn = card.querySelector(".plus-btn");
        const minusBtn = card.querySelector(".minus-btn");

        const productName = card.querySelector(".product-name").textContent;
        const productPrice = card.querySelector(".price").textContent.replace("L.E", "").trim();
        const productImage = card.querySelector("img").src;
        const productId = card.dataset.id;

        if (addBtn) {
            addBtn.addEventListener("click", async () => {
                // Check if user is logged in
                const {data: {user}} = await supabaseClient.auth.getUser();

                if (!user) {
                    showToast("Please login to start shopping! 🛍️");
                    setTimeout(() => {
                        window.location.href = "index_login.html";
                    }, 1500);
                    return;
                }

                // 1. Logic: Add to the actual cart
                if (window.addToCart) {
                    window.addToCart(product.name, product.price, product.image_url, product.id);
                }

                // 2. UI: Change the button to the quantity selector
                addBtn.style.display = "none";
                qtySelector.style.display = "flex";
                qtyDisplay.textContent = "x1";

                // 3. 🔥 THE FIX: Tell the cart to refresh the "0" to "1" in the header
                if (typeof updateCartCount === 'function') {
                    updateCartCount();
                } else if (typeof renderCart === 'function') {
                    renderCart();
                }
            });
        }

        if (plusBtn) {
            plusBtn.addEventListener("click", () => {
                let currentQty = parseInt(qtyDisplay.textContent.replace("x", ""));
                const stockLimit = parseInt(card.dataset.stock) || 0;

                // 🛑 CHECK IF USER IS EXCEEDING STOCK
                if (currentQty >= stockLimit) {
                    showToast(`Limit reached: Only ${stockLimit} units in stock.`);
                    return; // Stop here
                }

                qtyDisplay.textContent = `x${currentQty + 1}`;
                if (window.addToCart) {
                    window.addToCart(productName, productPrice, productImage, productId);
                }
            });
        }

        if (minusBtn) {
            minusBtn.addEventListener("click", () => {
                let currentQty = parseInt(qtyDisplay.textContent.replace("x", ""));
                if (currentQty > 1) {
                    qtyDisplay.textContent = `x${currentQty - 1}`;
                    if (window.removeOneFromCart) window.removeOneFromCart(productId);
                } else {
                    qtySelector.style.display = "none";
                    addBtn.style.display = "block";
                    if (window.removeOneFromCart) window.removeOneFromCart(productId);
                }
            });
        }
    }

    cancelDeleteBtn.addEventListener("click", () => {
        deletePopup.style.display = "none";
        cardToDelete = null;
    });

    confirmDeleteBtn.addEventListener("click", async () => {
        if (!cardToDelete) return;

        const idToDelete = cardToDelete.dataset.id;
        const imageUrl = cardToDelete.querySelector('img').src;

        if (idToDelete) {
            const {error: dbError} = await supabaseClient
                .from("products")
                .delete()
                .eq("id", idToDelete);

            if (dbError) {
                console.error("❌ Error deleting from DB:", dbError);
                // 🛑 FIX: Check for the Foreign Key constraint error (code 23502)
                if (dbError.code === '23502') {
                    showToast("Cannot delete: This product is linked to existing orders! 📦");
                } else {
                    showToast("Delete failed. Check console for details.");
                }
                deletePopup.style.display = "none";
                return; // Stop here so the card is NOT removed from the UI
            }

            // Only remove from UI if the database deletion was successful
            cardToDelete.remove();
            deletePopup.style.display = "none";

            if (imageUrl && imageUrl.includes("supabase")) {
                const filePath = imageUrl.split('/').pop();
                const {error: storageError} = await supabaseClient
                    .storage
                    .from('product-images')
                    .remove([filePath]);

                if (storageError) console.error("⚠️ Could not delete image file:", storageError);
            }
        } else {
            // Fallback for temporary/unsaved cards
            cardToDelete.remove();
            deletePopup.style.display = "none";
        }
    });

    /* --------------------------
        🧩 Filters & Init
    -------------------------- */
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const category = btn.dataset.category;
            const pageTitle = document.getElementById("pageTitle");
            const subHeadings = document.querySelectorAll(".collection-title");

            if (category === "all") {
                pageTitle.textContent = "Home Collection";
                subHeadings.forEach(h2 => h2.style.display = "block");
            } else {
                pageTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Collection";
                subHeadings.forEach(h2 => h2.style.display = "none");
            }

            document.querySelectorAll(".category-section").forEach(section => {
                const sectionId = section.id.replace("Section", "").toLowerCase();
                const isMatch = category === "all" || category === sectionId;
                section.style.display = isMatch ? "block" : "none";
            });
        });
    });

    async function fetchProducts() {
        const skeletons = [];
        document.querySelectorAll(".grid").forEach(grid => {
            const existingCards = grid.querySelectorAll(".card:not(.upload-area)");
            existingCards.forEach(c => c.remove());

            for (let i = 0; i < 3; i++) {
                const skel = document.createElement("div");
                skel.className = "card skeleton";
                grid.insertBefore(skel, grid.querySelector(".upload-area"));
                skeletons.push(skel);
            }
        });

        const {data} = await supabaseClient
            .from("products")
            .select("*")
            .order("created_at", {ascending: false});

        // 🆕 Hide the global loader-container once data is received
        if (document.getElementById('loading-placeholder')) {
            document.getElementById('loading-placeholder').style.display = 'none';
        }

        skeletons.forEach(s => s.remove());
        if (data) {
            data.forEach(p => insertCardIntoGrid(createProductCard(p), p.category));
        }

        applyAdminLock();
    }

    fetchProducts();

    document.querySelector('.filter-btn[data-category="all"]').click();

    const footerEl = document.querySelector(".footer-info p");
    if (footerEl) {
        const words = footerEl.textContent.trim().split(" ");
        footerEl.textContent = words.reverse().join(" ");
    }

    /* --------------------------
        👤 USER AUTH UI & ADMIN LOCK
    -------------------------- */

    // 🆕 UPDATED: Function to handle Header Icons & Logout Dropdown
    async function updateAuthUI() {
        const loginBtn = document.querySelector('.auth-buttons-login');
        const registerBtn = document.querySelector('.auth-buttons-register');
        const profileMenu = document.getElementById('user-profile-menu');
        const logoutBtn = document.getElementById('logoutBtn');

        // 🔥 FIXED: Using getElementById to match your HTML id="cartWrapper"
        const cartWrapper = document.getElementById('cartWrapper');

        const {data: {user}} = await supabaseClient.auth.getUser();

        if (user) {
            // User is logged in: Hide buttons, show profile icon
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (profileMenu) profileMenu.style.display = 'block';

            // 🔥 FIXED: Overriding the inline "display: none" from your HTML
            if (cartWrapper) cartWrapper.style.display = 'block';

            // Toggle dropdown logic
            profileMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                profileMenu.classList.toggle('active');
            });

            // Close dropdown if clicking elsewhere
            document.addEventListener('click', () => {
                profileMenu.classList.remove('active');
            });

            // Handle Logout
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    const {error} = await supabaseClient.auth.signOut();
                    if (!error) {
                        window.location.reload();
                    }
                });
            }
        } else {
            // Guest mode: Show login/register
            if (loginBtn) loginBtn.style.display = 'block';
            if (registerBtn) registerBtn.style.display = 'block';
            if (profileMenu) profileMenu.style.display = 'none';

            // Hide cart for guests
            if (cartWrapper) cartWrapper.style.display = 'none';
        }
    }

    async function applyAdminLock() {
        const {data: {user}} = await supabaseClient.auth.getUser();
        let isAdmin = false;

        if (user) {
            const {data: profile} = await supabaseClient
                .from('user_profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            if (profile && profile.is_admin) {
                isAdmin = true;
            }
        }

        const adminZone = document.getElementById('admin-zone');
        const cartWrapper = document.getElementById('cartWrapper');
        const uploadAreas = document.querySelectorAll('.upload-area');

        // 🔥 Targeting the specific ID we just added
        const userOrdersLink = document.getElementById('userOrdersLink');

        if (!isAdmin) {
            console.log("👤 User/Guest detected.");
            if (adminZone) adminZone.style.display = 'none';

            // Show My Orders for users
            if (userOrdersLink) userOrdersLink.style.display = user ? 'block' : 'none';

            uploadAreas.forEach(area => {
                area.style.setProperty('display', 'none', 'important');
            });

            const styleId = "admin-lock-style";
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.innerHTML = `.edit-btn, .delete-btn, .upload-area { display: none !important; }`;
                document.head.appendChild(style);
            }
        } else {
            console.log("👑 Admin detected.");

            if (adminZone) {
                adminZone.style.display = 'block';
                const dashBtn = adminZone.querySelector('a');
                if (dashBtn) dashBtn.setAttribute('href', 'index_admin_orders_dashboard.html');
            }

            if (cartWrapper) cartWrapper.style.display = 'none';

            // 🔥 FORCE HIDE for Admin
            if (userOrdersLink) {
                userOrdersLink.setAttribute('style', 'display: none !important');

                // Hide the separator line (hr) if it exists right after the link
                const hr = userOrdersLink.nextElementSibling;
                if (hr && hr.tagName === 'HR') {
                    hr.style.setProperty('display', 'none', 'important');
                }
            }

            uploadAreas.forEach(area => {
                area.style.setProperty('display', 'flex', 'important');
            });

            const styleId = "admin-cart-lock";
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.innerHTML = `.add-to-cart-btn, .noon-qty-selector { display: none !important; }`;
                document.head.appendChild(style);
            }
        }
    }

// 🔄 REAL-TIME LISTENER (THE RIGHT WAY)
    supabaseClient
        .channel('stock-updates')
        .on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'products'}, (payload) => {
            // If the update coming from the DB is the SAME one we just finished editing locally...
            if (editingCard && payload.new.id == editingCard.dataset.id) {
                console.log("Ignoring echo from our own update to prevent ghosts.");
                return; // 🛑 Stop right here. Don't re-render.
            }

            // If it's a DIFFERENT product (someone else bought something), then refresh.
            fetchProducts();
        })
        .subscribe();

    // Initialize UI and Lock
    updateAuthUI();
    applyAdminLock();

    /* --------------------------------------------------------------------------
        📢 TELEGRAM NOTIFICATION ENGINE (INTEGRATED & LINE COUNT SECURE)
    -------------------------------------------------------------------------- */
    // This section ensures notifications fire when an admin updates stock
    // and listens for cart activities to alert the owner.

    async function sendTelegramAlert(message) {
        const BOT_TOKEN = '8413277097:AAFN-E5gQOLF1tnpgBCZpPBOfI9cDRLHXII';
        const CHAT_ID = '7193151646';
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

        try {
            await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            console.log("✈️ Telegram notification sent successfully!");
        } catch (err) {
            console.error("❌ Telegram failed:", err);
        }
    }

    // Global listener to bridge cart actions to Telegram if needed
    window.triggerTelegramOrder = (details) => {
        const msg = `📦 <b>New Action:</b>\n${details}`;
        sendTelegramAlert(msg);
    };

    /* --------------------------
        🔄 CART UI SYNC HELPER
    -------------------------- */
    // This function is called by cart.js when an item is deleted from the sidebar
    window.resetProductCardUI = (productId) => {
        const card = document.querySelector(`.card[data-id="${productId}"]`);
        if (card) {
            const addBtn = card.querySelector(".add-to-cart-btn");
            const qtySelector = card.querySelector(".noon-qty-selector");
            const qtyDisplay = card.querySelector(".qty-display");

            if (addBtn && qtySelector) {
                qtySelector.style.display = "none";
                addBtn.style.display = "block";
                if (qtyDisplay) qtyDisplay.textContent = "x1";
            }
        }
    };

    console.log("🚀 Script fully loaded at high line count with Noon UI and Auth Guard!");
});

