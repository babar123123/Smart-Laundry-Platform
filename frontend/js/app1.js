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
        if (data.token) {
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

// Fetch services for user dashboard

const servicesContainer = document.getElementById('servicesContainer');

if (servicesContainer) {
    fetch(`${API_URL}/services`)
        .then(res => res.json())
        .then(services => {
            servicesContainer.innerHTML = services.map(s => `
            <div class="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                <img src="${s.image ? `${API_URL.replace('/api', '')}/uploads/${s.image}` : 'placeholder.png'}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="text-xl font-bold mb-2">${s.name}</h3>
                    <p class="text-gray-700 text-sm mb-4">${s.description || ''}</p>
                    <p class="text-lg font-bold mb-2">€${s.price}</p>
                    <button onclick="placeOrder('${s._id}')" class="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded">Order Now</button>
                </div>
            </div>
        `).join('');
        });
}


// Place order
async function placeOrder(serviceId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ serviceId })
    });
    const data = await res.json();
    alert(data.msg || 'Order placed successfully');
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




// Fetch Service Provider's services

const myServices = document.getElementById('myServices');
if (myServices) {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/services`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(services => {
            const providerId = JSON.parse(atob(token.split('.')[1])).id;
            const myServicesList = services.filter(s => s.provider._id === providerId);
            myServices.innerHTML = myServicesList.map(s => `
            <div class="bg-white p-4 rounded shadow">
                <h3 class="font-bold">${s.name}</h3>
                <img src="${s.image ? `${API_URL.replace('/api', '')}/uploads/${s.image}` : 'placeholder.png'}" class="w-full h-40 object-cover rounded mt-2 mb-2">
                <p>${s.description || ''}</p>
                <p class="font-bold">€${s.price}</p>
            </div>
        `).join('');
        });
}



// Admin: Fetch all users
const usersContainer = document.getElementById('usersContainer');
if (usersContainer) {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(users => {
            usersContainer.innerHTML = users.map(u => `
            <div class="bg-white p-2 rounded shadow flex justify-between items-center">
                <span>${u.name} (${u.email}) - ${u.role}</span>
            </div>
        `).join('');
        })
        .catch(err => console.log(err));
}

// Admin: Fetch all services
const allServices = document.getElementById('allServices');
if (allServices) {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/services`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(services => {
            allServices.innerHTML = services.map(s => `
            <div class="bg-white p-4 rounded shadow">
                <h3 class="font-bold">${s.name}</h3>
                <p>${s.description || ''}</p>
                <p class="font-bold">€${s.price}</p>
                <p>Provider: ${s.provider.name} (${s.provider.email})</p>
            </div>
        `).join('');
        });
}

// Admin: Fetch all orders
const allOrders = document.getElementById('allOrders');
if (allOrders) {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(orders => {
            allOrders.innerHTML = orders.map(o => `
            <div class="bg-white p-4 rounded shadow flex justify-between items-center">
                <div>
                    <p>User: ${o.user.name} (${o.user.email})</p>
                    <p>Service: ${o.service.name}</p>
                    <p>Status: <span id="status-${o._id}" class="font-bold">${o.status}</span></p>
                </div>
                <div class="flex flex-col gap-2">
                    <button onclick="updateOrderStatus('${o._id}','pending')" class="bg-yellow-500 p-1 rounded text-white">Pending</button>
                    <button onclick="updateOrderStatus('${o._id}','completed')" class="bg-green-500 p-1 rounded text-white">Completed</button>
                </div>
            </div>
        `).join('');
        });
}

// Admin: Update order status
async function updateOrderStatus(orderId, status) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data._id) {
        document.getElementById(`status-${orderId}`).innerText = data.status;
        alert('Order status updated');
    } else {
        alert('Failed to update order');
    }
}
