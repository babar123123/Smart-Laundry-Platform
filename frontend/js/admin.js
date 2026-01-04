
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin Dashboard Loaded");

    // 1. Fetch Data
    if (window.fetchAdminRequests) {
        console.log("Fetching Requests...");
        window.fetchAdminRequests();
    }
    if (window.fetchUsers) {
        console.log("Fetching Users...");
        window.fetchUsers();
    }
    if (window.fetchGlobalServices) {
        console.log("Fetching Services...");
        window.fetchGlobalServices();
    }
    if (window.fetchGlobalOrders) { // Assuming this function exists or will be added
        console.log("Fetching Orders...");
        // window.fetchGlobalOrders(); 
    }

    // 2. Set Initial View (Clean Dashboard)
    showSection('dashboard');
});

window.showSection = function (sectionName) {
    console.log("Switching to section:", sectionName);

    // IDs of the content sections
    const sections = ['requestsSection', 'ordersSection', 'usersSection', 'servicesSection', 'securitySection'];

    // Hide ALL sections first
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.classList.add('hidden');
        }
    });

    // If 'dashboard' is clicked, we stop here (Clean Slate)
    if (sectionName === 'dashboard') return;

    // Otherwise, show the requested section
    const selected = document.getElementById(sectionName + 'Section');
    if (selected) {
        selected.style.display = 'block';
        selected.classList.remove('hidden');
    } else {
        console.error("Section not found:", sectionName + 'Section');
    }
};
