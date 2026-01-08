document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.getElementById("myOrdersTableBody");

    // 1. Check Auth (Redirect if not logged in)
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = "index_login.html";
        return;
    }

    // 2. Fetch Orders for THIS user only
    // We expand 'products' to get the name and image directly
    const { data: orders, error } = await supabaseClient
        .from('orders')
        .select(`
            *,
            products (
                name,
                image_url,
                price
            )
        `)
        .eq('user_id', user.id) // 🔒 CRITICAL: Only get my own orders
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching my orders:", error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error loading orders.</td></tr>`;
        return;
    }

    // 3. Render
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding: 40px;">
                    <p style="font-size: 50px;">🛒</p>
                    <p>You haven't placed any orders yet.</p>
                    <a href="index_products.html" style="color: #ff5252; font-weight:bold;">Start Shopping</a>
                </td>
            </tr>`;
        return;
    }

    orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        // Handle case where product might have been deleted from store
        const productName = order.products ? order.products.name : "Unknown Product (Deleted)";
        const productImg = order.products ? order.products.image_url : "https://via.placeholder.com/50";

        // Calculate price (Use order total if saved, or calculate on fly)
        // If your order table saves 'total_price', use it. If not, use product.price * quantity
        let displayPrice = "0.00";
        if (order.total_price) {
            displayPrice = order.total_price.toFixed(2);
        } else if (order.products) {
            displayPrice = (order.products.price * order.quantity).toFixed(2);
        }

        tableBody.innerHTML += `
            <tr>
                <td data-label="Date">${date}</td>
                <td data-label="Product">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${productImg}" style="width:40px; height:40px; border-radius:5px; object-fit:cover;">
                        <span>${productName}</span>
                    </div>
                </td>
                <td data-label="Quantity">x${order.quantity}</td>
                <td data-label="Total Price"><strong>${displayPrice} L.E</strong></td>
                <td data-label="Status">
                    <span class="status-badge status-${order.status}">
                        ${order.status}
                    </span>
                </td>
            </tr>
        `;
    });
});