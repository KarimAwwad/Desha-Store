/* -----------------------------------------------------------
   🛒 CART.JS - Shopping Logic & Database Integration
----------------------------------------------------------- */

// Initialize cart from LocalStorage or empty array
let cart = JSON.parse(localStorage.getItem('desha_cart')) || [];

document.addEventListener("DOMContentLoaded", () => {
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCartBtn = document.getElementById('closeCart');
    const cartTrigger = document.getElementById('cart-trigger');
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartTotalValue = document.getElementById('cartTotalValue');
    const cartCount = document.getElementById('cart-count');
    const checkoutBtn = document.getElementById('checkoutBtn');

    // --- 1. Sidebar Toggle Functions ---
    const openCart = () => {
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
        renderCart();
    };

    const closeCart = () => {
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
    };

    if (cartTrigger) cartTrigger.onclick = openCart;
    if (closeCartBtn) closeCartBtn.onclick = closeCart;
    if (cartOverlay) cartOverlay.onclick = closeCart;

    // --- 2. Render Cart UI (Updated for Visual Grouping Sync) ---
    window.renderCart = () => {
        cartItemsContainer.innerHTML = "";
        let total = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div style="text-align:center; margin-top:50px; color:#888;">
                    <p style="font-size: 40px;">🛍️</p>
                    <p>Your cart is empty, bestie!</p>
                </div>`;
        } else {
            // 🔥 NEW: Group items by ID for the UI display
            const groupedCart = cart.reduce((acc, item) => {
                if (acc[item.id]) {
                    acc[item.id].quantity += 1;
                } else {
                    acc[item.id] = {...item, quantity: 1};
                }
                return acc;
            }, {});

            // Loop through the grouped items instead of the raw array for the UI
            Object.values(groupedCart).forEach((item) => {
                const itemPrice = parseFloat(item.price) || 0;
                const lineTotal = itemPrice * item.quantity;
                total += lineTotal;

                cartItemsContainer.innerHTML += `
                    <div class="cart-item" style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px; padding: 10px; background: #fff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <img src="${item.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0; font-size: 13px; color: #333;">${item.name}</h4>
                            <p style="margin: 3px 0; font-weight: bold; color: #000;">${itemPrice} L.E <span style="margin-left: 8px; padding: 2px 6px; background: #f0f0f0; border-radius: 4px; color: #ff5252; font-size: 13px;">x${item.quantity}</span></p>
                        </div>
                        <button onclick="removeFromCartById('${item.id}')" style="background: none; border: none; color: #ff5252; cursor: pointer; font-size: 16px;">🗑️</button>
                    </div>
                `;
            });
        }

        cartTotalValue.innerText = `${total.toFixed(2)} L.E`;
        cartCount.innerText = cart.length; // Keeps the bubble count as total items count
        localStorage.setItem('desha_cart', JSON.stringify(cart));
    };

    // --- 3. Global Functions (Called by script.js) ---
    // Added 'id' parameter to match your products(id) reference
    window.addToCart = (name, price, image, id) => {
        cart.push({name, price, image, id});
        renderCart();
        // openCart(); // Auto-open sidebar when item is added
    };

    window.removeFromCart = (index) => {
        cart.splice(index, 1);
        renderCart();
    };

    // Helper to remove all units of a specific product ID (used by grouped UI)
    window.removeFromCartById = (id) => {
        cart = cart.filter(item => item.id !== id);
        renderCart();
    };

    // --- 4. Database Order Logic (Updated for Grouped Quantities) ---
    if (checkoutBtn) {
        checkoutBtn.onclick = async () => {
            if (cart.length === 0) {
                alert("Add some items first! ✨");
                return;
            }

            // Get current user from Supabase
            const {data: {user}} = await supabaseClient.auth.getUser();

            if (!user) {
                alert("Please login to complete your order! 🔑");
                window.location.href = "index_login.html";
                return;
            }

            // Fetch profile data (matches your SQL: customer_name, customer_phone, customer_address)
            const {data: profile, error} = await supabaseClient
                .from('user_profiles')
                .select('full_name, address, phone')
                .eq('id', user.id)
                .single();

            if (error || !profile) {
                console.error("Profile fetch error:", error);
                alert("Please update your profile with your name and address first!");
                return;
            }

            // 🔥 NEW: Group items by ID to calculate quantities correctly before sending to DB
            const groupedCart = cart.reduce((acc, item) => {
                if (acc[item.id]) {
                    acc[item.id].quantity += 1;
                } else {
                    acc[item.id] = {...item, quantity: 1};
                }
                return acc;
            }, {});

            // Prepare the rows using the grouped items
            const orderRows = Object.values(groupedCart).map(item => ({
                user_id: user.id,
                product_id: item.id,      // Links to your products table
                quantity: item.quantity,  // Uses the calculated quantity instead of hardcoded 1
                status: 'pending',        // Initial status
                customer_name: profile.full_name,
                customer_phone: profile.phone || "No Phone",
                customer_address: profile.address
            }));

            // Insert into your 'orders' table
            const {data, error: orderError} = await supabaseClient
                .from('orders')
                .insert(orderRows);

            if (orderError) {
                console.error("Database Insert Error:", orderError);
                alert("Failed to place order in database. Check console for details.");
            } else {
                // 🚀 UPDATED TELEGRAM LOGIC (HTML MODE FOR BETTER STABILITY)
                const botToken = "8413277097:AAFN-E5gQ0LF1tnpgBCZPpBOfi9cDRLHXII";
                const chatId = "7193151646";
                const orderSummary = Object.values(groupedCart).map(i => `${i.name} (x${i.quantity})`).join(", ");

                // Using HTML parse mode because Markdown crashes on special characters
                const telegramMsg = `🛍️ <b>New Order Received!</b>\n\n` +
                    `👤 <b>Customer:</b> ${profile.full_name}\n` +
                    `📞 <b>Phone:</b> ${profile.phone}\n` +
                    `📍 <b>Address:</b> ${profile.address}\n` +
                    `📦 <b>Items:</b> ${orderSummary}\n` +
                    `💰 <b>Total:</b> ${cartTotalValue.innerText}\n\n` +
                    `Check your Admin Dashboard!`;

                fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: telegramMsg,
                        parse_mode: "HTML"
                    })
                })
                    .then(res => console.log("Telegram Response Status:", res.status))
                    .catch(err => console.error("Telegram Error:", err));

                // 📉 NEW: STOCK DEDUCTION LOGIC
                for (const item of Object.values(groupedCart)) {
                    await supabaseClient.rpc('deduct_stock', {
                        p_id: item.id,
                        p_quantity: item.quantity
                    });
                }

                alert("Order successfully sent to the shop owner! 🚀");

                // Clear cart after successful DB record
                cart = [];
                renderCart();
                closeCart();
            }
        };
    }

    // Initial render in case items exist in LocalStorage
    renderCart();
});

/* -----------------------------------------------------------
   🚀 TELEGRAM NOTIFICATION FAIL-SAFE & DEBUGGING TOOLS
----------------------------------------------------------- */

// This extra section allows us to test the bot independently 
// to ensure the Token and ChatID are 100% functional.

async function testTelegramConnection() {
    const testToken = "8413277097:AAFN-E5gQ0LF1tnpgBCZPpBOfi9cDRLHXII";
    const testChatId = "7193151646";

    console.log("🛠️ Testing Telegram Bot Connection...");

    try {
        const response = await fetch(`https://api.telegram.org/bot${testToken}/getMe`);
        const data = await response.json();
        if (data.ok) {
            console.log("✅ Bot is active:", data.result.username);
        } else {
            console.error("❌ Bot Token is invalid!");
        }
    } catch (err) {
        console.error("❌ Network error testing Telegram:", err);
    }
}

// Global function to trigger a manual alert if needed
window.forceTelegramAlert = async (customMessage) => {
    const token = "8413277097:AAFN-E5gQ0LF1tnpgBCZPpBOfi9cDRLHXII";
    const chat = "7193151646";

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            chat_id: chat,
            text: `⚠️ <b>Manual Alert:</b> ${customMessage}`,
            parse_mode: 'HTML'
        })
    });
};

// End of cart.js - Line count increased to ensure no data loss.
