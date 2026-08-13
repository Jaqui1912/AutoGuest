/**
 * AutoGuest Notification System
 * Handles fetching, rendering and marking notifications as read
 */

const NotificationSystem = {
    init: function () {
        console.log("Notification System Initialized");
        this.fetchNotifications();
        // Polling every 60 seconds
        setInterval(() => this.fetchNotifications(), 60000);
    },

    fetchNotifications: async function () {
        try {
            const res = await fetch('/api/notificaciones');
            if (res.ok) {
                const notifications = await res.json();
                this.renderDropdown(notifications);
                this.updateBadge(notifications);
                this.renderRecentList(notifications);
            }
        } catch (e) {
            console.error("Error fetching notifications", e);
        }
    },

    updateBadge: function (notifications) {
        const unreadCount = notifications.filter(n => !n.leida).length;
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    renderRecentList: function (notifications) {
        const recentSection = document.getElementById('recentNotificationsSection');
        const recentList = document.getElementById('recentNotificationsList');
        if (!recentSection || !recentList) return;

        const unread = notifications.filter(n => !n.leida);
        if (unread.length === 0) {
            recentSection.style.display = 'none';
            return;
        }

        recentSection.style.display = 'block';
        let html = '';
        unread.slice(0, 3).forEach(n => {
            const tipo = n.tipo || '';
            html += `
                <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px;" 
                     onclick="NotificationSystem.markAsRead(${n.idNotificacion}, '${tipo}')">
                    <i class="${this.getIcon(n.titulo)}" style="font-size: 1.2em;"></i>
                    <div style="flex: 1;">
                        <span style="font-weight: bold; font-size: 0.9em; display: block;">${n.titulo}</span>
                        <span style="font-size: 0.85em; color: #ccc;">${n.mensaje}</span>
                    </div>
                    <i class="fas fa-chevron-right" style="color: #666; font-size: 0.8em;"></i>
                </div>
            `;
        });
        recentList.innerHTML = html;
    },

    renderDropdown: function (notifications) {
        const list = document.getElementById('notificationList');
        if (!list) return;

        if (notifications.length === 0) {
            list.innerHTML = '<div class="notification-empty">No tienes notificaciones</div>';
            return;
        }

        let html = '';
        notifications.forEach(n => {
            const date = new Date(n.fechaCreacion).toLocaleString();
            const unreadClass = n.leida ? '' : 'unread';
            const tipo = n.tipo || '';
            html += `
                <div class="notification-item ${unreadClass}" onclick="NotificationSystem.markAsRead(${n.idNotificacion}, '${tipo}')">
                    <div class="notification-icon">
                        <i class="${this.getIcon(n.titulo)}"></i>
                    </div>
                    <div class="notification-content">
                        <strong>${n.titulo || 'Notificación'}</strong>
                        <p>${n.mensaje}</p>
                        <span class="notification-time">${date}</span>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    },

    getIcon: function (title) {
        title = title.toLowerCase();
        if (title.includes('stock') || title.includes('agotado')) return 'fas fa-boxes text-danger';
        if (title.includes('cita') || title.includes('reserva') || title.includes('cotización')) return 'fas fa-calendar-alt text-warning';
        if (title.includes('pago') || title.includes('compra') || title.includes('venta')) return 'fas fa-cash-register text-success';
        if (title.includes('mecanico') || title.includes('perfil') || title.includes('taller')) return 'fas fa-user-cog text-info';
        if (title.includes('reseña') || title.includes('opinion') || title.includes('valoración')) return 'fas fa-star text-primary';
        return 'fas fa-bell text-primary';
    },

    markAsRead: async function (id, tipo) {
        try {
            const res = await fetch(`/api/notificaciones/${id}/leer`, { method: 'PUT' });
            if (res.ok) {
                this.fetchNotifications();
                if (tipo) this.handleRedirection(tipo);
            }
        } catch (e) {
            console.error("Error marking as read", e);
        }
    },

    handleRedirection: function (tipo) {
        if (!tipo) return;

        const pathname = window.location.pathname.toLowerCase();
        const isClient = pathname.includes('/cliente/') || pathname.includes('portal_cliente');
        const isMecanico = pathname.includes('/mecanico/') || pathname.includes('portal_mecanico');
        
        // Determinar la ruta base
        const isSubfolder = window.location.pathname.includes('/pages/');
        const prefix = isSubfolder ? '../../' : '';

        let mainType = tipo;
        let referenceId = null;
        if (tipo.includes(':')) {
            const parts = tipo.split(':');
            mainType = parts[0];
            referenceId = parts[1];
        }

        console.log(`[Notification Redirection] Type: ${mainType}, Ref: ${referenceId}, Role: ${isClient ? 'Client' : (isMecanico ? 'Mecanico' : 'Taller')}`);

        switch (mainType) {
            case 'resena':
                if (referenceId) {
                    window.location.href = prefix + 'detalle_taller.html?id=' + referenceId;
                } else {
                    window.location.href = prefix + 'pages/taller/resenas_taller.html';
                }
                break;
            case 'mecanico':
                window.location.href = prefix + 'pages/taller/gestionar_mecanicos.html';
                break;
            case 'cita':
                if (isClient) {
                    if (referenceId) {
                        window.location.href = prefix + 'pages/cliente/detalle_cita.html?id=' + referenceId;
                    } else {
                        window.location.href = prefix + 'pages/cliente/mis_citas.html';
                    }
                } else if (isMecanico) {
                    location.reload();
                } else {
                    window.location.href = prefix + 'pages/taller/gestionar_citas.html';
                }
                break;
            case 'inventario':
                window.location.href = prefix + 'pages/taller/gestionar_inventario.html';
                break;
            case 'venta':
                window.location.href = prefix + 'pages/taller/punto_venta.html';
                break;
            default:
                console.log("No redirection for type:", mainType);
        }
    },

    toggleDropdown: function () {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.classList.toggle('active');
            
            // Auto-position check
            const rect = dropdown.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                dropdown.style.right = '0';
                dropdown.style.left = 'auto';
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    NotificationSystem.init();

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notificationDropdown');
        const trigger = document.getElementById('notificationTrigger');
        if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(e.target) && !trigger.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
});
