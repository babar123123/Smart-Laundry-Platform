const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
    ? "http://localhost:5000/api"
    : "/api";


// Register
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async e => {
        e.preventDefault();
        const res = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                role: document.getElementById('role').value
            })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.user.role);
            registerForm.reset();
            window.location.href = data.user.role === 'user' ? 'dashboard.html' : data.user.role === 'service_provider' ? 'service-provider.html' : 'admin.html';
        } else alert(data.msg || 'Registration failed');
    });
}

// Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const res = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            })
        });
        const data = await res.json();
        if (data.mfaRequired) {
            // 2. MFA is enabled, ask for OTP
            const otp = prompt("Security Check: Enter your 2FA Code (from Google Authenticator):");
            if (!otp) return alert("Login cancelled");

            const mfaRes = await fetch(`${API_URL}/users/login/mfa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: data.userId, token: otp })
            });
            const mfaData = await mfaRes.json();

            if (mfaData.token) {
                // Login Success with MFA
                localStorage.setItem('token', mfaData.token);
                localStorage.setItem('role', mfaData.user.role);
                loginForm.reset();
                window.location.href = mfaData.user.role === 'user' ? 'dashboard.html' : mfaData.user.role === 'service_provider' ? 'service-provider.html' : 'admin.html';
            } else {
                alert(mfaData.msg || "Invalid 2FA Code");
            }

        } else if (data.token) {
            // 1. Normal Login (No MFA)
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.user.role);

            // reset form
            loginForm.reset();
            window.location.href = data.user.role === 'user' ? 'dashboard.html' : data.user.role === 'service_provider' ? 'service-provider.html' : 'admin.html';
        } else alert(data.msg || 'Login failed');
    });
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = 'login.html';
    });
}


// Fetch User Balance
async function fetchUserBalance() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const user = await res.json();

        if (user.walletBalance !== undefined) {
            const balanceEl = document.getElementById('walletBalanceDisplay');
            if (balanceEl) balanceEl.innerText = `€${user.walletBalance}`;
        }
    } catch (err) {
        console.error("Failed to fetch balance", err);
    }
}

// MFA Setup Functions
window.setupMFA = async function () {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/users/mfa/setup`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        // Show QR and Input in a Modal (Dynamically created for simplicity)
        const mfaContainer = document.getElementById('mfaContainer');
        if (mfaContainer) {
            mfaContainer.innerHTML = `
                <div class="bg-white p-6 rounded shadow-lg border border-gray-200 text-center">
                    <h3 class="font-bold text-lg mb-4">Scan this QR Code</h3>
                    <img src="${data.qrCode}" class="mx-auto border border-gray-300 p-2 rounded mb-4">
                    <p class="text-sm text-gray-500 mb-4">Secret: <strong>${data.secret}</strong></p>
                    <input type="text" id="mfaVerifyCode" placeholder="Enter 6-digit Code" class="border p-2 rounded w-full mb-2">
                    <button onclick="verifyMFA()" class="bg-green-600 text-white w-full py-2 rounded font-bold">Enable 2FA</button>
                    <button onclick="document.getElementById('mfaContainer').innerHTML=''" class="text-red-500 text-sm mt-2">Cancel</button>
                </div>
            `;
        }
    } catch (err) {
        console.error("MFA Error:", err);
        alert("Failed to setup MFA: " + err.message);
    }
};

window.verifyMFA = async function () {
    const token = localStorage.getItem('token');
    const otp = document.getElementById('mfaVerifyCode').value;

    try {
        const res = await fetch(`${API_URL}/users/mfa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ token: otp })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Success! 2FA is now ENABLED. You will need a code to login next time.");
            document.getElementById('mfaContainer').innerHTML = ''; // Close
        } else {
            alert(data.msg || "Invalid Code");
        }
    } catch (err) {
        console.error(err);
    }
};

fetchUserBalance(); // Call on load

// Fetch services for user dashboard

const servicesContainer = document.getElementById('servicesContainer');

if (servicesContainer) {
    fetch(`${API_URL}/services`)
        .then(res => res.json())
        .then(services => {
            servicesContainer.innerHTML = services.map((s, index) => `
            <div class="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 card-hover flex flex-col h-full border border-gray-100 animate-fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="relative h-52 overflow-hidden">
                    <img src="${s.image ? `${API_URL.replace('/api', '')}/uploads/${s.image}` : 'https://images.unsplash.com/photo-1545173168-9f1947eebb8f?q=80&w=2071&auto=format&fit=crop'}" 
                         onerror="this.onerror=null;this.src='https://placehold.co/600x400?text=Image+Missing';this.parentElement.nextElementSibling.innerText='Replit Image (Missing Local)';"
                         class="w-full h-full object-cover transform hover:scale-110 transition-transform duration-700">
                    <div class="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wider text-gray-800">
                        Express
                    </div>
                </div>
                
                <div class="p-6 flex flex-col flex-grow">
                    <h3 class="text-xl font-bold text-gray-900 mb-2 leading-tight">${s.name}</h3>
                    <p class="text-gray-500 text-sm mb-6 flex-grow line-clamp-2">${s.description || 'Professional cleaning for your garments.'}</p>
                    
                    <div class="flex items-end justify-between mt-auto pt-4 border-t border-gray-100">
                        <div>
                            <span class="text-xs text-gray-400 font-bold uppercase block mb-0.5">Price</span>
                            <span class="text-2xl font-black text-[#00b894]">€${s.price}</span>
                        </div>
                        <div class="flex gap-2">
                             <button onclick="addToCart('${s._id}', '${s.name}', ${s.price})" class="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-[#00b894] hover:border-[#00b894] transition-all" title="Add to Cart">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                             </button>
                             <button onclick="placeOrder('${s._id}')" class="bg-gray-900 text-white px-5 py-2 rounded-full text-sm font-bold shadow-md hover:bg-[#00b894] hover:shadow-emerald-500/30 transition-all">
                                Buy Now
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        });
}

// ACCESS GLOBAL CART
let cart = JSON.parse(localStorage.getItem('cart')) || [];
updateCartBadge();

function addToCart(id, name, price) {
    cart.push({ id, name, price });
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    alert("Added to cart!");
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) badge.innerText = cart.length;
}

window.toggleCart = function () {
    const modal = document.getElementById('cartModal');
    if (!modal) return;

    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        renderCart();
    } else {
        modal.classList.add('hidden');
    }
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center mt-10">Your cart is empty.</p>';
        totalEl.innerText = '€0';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        total += item.price;
        return `
            <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 group">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-emerald-50 text-[#00b894] flex items-center justify-center font-bold text-lg">
                        ${index + 1}
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-800">${item.name}</h4>
                        <p class="text-xs text-gray-400 font-medium">Service Package</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <span class="font-bold text-gray-800">€${item.price}</span>
                    <button onclick="removeFromCart(${index})" class="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">
                        &times;
                    </button>
                </div>
            </div>
        `;
    }).join('');

    totalEl.innerText = `€${total}`;
}

window.removeFromCart = function (index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartBadge();
}

window.checkout = async function () {
    if (cart.length === 0) return alert("Cart is empty!");

    const token = localStorage.getItem('token');
    const serviceIds = cart.map(item => item.id);

    try {
        const res = await fetch(`${API_URL}/orders/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ serviceIds })
        });

        const data = await res.json();

        if (res.ok) {
            alert(`Success! ${data.msg}. New Balance: €${data.newBalance}`);
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartBadge();
            toggleCart();
            window.location.reload();
        } else {
            alert(data.msg || "Checkout failed");
        }
    } catch (err) {
        console.error("Checkout error:", err);
        alert("Server error");
    }
};


// Place order

async function placeOrder(serviceId) {
    const token = localStorage.getItem('token');

    // Check if token exists
    if (!token) {
        alert("Please login first!");
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ serviceId })
        });

        const data = await res.json();

        if (res.ok) {
            // Agar backend se successful response aaye
            alert('Order placed successfully! Check "My Orders" for status.');
            // window.location.href = 'my-orders.html'; // Optional: redirect karein
            window.location.reload();
        } else {
            // Agar role 'user' nahi hai ya koi aur error hai
            alert(data.msg || 'Failed to place order.');
        }
    } catch (err) {
        console.error("Order Error:", err);
        alert('Connection error. Please try again later.');
    }
}


// Service Provider: Add new service

const serviceForm = document.getElementById('serviceForm');
if (serviceForm) {
    serviceForm.addEventListener('submit', async e => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        const formData = new FormData();
        formData.append('name', document.getElementById('serviceName').value);
        formData.append('description', document.getElementById('serviceDesc').value);
        formData.append('price', document.getElementById('servicePrice').value);
        const fileInput = document.getElementById('serviceImage');
        if (fileInput.files[0]) formData.append('image', fileInput.files[0]);

        const res = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await res.json();
        if (data._id) {
            alert('Service added successfully!');
            window.location.reload();
        } else {
            alert('Failed to add service');
        }
    });
}


// 1. User Delete Function
window.deleteUser = async function (id) {
    // Confirmation dialog
    if (!confirm("Are you sure? This user will be permanently removed from the platform.")) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (res.ok) {
            alert("User deleted successfully!");
            location.reload(); // Page refresh karke list update karein
        } else {
            alert("Error: " + (data.msg || "Could not delete user"));
        }
    } catch (err) {
        console.error("Delete Error:", err);
        alert("Server error. Please try again.");
    }
};

// 2. User Role Edit Function
window.editUserRole = async function (id, currentRole) {
    // Prompt for new role
    const newRole = prompt("Update Role (user / service_provider / admin):", currentRole);

    // Check if input is empty or same as old role
    if (!newRole || newRole === currentRole) return;

    // Validate role names
    const validRoles = ['user', 'service_provider', 'admin'];
    if (!validRoles.includes(newRole.toLowerCase())) {
        alert("Invalid role! Use: user, service_provider, or admin");
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/users/${id}/role`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: newRole.toLowerCase() })
        });

        const data = await res.json();

        if (res.ok) {
            alert("User role updated to: " + newRole);
            location.reload();
        } else {
            alert("Error: " + (data.msg || "Update failed"));
        }
    } catch (err) {
        console.error("Update Error:", err);
        alert("Server error.");
    }
};



// 3. User: Fetch My Orders
window.fetchMyOrders = async function () {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/orders/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders = await res.json();

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="bg-white p-10 rounded-lg shadow text-center">
                    <p class="text-gray-500 text-lg">You haven't placed any orders yet.</p>
                    <a href="dashboard.html" class="mt-4 inline-block text-laundry-green font-bold hover:underline">Start Ordering</a>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map((order, index) => {
            const date = new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const serviceName = order.service ? order.service.name : 'Service Unavailable';
            const serviceImage = order.service && order.service.image ? order.service.image : null;
            const price = order.service ? order.service.price : 'N/A';

            let statusColor = 'bg-yellow-100 text-yellow-700 border-yellow-200';
            let statusIcon = '⏳';
            if (order.status === 'completed') {
                statusColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                statusIcon = '✅';
            }
            if (order.status === 'processing') {
                statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
                statusIcon = '⚙️';
            }

            return `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6 hover:shadow-lg transition-all duration-300 animate-slide-in" style="animation-delay: ${index * 0.1}s">
                    <div class="relative w-24 h-24 flex-shrink-0">
                        <img src="${serviceImage ? `${API_URL.replace('/api', '')}/uploads/${serviceImage}` : 'https://images.unsplash.com/photo-1545173168-9f1947eebb8f?q=80&w=2071&auto=format&fit=crop'}" 
                             onerror="this.onerror=null;this.src='https://placehold.co/100?text=Missing';"
                             class="w-full h-full object-cover rounded-xl shadow-md">
                        <div class="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow text-sm border border-gray-100">
                             ${statusIcon}
                        </div>
                    </div>
                    
                    <div class="flex-grow text-center md:text-left space-y-1">
                        <div class="flex items-center justify-center md:justify-start gap-2">
                             <h3 class="text-xl font-bold text-gray-800">${serviceName}</h3>
                             <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 uppercase tracking-wide border border-gray-200">#${order._id.slice(-6)}</span>
                        </div>
                        <p class="text-gray-500 text-sm font-medium">Ordered on ${date}</p>
                    </div>

                    <div class="text-right flex flex-col items-center md:items-end gap-2">
                        <span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase border ${statusColor}">
                            ${order.status}
                        </span>
                        <p class="text-2xl font-black text-gray-800">€${price}</p>
                    </div>
                </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Fetch Orders Error:", err);
    }
};

// 4. Wallet: Submit Fund Request
window.submitFundRequest = async function () {
    const amount = document.getElementById('fundAmount').value;
    if (!amount || amount <= 0) return alert("Please enter a valid amount");

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/wallet/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`Request submitted! Status: ${data.request.status}`);
            document.getElementById('fundModal').classList.add('hidden');
        } else {
            alert(data.msg || "Request failed");
        }
    } catch (err) {
        console.error("Fund Req Error:", err);
    }
};

// 5. Wallet: Show History
window.showWalletHistory = async function () {
    const modal = document.getElementById('walletHistoryModal');
    const container = document.getElementById('walletHistoryItems');
    if (!modal || !container) return;

    modal.classList.remove('hidden');
    container.innerHTML = '<p class="text-center text-gray-400">Loading...</p>';

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/wallet/my-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const requests = await res.json();

        if (requests.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 pt-10">No history found.</p>';
            return;
        }

        container.innerHTML = requests.map(req => {
            let statusColor = 'text-yellow-600 bg-yellow-50';
            if (req.status === 'approved') statusColor = 'text-green-600 bg-green-50';
            if (req.status === 'rejected') statusColor = 'text-red-600 bg-red-50';

            return `
                <div class="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                        <p class="font-bold text-gray-800 text-lg">€${req.amount}</p>
                        <p class="text-xs text-gray-400">${new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor}">
                        ${req.status}
                    </span>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Wallet History Error:", err);
        container.innerHTML = '<p class="text-center text-red-500">Failed.</p>';
    }
};

// ---------------------------------------------------------------------
// 1. ADMIN: FETCH PENDING REQUESTS
// ---------------------------------------------------------------------
window.fetchAdminRequests = function () {
    const container = document.getElementById('adminRequestsContainer');
    if (!container) return;

    fetch(`${API_URL}/wallet/all-requests`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
        .then(res => res.json())
        .then(requests => {
            const statsEl = document.getElementById('statsRequests');
            if (statsEl) statsEl.textContent = requests.length || 0;

            if (requests.length === 0) {
                container.innerHTML = `<p class="text-gray-500 text-center col-span-3">No pending requests.</p>`;
                return;
            }

            container.innerHTML = requests.map(req => `
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between gap-6 hover:shadow-md transition-shadow">
                <div class="flex items-center gap-4">
                    <div class="bg-yellow-100 p-3 rounded-full text-yellow-600">
                        💰
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-800 text-lg">${req.user ? req.user.name : 'Unknown User'}</h4>
                        <p class="text-xs text-gray-500">${req.user ? req.user.email : ''}</p>
                        <div class="mt-1 flex items-center gap-2">
                             <span class="text-sm font-medium text-gray-600">Requested:</span>
                             <span class="text-lg font-black text-green-600">€${req.amount}</span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <button onclick="approveRequest('${req._id}')" 
                        class="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors shadow-sm">
                        APPROVE
                    </button>
                    <button onclick="rejectRequest('${req._id}')" 
                        class="px-4 py-2 border border-red-100 text-red-500 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors">
                        REJECT
                    </button>
                </div>
            </div>
        `).join('');
        })
        .catch(err => console.error(err));
};

window.approveRequest = async function (id) {
    if (!confirm("Approve this request?")) return;
    try {
        const res = await fetch(`${API_URL}/wallet/approve/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) { alert("Approved!"); fetchAdminRequests(); }
        else {
            const data = await res.json();
            alert(data.msg || "Failed");
        }
    } catch (e) { console.error(e); }
};

window.rejectRequest = async function (id) {
    if (!confirm("Reject this request?")) return;
    try {
        const res = await fetch(`${API_URL}/wallet/reject/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) { alert("Rejected!"); fetchAdminRequests(); }
        else alert("Failed");
    } catch (e) { console.error(e); }
};

// ---------------------------------------------------------------------
// 2. ADMIN: MANAGE USERS
// ---------------------------------------------------------------------
window.fetchUsers = function () {
    const container = document.getElementById('usersContainer');
    if (!container) return;

    fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
        .then(async res => {
            if (res.status === 401 || res.status === 403) throw new Error("Unauthorized");
            return res.json();
        })
        .then(users => {
            const statsEl = document.getElementById('statsUsers');
            if (statsEl) statsEl.textContent = users.length || 0;

            if (users.length === 0) {
                container.innerHTML = `<p class="text-gray-500 text-center col-span-3">No users found.</p>`;
                return;
            }

            container.innerHTML = users.map(user => `
            <div class="bg-white rounded-xl p-5 border border-gray-200 hover:border-emerald-300 transition-colors group">
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800">${user.name}</h4>
                            <p class="text-xs text-gray-500">${user.email}</p>
                        </div>
                    </div>
                    <span class="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded tracking-wider">${user.role}</span>
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div class="text-center">
                         <span class="block text-xs text-gray-400 font-bold uppercase">Balance</span>
                         <span class="text-emerald-600 font-bold">€${user.walletBalance || 0}</span>
                    </div>
                    <button onclick="deleteUser('${user._id}')" class="text-gray-400 hover:text-red-500 transition-colors" title="Delete User">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
        `).join('');
        })
        .catch(err => {
            console.error(err);
            if (err.message === "Unauthorized") {
                alert("Session expired. Please login again.");
                window.location.href = 'login.html';
            }
        });
};

// ---------------------------------------------------------------------
// 3. ADMIN: MANAGE SERVICES
// ---------------------------------------------------------------------
window.fetchGlobalServices = function () {
    const container = document.getElementById('allServices');
    if (!container) return;

    fetch(`${API_URL}/services`)
        .then(res => res.json())
        .then(services => {
            const statsEl = document.getElementById('statsServices');
            if (statsEl) statsEl.textContent = services.length || 0;

            if (services.length === 0) {
                container.innerHTML = `<p class="text-gray-500 text-center col-span-3">No services found.</p>`;
                return;
            }

            container.innerHTML = services.map(service => `
            <div class="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                <div class="h-24 bg-gray-100 relative overflow-hidden">
                    <img src="${service.image ? `${API_URL.replace('/api', '')}/uploads/${service.image}` : 'https://via.placeholder.com/150'}" class="w-full h-full object-cover absolute inset-0">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                     <span class="absolute bottom-2 left-3 text-white font-bold text-lg drop-shadow-md">€${service.price}</span>
                </div>
                <div class="p-4">
                    <h4 class="font-bold text-gray-800 mb-1">${service.name}</h4>
                    <p class="text-xs text-gray-500 line-clamp-2 h-8">${service.description}</p>
                    
                    <button onclick="adminDeleteService('${service._id}')" class="mt-4 w-full py-2 border border-red-500 text-red-500 font-bold rounded hover:bg-red-50 transition-colors text-xs uppercase tracking-wider">
                        Delete Service
                    </button>
                </div>
            </div>
        `).join('');
        })
        .catch(err => console.error(err));
};

window.adminDeleteService = async function (id) {
    if (!confirm("Admin Action: Delete this service?")) return;
    try {
        const res = await fetch(`${API_URL}/services/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
            alert("Service removed!");
            fetchGlobalServices();
            window.location.reload();
        } else {
            alert("Failed to delete service.");
        }
    } catch (err) { console.error(err); }
};

// ---------------------------------------------------------------------
// 4. ADMIN: MANAGE ORDERS
// ---------------------------------------------------------------------
window.fetchGlobalOrders = function () {
    const container = document.getElementById('allOrders');
    if (!container) return;

    fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
        .then(async res => {
            if (res.status === 401 || res.status === 403) throw new Error("Unauthorized");
            return res.json();
        })
        .then(orders => {
            const statsEl = document.getElementById('statsOrders');
            if (statsEl) statsEl.textContent = orders.length || 0;

            if (orders.length === 0) {
                container.innerHTML = `<p class="text-gray-500 text-center col-span-3">No orders found.</p>`;
                return;
            }

            const getStatusColor = (status) => {
                switch (status) {
                    case 'pending': return 'bg-yellow-100 text-yellow-700';
                    case 'processing': return 'bg-blue-100 text-blue-700';
                    case 'completed': return 'bg-green-100 text-green-700';
                    case 'cancelled': return 'bg-red-100 text-red-700';
                    default: return 'bg-gray-100 text-gray-700';
                }
            };

            container.innerHTML = orders.map(order => `
            <div class="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow">
               <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Order #${order._id.slice(-6)}</span>
                        <h4 class="font-bold text-gray-800">${order.service ? order.service.name : 'Unknown Service'}</h4>
                    </div>
                     <span class="px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}">
                        ${order.status.toUpperCase()}
                    </span>
               </div>
               
                <div class="space-y-2 text-sm text-gray-600 mb-4">
                    <div class="flex items-center gap-2">
                         <span class="w-4 text-center">👤</span>
                         <span>${order.user ? order.user.name : 'Deleted User'}</span>
                    </div>
                </div>

                <div class="flex justify-between items-center pt-4 border-t border-gray-200">
                     <button onclick="openEditOrderModal('${order._id}', '${order.status}')" class="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center gap-1">
                        ✏️ Edit Status
                    </button>
                    <button onclick="adminDeleteOrder('${order._id}')" class="text-red-500 hover:text-red-700 font-bold text-sm">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
        })
        .catch(err => {
            console.error(err);
            if (err.message === "Unauthorized") {
                // Optional: Don't alert for orders if page load - just log it
            }
        });
};

// ORDER MODAL & ACTIONS
window.openEditOrderModal = function (id, status) {
    const modal = document.getElementById('statusModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('currentOrderId').value = id;
        document.getElementById('statusSelect').value = status;
    }
};

window.closeStatusModal = function () {
    const modal = document.getElementById('statusModal');
    if (modal) modal.classList.add('hidden');
};

window.saveStatusUpdate = async function () {
    const id = document.getElementById('currentOrderId').value;
    const status = document.getElementById('statusSelect').value;
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            alert("Order status updated!");
            closeStatusModal();
            fetchGlobalOrders();
            window.location.reload();
        } else {
            alert("Failed to update status");
        }
    } catch (e) { console.error(e); }
};

window.adminDeleteOrder = async function (id) {
    if (!confirm("Are you sure you want to delete this order?")) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            alert("Order deleted!");
            fetchGlobalOrders();
            window.location.reload();
        } else {
            alert("Failed to delete order");
        }
    } catch (e) { console.error(e); }
};
