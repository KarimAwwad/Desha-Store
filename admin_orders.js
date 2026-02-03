// 🛑 GATEKEEPER: Redirect non-admins immediately
(async () => {
    const {data: {user}} = await supabaseClient.auth.getUser();

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

    // Function to show the custom polished modal and redirect
    const kickUser = () => {
        const modal = document.getElementById('accessDeniedModal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            showToast("🚫 Access Denied: Admins Only!", true);
        }

        setTimeout(() => {
            window.location.href = "index_products.html";
        }, 3000);
    };

    if (!user) {
        window.location.href = "index_login.html";
        return;
    }

    const {data: profile} = await supabaseClient
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.is_admin) {
        kickUser();
    } else {
        const container = document.getElementById('admin-orders-container');
        if (container) container.style.display = 'block';

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initDashboard);
        } else {
            initDashboard();
        }
    }

    // Export showToast to window so functions below can use it
    window.showToast = showToast;
})();

// Global state
let allOrders = [];
let orderIdToDelete = null;

// --- 1. Initialize Dashboard ---
function initDashboard() {
    console.log("🛠️ Dashboard Initializing...");
    fetchOrders();

    // 🔍 Search & Filter Setup
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            console.log("Searching for:", searchInput.value);
            applyFilters();
        });
    }

    if (filterStatus) {
        filterStatus.addEventListener('change', applyFilters);
    }

    // 🗑️ Delete Modal Setup (Manual binding for extra safety)
    const confirmBtn = document.getElementById('confirmDeleteOrder');
    const cancelBtn = document.getElementById('cancelDeleteOrder');

    if (confirmBtn) confirmBtn.onclick = handleConfirmDelete;
    if (cancelBtn) cancelBtn.onclick = closeDeleteOrderModal;
}

// --- 2. Fetch Orders from Database ---
async function fetchOrders() {
    const tableBody = document.getElementById("ordersTableBody");
    if (!tableBody) return;

    // Fetching from the view
    const {data: orders, error} = await supabaseClient
        .from('admin_order_view')
        .select('*')
        .order('created_at', {ascending: false});

    if (error) {
        console.error("Error fetching orders:", error);
        return;
    }

    allOrders = orders;
    renderOrders(allOrders);
}

// --- 3. Apply Filters Logic ---
function applyFilters() {
    const searchField = document.getElementById('searchInput');
    const statusField = document.getElementById('filterStatus');

    if (!searchField || !statusField) return;

    const searchTerm = searchField.value.toLowerCase().trim();
    const statusTerm = statusField.value;

    const filtered = allOrders.filter(order => {
        // 1. Status Filter
        const matchesStatus = (statusTerm === 'all') || (order.status === statusTerm);

        // 2. Text Search (Check name, phone, or product)
        const name = (order.customer_name || '').toLowerCase();
        const phone = (order.customer_phone || '').toLowerCase();
        const prodName = (order.product_name || '').toLowerCase();

        const matchesSearch = name.includes(searchTerm) ||
            phone.includes(searchTerm) ||
            prodName.includes(searchTerm);

        return matchesStatus && matchesSearch;
    });

    renderOrders(filtered);
}

// --- 4. Inject Orders into HTML Table ---
function renderOrders(ordersToRender) {
    const tableBody = document.getElementById("ordersTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (ordersToRender.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 50px; color: #888;">No orders found matching your search.</td></tr>`;
        return;
    }

    ordersToRender.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const currentId = order.order_id || order.id;

        tableBody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>
                    <strong>${order.customer_name}</strong>
                    <small style="display:block;">📞 ${order.customer_phone}</small>
                    <small style="display:block;">📍 ${order.customer_address}</small>
                </td>
                <td>${order.product_name}</td>
                <td>${order.quantity}</td>
                <td><strong>${order.total_price ? order.total_price.toFixed(2) : '0.00'} L.E</strong></td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td>
                    <select onchange="updateOrderStatus('${currentId}', this.value)">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td style="text-align:center;">
                    <button class="trash-btn" onclick="openDeleteOrderModal('${currentId}')">
                        <img src="https://cdn-icons-png.flaticon.com/512/3096/3096673.png" alt="Delete" style="width:20px;">
                    </button>
                </td>
            </tr>
        `;
    });
}

// --- 5. Global Update Function ---
window.updateOrderStatus = async (orderId, newStatus) => {
    const {error} = await supabaseClient
        .from('orders')
        .update({status: newStatus})
        .eq('id', orderId);

    if (error) {
        if (window.showToast) window.showToast(`Failed: ${error.message}`, true);
    } else {
        fetchOrders();
    }
};

// --- 6. Order Deletion Logic ---
window.openDeleteOrderModal = (id) => {
    orderIdToDelete = id;
    const modal = document.getElementById('deleteOrderPopup');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.backgroundColor = "rgba(0,0,0,0.85)";
    }
};

window.closeDeleteOrderModal = () => {
    const modal = document.getElementById('deleteOrderPopup');
    if (modal) modal.style.display = 'none';
    orderIdToDelete = null;
};

// 🔥 UPDATED: Deletes order AND restores stock automatically
window.handleConfirmDelete = async () => {
    if (!orderIdToDelete) return;

    console.log("Processing deletion for:", orderIdToDelete);

    // --- STEP 1: Get Order Details (Before we delete it!) ---
    // We need to know which product and how much quantity to put back.
    const { data: orderInfo, error: fetchError } = await supabaseClient
        .from('orders')
        .select('product_id, quantity')
        .eq('id', orderIdToDelete)
        .single();

    if (fetchError) {
        console.error("Fetch Error:", fetchError);
        // If we can't find the order, we can't restore stock, but we might still try to delete
        // However, it's safer to alert the admin.
        if (window.showToast) window.showToast("Could not read order details. Delete cancelled.", true);
        return;
    }

    // --- STEP 2: Delete the Order ---
    const { error: deleteError } = await supabaseClient
        .from('orders')
        .delete()
        .eq('id', orderIdToDelete);

    if (deleteError) {
        console.error("Delete Error:", deleteError);
        // Special check for foreign key constraints if cascading is off
        if (deleteError.code === '23503') {
             if (window.showToast) window.showToast("Cannot delete: Product still exists.", true);
        } else {
             if (window.showToast) window.showToast("Error deleting order: " + deleteError.message, true);
        }
        return;
    }

    // --- STEP 3: Restore Stock (Only if delete succeeded) ---
    // At this point, the order is GONE from the DB. Now we fix the product stock.
    if (orderInfo && orderInfo.product_id) {
        
        // A. Get the current stock of the product to ensure we add to the latest number
        const { data: product } = await supabaseClient
            .from('products')
            .select('stock_quantity')
            .eq('id', orderInfo.product_id)
            .single();

        // B. Add the order quantity back to the stock
        if (product) {
            const restoredStock = (product.stock_quantity || 0) + orderInfo.quantity;
            
            const { error: stockError } = await supabaseClient
                .from('products')
                .update({ stock_quantity: restoredStock })
                .eq('id', orderInfo.product_id);

            if (stockError) {
                console.error("Stock Restore Failed:", stockError);
                if (window.showToast) window.showToast("Order deleted, but stock restore failed.", true);
            } else {
                 console.log(`♻️ Stock restored! Added ${orderInfo.quantity} back to inventory.`);
            }
        }
    }

    // Success!
    window.closeDeleteOrderModal();
    if (window.showToast) window.showToast("Order deleted & Stock Restored! ♻️", false);
    fetchOrders(); // Refresh table
};
