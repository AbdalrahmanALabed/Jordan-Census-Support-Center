const API = '/api';
let token = localStorage.getItem('jcocc_token');
let currentUser = null;
let currentIncidentId = null;
let ws = null;

const PRIORITY_LABELS = { p1: 'P1', p2: 'P2', p3: 'P3', p4: 'P4', p5: 'P5' };
const STATUS_LABELS = {
    detected: 'مكتشف', classified: 'مصنّف', diagnosing: 'تشخيص',
    in_progress: 'قيد المعالجة', auto_resolved: 'حل تلقائي',
    resolved: 'تم الحل', escalated: 'مصعّد', major: 'جسيم', closed: 'مغلق',
};
const STAGE_LABELS = {
    login: 'تسجيل الدخول', download_assignment: 'تحميل التكليف',
    buildings: 'المباني', households: 'الأسر',
    runtime_forms: 'النماذج', synchronization: 'المزامنة', completion: 'الإكمال',
};

async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(`${API}${path}`, { ...options, headers });
    if (resp.status === 401) {
        localStorage.removeItem('jcocc_token');
        window.location.href = '/login';
        return null;
    }
    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    return resp.json();
}

function checkAuth() {
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

async function init() {
    if (!checkAuth()) return;

    try {
        currentUser = await api('/auth/me');
        document.getElementById('userName').textContent = currentUser.full_name_ar || currentUser.full_name;
        document.getElementById('userRole').textContent = currentUser.role.replace('_', ' ');
        document.querySelector('.user-avatar').textContent = (currentUser.full_name_ar || currentUser.full_name)[0];
    } catch {
        window.location.href = '/login';
        return;
    }

    setupNavigation();
    setupWebSocket();
    updateDateTime();
    setInterval(updateDateTime, 1000);

    await loadDashboard();
    setInterval(loadDashboard, 30000);
}

function updateDateTime() {
    const el = document.getElementById('datetime');
    if (el) el.textContent = new Date().toLocaleString('ar-JO');
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.view);
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('jcocc_token');
        window.location.href = '/login';
    });

    document.getElementById('refreshIncidents')?.addEventListener('click', loadIncidents);
    document.getElementById('refreshJourneys')?.addEventListener('click', loadJourneys);
    document.getElementById('filterPriority')?.addEventListener('change', loadIncidents);
    document.getElementById('filterGov')?.addEventListener('change', loadIncidents);
    document.getElementById('blockedOnly')?.addEventListener('change', loadJourneys);

    document.getElementById('aiForm')?.addEventListener('submit', handleAIQuestion);
    document.getElementById('btnDiagnose')?.addEventListener('click', diagnoseCurrentIncident);
    document.getElementById('btnResolve')?.addEventListener('click', resolveCurrentIncident);
}

function switchView(view) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));

    const titles = {
        dashboard: 'لوحة التحكم', incidents: 'إدارة الحوادث',
        major: 'الحوادث الجسيمة', journeys: 'رحلة الـ Enumerator',
        health: 'صحة الأنظمة', knowledge: 'قاعدة المعرفة', ai: 'المساعد الذكي',
    };
    document.getElementById('viewTitle').textContent = titles[view] || view;

    const loaders = {
        dashboard: loadDashboard, incidents: loadIncidents, major: loadMajorIncidents,
        journeys: loadJourneys, health: loadHealth, knowledge: loadKnowledge,
    };
    loaders[view]?.();
}

function setupWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/ws/live`);
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'event' || data.type === 'incident_update') {
            loadDashboard();
            const activeView = document.querySelector('.view.active');
            if (activeView?.id === 'view-incidents') loadIncidents();
        }
    };
    ws.onclose = () => setTimeout(setupWebSocket, 5000);
}

async function loadDashboard() {
    try {
        const [stats, incidents, govStats, health] = await Promise.all([
            api('/dashboard/stats'),
            api('/incidents?limit=8'),
            api('/governorates/stats'),
            api('/health/systems'),
        ]);

        document.getElementById('statOpen').textContent = stats.open_incidents;
        document.getElementById('statMajor').textContent = stats.major_incidents;
        document.getElementById('statAuto').textContent = stats.auto_resolved_today;
        document.getElementById('statBlocked').textContent = stats.blocked_enumerators;
        document.getElementById('statMTTR').textContent = stats.avg_resolution_minutes;
        document.getElementById('statSLA').textContent = stats.sla_compliance_rate + '%';
        document.getElementById('openIncidentsBadge').textContent = stats.open_incidents;

        renderRecentIncidents(incidents);
        renderGovHealth(govStats);
        renderSystemHealth(health, 'systemHealthDash');
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

function renderRecentIncidents(incidents) {
    const el = document.getElementById('recentIncidents');
    if (!incidents?.length) {
        el.innerHTML = '<div class="empty-state">لا توجد حوادث</div>';
        return;
    }
    el.innerHTML = incidents.map(inc => incidentRowHTML(inc)).join('');
    el.querySelectorAll('.incident-item').forEach((item, i) => {
        item.addEventListener('click', () => openIncident(incidents[i].id));
    });
}

function incidentRowHTML(inc) {
    return `
        <div class="incident-item">
            <span class="priority-badge priority-${inc.priority}">${PRIORITY_LABELS[inc.priority]}</span>
            <div class="incident-info">
                <div class="title">${inc.title_ar || inc.title}</div>
                <div class="meta">${inc.incident_number} • ${inc.governorate || 'وطني'} • ${inc.affected_users_count} متأثر</div>
            </div>
            <span class="status-badge status-${inc.status}">${STATUS_LABELS[inc.status] || inc.status}</span>
        </div>`;
}

function renderGovHealth(stats) {
    const el = document.getElementById('govHealth');
    if (!stats?.length) { el.innerHTML = '<div class="empty-state">—</div>'; return; }
    el.innerHTML = stats.map(g => {
        const color = g.health_score >= 90 ? 'var(--success)' : g.health_score >= 70 ? 'var(--warning)' : 'var(--danger)';
        return `
            <div class="gov-item">
                <span class="gov-name">${g.governorate}</span>
                <div class="gov-bar"><div class="gov-bar-fill" style="width:${g.health_score}%;background:${color}"></div></div>
                <span class="gov-score" style="color:${color}">${Math.round(g.health_score)}</span>
            </div>`;
    }).join('');
}

function renderSystemHealth(services, containerId) {
    const el = document.getElementById(containerId);
    if (!services?.length) return;
    el.innerHTML = `<div class="health-grid">${services.map(s => `
        <div class="health-card">
            <div class="service-name">${s.service_name}</div>
            <span class="health-status health-${s.status}">${s.status === 'healthy' ? 'سليم' : s.status === 'degraded' ? 'متدهور' : 'متوقف'}</span>
            <div class="health-metrics">
                <span>⏱ ${s.response_time_ms?.toFixed(0) || '—'} ms</span>
                <span>📊 Error: ${((s.error_rate || 0) * 100).toFixed(1)}%</span>
            </div>
        </div>`).join('')}</div>`;
}

async function loadIncidents() {
    const priority = document.getElementById('filterPriority')?.value || '';
    const gov = document.getElementById('filterGov')?.value || '';
    let url = '/incidents?limit=50';
    if (priority) url += `&priority=${priority}`;
    if (gov) url += `&governorate=${gov}`;

    const incidents = await api(url);
    const el = document.getElementById('incidentsTable');
    if (!incidents?.length) {
        el.innerHTML = '<div class="empty-state">لا توجد حوادث</div>';
        return;
    }
    el.innerHTML = incidents.map(inc => incidentRowHTML(inc)).join('');
    el.querySelectorAll('.incident-item').forEach((item, i) => {
        item.addEventListener('click', () => openIncident(incidents[i].id));
    });
}

async function loadMajorIncidents() {
    const incidents = await api('/incidents?major_only=true&limit=20');
    const el = document.getElementById('majorIncidents');
    if (!incidents?.length) {
        el.innerHTML = '<div class="empty-state">✅ لا توجد حوادث جسيمة نشطة</div>';
        return;
    }
    el.innerHTML = incidents.map(inc => `
        <div class="panel" style="margin-bottom:1rem;cursor:pointer" onclick="openIncident(${inc.id})">
            <div class="panel-header">
                <h3>🔴 ${inc.title_ar || inc.title}</h3>
                <span class="priority-badge priority-p1">P1</span>
            </div>
            <div class="panel-body">
                <div class="detail-row"><span class="detail-label">الرقم</span><span>${inc.incident_number}</span></div>
                <div class="detail-row"><span class="detail-label">المتأثرين</span><span>${inc.affected_users_count}</span></div>
                <div class="detail-row"><span class="detail-label">السبب</span><span>${inc.root_cause || 'قيد التحقيق'}</span></div>
            </div>
        </div>`).join('');
}

async function loadJourneys() {
    const blocked = document.getElementById('blockedOnly')?.checked || false;
    const journeys = await api(`/journeys?blocked_only=${blocked}&limit=50`);
    const el = document.getElementById('journeysGrid');
    if (!journeys?.length) {
        el.innerHTML = '<div class="empty-state">لا توجد بيانات</div>';
        return;
    }
    el.innerHTML = journeys.map(j => `
        <div class="journey-card ${j.is_blocked ? 'blocked' : ''}">
            <div class="journey-id">${j.enumerator_id}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.3rem">${j.governorate || '—'} • ${j.forms_completed} نموذج</div>
            <span class="journey-stage">${STAGE_LABELS[j.current_stage] || j.current_stage}</span>
            ${j.is_blocked ? `<div class="journey-blocked">⛔ ${j.blocked_reason || 'محجوب'}</div>` : ''}
        </div>`).join('');
}

async function loadHealth() {
    const services = await api('/health/systems');
    renderSystemHealth(services, 'healthGrid');
}

async function loadKnowledge() {
    const articles = await api('/knowledge');
    const el = document.getElementById('knowledgeList');
    if (!articles?.length) {
        el.innerHTML = '<div class="empty-state">لا توجد مقالات</div>';
        return;
    }
    el.innerHTML = articles.map(a => `
        <div class="kb-item">
            <h4>${a.title_ar || a.title}</h4>
            <p>${a.content_ar || a.content}</p>
            <div class="kb-tags">${(a.tags || []).map(t => `<span class="kb-tag">${t}</span>`).join('')}</div>
        </div>`).join('');
}

async function openIncident(id) {
    currentIncidentId = id;
    const [inc, timeline] = await Promise.all([
        api(`/incidents/${id}`),
        api(`/incidents/${id}/timeline`),
    ]);

    document.getElementById('modalTitle').textContent = inc.title_ar || inc.title;
    document.getElementById('modalBody').innerHTML = `
        <div class="detail-row"><span class="detail-label">الرقم</span><span class="detail-value">${inc.incident_number}</span></div>
        <div class="detail-row"><span class="detail-label">الأولوية</span><span class="detail-value"><span class="priority-badge priority-${inc.priority}">${PRIORITY_LABELS[inc.priority]}</span></span></div>
        <div class="detail-row"><span class="detail-label">الحالة</span><span class="detail-value">${STATUS_LABELS[inc.status]}</span></div>
        <div class="detail-row"><span class="detail-label">المحافظة</span><span class="detail-value">${inc.governorate || 'وطني'}</span></div>
        <div class="detail-row"><span class="detail-label">المتأثرين</span><span class="detail-value">${inc.affected_users_count}</span></div>
        <div class="detail-row"><span class="detail-label">السبب الجذري</span><span class="detail-value">${inc.root_cause || '—'}</span></div>
        <div class="detail-row"><span class="detail-label">الثقة</span><span class="detail-value">${inc.root_cause_confidence ? (inc.root_cause_confidence * 100).toFixed(0) + '%' : '—'}</span></div>
        <div class="detail-row"><span class="detail-label">الفريق</span><span class="detail-value">${inc.recommended_team || '—'}</span></div>
        <div class="detail-row"><span class="detail-label">الإجراء</span><span class="detail-value">${inc.recommended_action || '—'}</span></div>
        <h4 style="margin:1.5rem 0 0.75rem">الجدول الزمني</h4>
        ${(timeline || []).map(t => `
            <div class="timeline-item">
                <strong>${t.action}</strong> — ${t.actor}
                <div class="time">${new Date(t.created_at).toLocaleString('ar-JO')}</div>
                ${t.details ? `<div style="font-size:0.85rem;margin-top:0.3rem;color:var(--text-secondary)">${t.details}</div>` : ''}
            </div>`).join('') || '<div class="empty-state">—</div>'}`;

    document.getElementById('incidentModal').classList.add('open');
}

function closeModal() {
    document.getElementById('incidentModal').classList.remove('open');
    currentIncidentId = null;
}

async function diagnoseCurrentIncident() {
    if (!currentIncidentId) return;
    const result = await api(`/incidents/${currentIncidentId}/diagnose`, { method: 'POST' });
    openIncident(currentIncidentId);
}

async function resolveCurrentIncident() {
    if (!currentIncidentId) return;
    await api(`/incidents/${currentIncidentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
    });
    closeModal();
    loadDashboard();
}

async function handleAIQuestion(e) {
    e.preventDefault();
    const input = document.getElementById('aiQuestion');
    const question = input.value.trim();
    if (!question) return;

    const messages = document.getElementById('aiMessages');
    messages.innerHTML += `<div class="ai-msg user"><p>${question}</p></div>`;
    input.value = '';

    try {
        const result = await api('/ai/assist', {
            method: 'POST',
            body: JSON.stringify({ question, locale: 'ar' }),
        });
        messages.innerHTML += `<div class="ai-msg bot"><strong>🤖 JCOCC</strong><p>${result.answer}</p><small style="color:var(--text-muted)">ثقة: ${(result.confidence * 100).toFixed(0)}%</small></div>`;
    } catch {
        messages.innerHTML += `<div class="ai-msg bot"><p>حدث خطأ. حاول مرة أخرى.</p></div>`;
    }
    messages.scrollTop = messages.scrollHeight;
}

window.switchView = switchView;
window.openIncident = openIncident;
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', init);
