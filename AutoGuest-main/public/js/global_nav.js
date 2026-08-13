document.addEventListener('DOMContentLoaded', () => {
    const pathname = window.location.pathname.toLowerCase();

    // Restore sessionStorage when a valid localStorage token is available
    const storedToken = localStorage.getItem('token');
    const storedUserName = localStorage.getItem('userName') || localStorage.getItem('usuarioNombre');
    const storedUserRole = localStorage.getItem('userRole') || localStorage.getItem('usuarioRol');
    const storedUserId = localStorage.getItem('userId');

    if (storedToken && sessionStorage.getItem('isLoggedIn') !== 'true') {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('token', storedToken);
        if (storedUserName) sessionStorage.setItem('userName', storedUserName);
        if (storedUserRole) sessionStorage.setItem('userRole', storedUserRole);
        if (storedUserId) sessionStorage.setItem('userId', storedUserId);
    }

    // Check if we are already on ANY dashboard or index to avoid showing navigation there
    const isDashboard = pathname.includes('dashboard_cliente.html') ||
        pathname.includes('dashboard_taller.html') ||
        pathname.includes('dashboard_mecanico.html') ||
        pathname.includes('portal_cliente.html') ||
        pathname.includes('portal_taller.html') ||
        pathname.includes('portal_mecanico.html') ||
        pathname.endsWith('/') ||
        pathname.includes('index.html') ||
        pathname.includes('home.html');

    const isAuthPage = pathname.includes('login') || 
        pathname.includes('registro') || 
        pathname.includes('register');

    if (!isDashboard && !isAuthPage) {
        let header = document.querySelector('header');

        if (!header) {
            header = document.createElement('header');
            header.className = 'standard-header';
            document.body.insertBefore(header, document.body.firstChild);
        }

        // Apply Standard Styling
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.padding = '12px 40px';
        header.style.backgroundColor = '#1a1a1a'; // Match main background but slightly distinct
        header.style.borderBottom = '1px solid #333';
        header.style.boxShadow = '0 2px 15px rgba(0,0,0,0.4)';
        header.style.position = 'sticky'; // Make it stay at top
        header.style.top = '0';
        header.style.width = '100vw'; // Ensure full width
        header.style.left = '0';
        header.style.zIndex = '2000'; // High z-index to stay above everything
        header.style.minHeight = '75px';
        header.style.boxSizing = 'border-box';

        // 1. LEFT: Logo & Back Button
        const leftWrap = document.createElement('div');
        leftWrap.id = 'header-left-nav';
        leftWrap.style.display = 'flex';
        leftWrap.style.alignItems = 'center';
        leftWrap.style.gap = '25px';

        const btnBack = document.createElement('a');
        btnBack.innerHTML = '<i class="fas fa-arrow-left"></i>';
        btnBack.href = "#";
        btnBack.style.cssText = "color: #f39c12; font-size: 2em; cursor: pointer; display: flex; align-items: center; transition: transform 0.2s;";
        btnBack.onmouseover = () => btnBack.style.transform = "scale(1.1)";
        btnBack.onmouseout = () => btnBack.style.transform = "scale(1)";
        btnBack.onclick = (e) => {
            e.preventDefault();
            if (window.history.length > 1) { window.history.back(); } else { window.location.href = '/index.html'; }
        };
        leftWrap.appendChild(btnBack);

        // Logo SECOND (Top Left, to the right of back button)
        const logo = document.createElement('img');
        logo.src = window.location.origin + '/imagenes/Logo_Autoguest.png';
        logo.alt = 'AutoGuest Logo';
        logo.style.height = '65px'; // Premium size
        logo.style.cursor = 'pointer';
        logo.onclick = () => window.location.href = window.location.origin + '/index.html';
        leftWrap.appendChild(logo);
        
        // 2. RIGHT: Notifications & Home
        const rightWrap = document.createElement('div');
        rightWrap.id = 'header-right-nav';
        rightWrap.style.display = 'flex';
        rightWrap.style.alignItems = 'center';
        rightWrap.style.gap = '30px';

        // Notification Center Placeholder
        const notifWrapper = document.createElement('div');
        notifWrapper.className = 'notification-wrapper';
        notifWrapper.innerHTML = `
            <button class="notification-trigger" id="notificationTrigger" onclick="NotificationSystem.toggleDropdown()" style="font-size: 2em; padding: 5px; color: #f39c12; background: none; border: none; cursor: pointer;">
                <i class="fas fa-bell"></i>
                <span class="notification-badge" id="notificationBadge" style="display:none; top: 5px; right: 5px; background: #e74c3c; border-radius: 50%; font-size: 0.5em; padding: 2px 6px;">0</span>
            </button>
            <div class="notification-dropdown" id="notificationDropdown">
                <div class="notification-header">
                    <h3>Notificaciones</h3>
                </div>
                <div class="notification-list" id="notificationList">
                    <div class="notification-empty">Cargando...</div>
                </div>
            </div>
        `;
        
        // Home Button
        const btnHome = document.createElement('a');
        btnHome.innerHTML = '<i class="fas fa-home"></i>';
        btnHome.style.cssText = "color: #f39c12; font-size: 2.2em; cursor: pointer; display: flex; align-items: center; transition: transform 0.2s;";
        btnHome.onmouseover = () => btnHome.style.transform = "scale(1.1)";
        btnHome.onmouseout = () => btnHome.style.transform = "scale(1)";
        btnHome.onclick = (e) => {
            e.preventDefault();
            const host = window.location.origin;
            if (pathname.includes('/cliente/')) {
                window.location.href = host + '/pages/cliente/dashboard_cliente.html';
            } else if (pathname.includes('/taller/')) {
                window.location.href = host + '/portal_taller.html';
            } else if (pathname.includes('/mecanico/')) {
                window.location.href = host + '/pages/mecanico/dashboard_mecanico.html';
            } else {
                window.location.href = host + '/index.html';
            }
        };

        rightWrap.appendChild(notifWrapper);
        rightWrap.appendChild(btnHome);

        // Final Injection - Clear and Rebuild
        header.innerHTML = '';
        header.appendChild(leftWrap);
        header.appendChild(rightWrap);

        // Hide old redundant links
        document.querySelectorAll('.back-link, .back-to-dashboard, .back-to-appointments').forEach(el => el.style.display = 'none');
        
        // Ensure Notification System re-inits if available
        if (typeof NotificationSystem !== 'undefined') {
            NotificationSystem.init();
        }
    }
});
