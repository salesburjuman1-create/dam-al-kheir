// =============================================
// script.js — النسخة النهائية
// =============================================

// ===== HELPERS =====
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-circle':'fa-info-circle'}"></i><span>${message}</span>`;
    Object.assign(toast.style, {
        position:'fixed', bottom:'28px', left:'50%',
        transform:'translateX(-50%) translateY(80px)',
        background: type==='success'?'#16A34A':type==='error'?'#DC2626':'#0066CC',
        color:'white', padding:'14px 28px', borderRadius:'50px',
        display:'flex', alignItems:'center', gap:'10px',
        fontSize:'0.95rem', fontFamily:'Cairo, sans-serif', fontWeight:'600',
        boxShadow:'0 8px 32px rgba(0,0,0,0.2)', zIndex:'9999',
        transition:'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        whiteSpace:'nowrap',
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(80px)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}
function showLoading(btn, text='جاري التحميل...') {
    if (!btn) return;
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}
function hideLoading(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText;
}
function formatArabicTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60)    return 'الآن';
    if (diff < 3600)  return `منذ ${Math.floor(diff/60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff/3600)} ساعة`;
    return `منذ ${Math.floor(diff/86400)} يوم`;
}
function phoneToEmail(phone) {
    return `${phone.replace(/[^0-9]/g,'')}@damalkheir.iq`;
}

function handleDonorBtn(e) {
    e.preventDefault();
    if (auth.currentUser) {
        window.location.href = 'donors.html';
    } else {
        window.location.href = 'register.html?type=donor';
    }
}

function getAuthError(code) {
    const map = {
        'auth/user-not-found':         'رقم الهاتف غير مسجل',
        'auth/wrong-password':         'كلمة المرور غير صحيحة',
        'auth/invalid-credential':     'رقم الهاتف أو كلمة المرور غير صحيحة',
        'auth/email-already-in-use':   'هذا الرقم مسجل مسبقاً',
        'auth/weak-password':          'كلمة المرور ضعيفة (٨ أحرف على الأقل)',
        'auth/too-many-requests':      'محاولات كثيرة، انتظر قليلاً',
        'auth/network-request-failed': 'تحقق من اتصال الإنترنت',
    };
    return map[code] || 'حدث خطأ، حاول مرة أخرى';
}

// =============================================
// AUTH
// =============================================

let _cachedUserData = null;
const ADMIN_EMAILS  = ['sales.burjuman1@gmail.com']; // بريد الأدمن

if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async user => {
        const page = window.location.pathname.split('/').pop() || 'index.html';

        // admin.html تدار بكودها الخاص — script.js لا يتدخل
        if (page === 'admin.html') return;

        await updateNavForUser(user);

        // إذا مسجل وعلى صفحة login/register — حوله للرئيسية
        if (user && (page === 'login.html' || page === 'register.html')) {
            window.location.href = 'index.html';
            return;
        }

        // ملء النماذج تلقائياً
        if (user) prefillForms(user);

        // إظهار رابط الأدمن في الفوتر
        const adminLink = document.getElementById('adminFooterLink');
        if (adminLink) {
            adminLink.style.display = (user && ADMIN_EMAILS.includes(user.email)) ? 'block' : 'none';
        }
    });
}

async function updateNavForUser(user) {
    document.querySelectorAll('.nav-login-link').forEach(el => el.style.display = user ? 'none' : 'inline-flex');
    document.querySelectorAll('.nav-register-link').forEach(el => el.style.display = user ? 'none' : 'inline-flex');
    document.querySelectorAll('.nav-dash-link').forEach(el => {
        el.style.display = user ? 'inline-flex' : 'none';
        if (user && el.tagName === 'A') el.href = 'profile.html';
    });
    // زر الأدمن — يظهر فقط لصاحب الحساب
    document.querySelectorAll('.nav-admin-link').forEach(el => {
        el.style.display = (user && ADMIN_EMAILS.includes(user.email)) ? 'inline-flex' : 'none';
    });

    const nameEl = document.getElementById('navUserName');
    if (!nameEl || !user) return;
    nameEl.textContent = 'حسابي';

    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const d = doc.data();
            _cachedUserData = d;
            // الأولوية: الاسم العربي المسجل أولاً، مو اسم Gmail
            nameEl.textContent = d.firstName || d.name?.split(' ')[0] || user.displayName?.split(' ')[0] || 'حسابي';
        } else {
            nameEl.textContent = user.displayName?.split(' ')[0] || 'حسابي';
        }
    } catch(e) {
        nameEl.textContent = user.displayName?.split(' ')[0] || 'حسابي';
    }
}

async function prefillForms(user) {
    try {
        let data = _cachedUserData;
        if (!data) {
            const doc = await db.collection('users').doc(user.uid).get();
            if (!doc.exists) return;
            data = doc.data();
            _cachedUserData = data;
        }
        // نموذج طلب الدم
        const nameEl  = document.getElementById('patientName');
        const phoneEl = document.getElementById('requestPhone');
        const cityEl  = document.getElementById('requestCity');
        if (nameEl  && !nameEl.value)  nameEl.value  = data.name  || '';
        if (phoneEl && !phoneEl.value) phoneEl.value = data.phone || '';
        if (cityEl  && data.city) {
            for (let opt of cityEl.options) {
                if (opt.value === data.city || opt.text === data.city) { opt.selected = true; break; }
            }
        }
    } catch(e) {}
}

// ===== LOGIN =====
async function handleLogin(e) {
    e.preventDefault();
    const btn   = document.querySelector('#loginForm .btn-submit');
    const phone = document.getElementById('loginPhone')?.value?.trim();
    const pass  = document.getElementById('loginPassword')?.value;
    if (!phone || !pass) return showToast('أدخل رقم الهاتف وكلمة المرور', 'error');

    showLoading(btn, 'جاري الدخول...');
    try {
        const cred = await auth.signInWithEmailAndPassword(phoneToEmail(phone), pass);
        showToast('أهلاً بعودتك! 🎉', 'success');
        const doc = await db.collection('users').doc(cred.user.uid).get();
        const isComplete = doc.exists && doc.data().phone && doc.data().bloodType;
        const redirectTo = sessionStorage.getItem('redirectAfterLogin') || (isComplete ? 'index.html' : 'complete-profile.html');
        sessionStorage.removeItem('redirectAfterLogin');
        setTimeout(() => window.location.href = redirectTo, 1200);
    } catch (err) {
        hideLoading(btn);
        showToast(getAuthError(err.code), 'error');
    }
}

// ===== REGISTER =====
async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('registerFinalBtn');

    const firstName = document.getElementById('firstName')?.value?.trim();
    const lastName  = document.getElementById('lastName')?.value?.trim() || '';
    const phone     = document.getElementById('regPhone')?.value?.trim();
    const city      = document.getElementById('regCity')?.value;
    const age       = document.getElementById('regAge')?.value;
    const bloodType = document.querySelector('#step3 .blood-type-btn.selected')?.textContent?.trim();
    const pass      = document.getElementById('regPassword')?.value;
    const passConf  = document.getElementById('regPasswordConfirm')?.value;
    const role      = document.querySelector('.type-btn.selected')?.dataset?.type || 'donor';
    const terms     = document.getElementById('termsCheck')?.checked;

    if (!firstName)      return showToast('يرجى إدخال الاسم الأول', 'error');
    if (!phone)          return showToast('يرجى إدخال رقم الهاتف', 'error');
    if (!city)           return showToast('يرجى اختيار المحافظة', 'error');
    if (!bloodType)      return showToast('يرجى اختيار فصيلة الدم', 'error');
    if (!pass)           return showToast('يرجى إدخال كلمة المرور', 'error');
    if (pass.length < 8) return showToast('كلمة المرور ٨ أحرف على الأقل', 'error');
    if (pass !== passConf) return showToast('كلمات المرور غير متطابقة ❌', 'error');
    if (!terms)          return showToast('يرجى الموافقة على الشروط', 'error');
const lastDonation = document.getElementById('lastDonationDate')?.value || null;
const isSmoker = document.getElementById('isSmoker')?.value === 'yes';
const hasChronicDisease = document.getElementById('hasChronicDisease')?.value === 'yes';

// تحقق من فترة 3 أشهر
if (lastDonation) {
    const lastDate = new Date(lastDonation);
    const monthsDiff = (new Date() - lastDate) / (1000*60*60*24*30);
    if (monthsDiff < 3) {
        return showToast('⚠️ لا يمكن التبرع قبل مرور 3 أشهر من آخر تبرع', 'error');
    }
}

// أضفها للـ userData:
const userData = {
    ...
    lastDonation: lastDonation || null,
    isSmoker,
    hasChronicDisease,
    chronicDiseaseDetails: document.getElementById('chronicDiseaseDetails')?.value || '',
    ...
};
    showLoading(btn, 'جاري الإنشاء...');
    try {
        const cred = await auth.createUserWithEmailAndPassword(phoneToEmail(phone), pass);
        const uid  = cred.user.uid;
        const userData = {
            name: `${firstName} ${lastName}`.trim(),
            firstName, lastName, phone, city,
            age: parseInt(age)||0, bloodType, role,
            available: true, totalDonations: 0, lastDonation: null,
            profileComplete: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('users').doc(uid).set(userData);
        if (role === 'donor') {
            await db.collection('donors').doc(uid).set({...userData, uid});
        }
        _cachedUserData = userData;
        showToast('تم إنشاء حسابك بنجاح! مرحباً بك 🎉', 'success');
        setTimeout(() => window.location.href = 'index.html', 1500);
    } catch (err) {
        hideLoading(btn);
        showToast(getAuthError(err.code), 'error');
    }
}

// ===== LOGOUT =====
async function handleLogout() {
    _cachedUserData = null;
    try {
        await auth.signOut();
        showToast('تم تسجيل الخروج', 'info');
        setTimeout(() => window.location.href = 'index.html', 1000);
    } catch(e) { showToast('حدث خطأ', 'error'); }
}

// =============================================
// BLOOD REQUESTS
// =============================================

async function handleRequest(e) {
    e.preventDefault();
    const btn  = document.querySelector('.request-form-card .btn-submit');
    const user = auth.currentUser;
    if (!user) {
        showToast('يجب تسجيل الدخول أولاً لإرسال طلب', 'error');
        sessionStorage.setItem('redirectAfterLogin', 'request.html');
        return setTimeout(() => window.location.href = 'login.html', 1500);
    }
    const bloodType = document.querySelector('.blood-type-btn.selected')?.textContent?.trim();
    const city      = document.getElementById('requestCity')?.value;
    const hospital  = document.getElementById('requestHospital')?.value?.trim();
    const phone     = document.getElementById('requestPhone')?.value?.trim();
    if (!bloodType) return showToast('يرجى اختيار فصيلة الدم المطلوبة', 'error');
    if (!city)      return showToast('يرجى اختيار المحافظة', 'error');
    if (!hospital)  return showToast('يرجى إدخال اسم المستشفى', 'error');
    if (!phone)     return showToast('يرجى إدخال رقم التواصل', 'error');

    showLoading(btn, 'جاري الإرسال...');
    let userName = _cachedUserData?.name || user.displayName || 'مستخدم';
    if (!_cachedUserData) {
        try {
            const ud = await db.collection('users').doc(user.uid).get();
            if (ud.exists) { _cachedUserData = ud.data(); userName = _cachedUserData.name || userName; }
        } catch(e) {}
    }
    try {
        await db.collection('blood_requests').add({
            bloodType, userName,
            patientName: document.getElementById('patientName')?.value?.trim() || userName,
            patientAge:  parseInt(document.getElementById('patientAge')?.value)||0,
            units:       parseInt(document.getElementById('bloodUnits')?.value)||1,
            diagnosis:   document.getElementById('diagnosis')?.value?.trim()||'',
            notes:       document.getElementById('requestNotes')?.value?.trim()||'',
            city, hospital, phone,
            urgent:    document.getElementById('urgentBtn')?.classList.contains('selected') ?? true,
            status:    'active',
            userId:    user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('تم إرسال طلبك! سيتم التواصل معك قريباً ❤️', 'success');
        setTimeout(() => window.location.href = 'requests.html', 2000);
    } catch (err) {
        hideLoading(btn);
        showToast('حدث خطأ في الإرسال، حاول مرة أخرى', 'error');
    }
}

function loadRequests(containerId, limitCount=20, urgentOnly=false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400)"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:12px">جاري التحميل...</p></div>';
    let q = db.collection('blood_requests').where('status','==','active').orderBy('createdAt','desc').limit(limitCount);
    if (urgentOnly) q = db.collection('blood_requests').where('status','==','active').where('urgent','==',true).orderBy('createdAt','desc').limit(limitCount);
   q.onSnapshot(snap => {
    _allRequests = snap.docs.map(doc => ({id:doc.id,...doc.data()}));
    const countEl = document.getElementById('requestsCount');
    if (countEl) countEl.textContent = _allRequests.length;
    renderFilteredRequests();
        if (snap.empty) {
            container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--gray-400)"><i class="fas fa-heartbeat fa-3x" style="margin-bottom:16px;display:block"></i><p>لا توجد طلبات نشطة حالياً</p></div>';
            return;
        }
        container.innerHTML = snap.docs.map(doc => renderRequestCard({id:doc.id,...doc.data()})).join('');
    }, (err) => {
        // إذا كان الخطأ index مفقود — جرب بدون orderBy
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
            db.collection('blood_requests').where('status','==','active').limit(limitCount)
            .onSnapshot(snap2 => {
                if (snap2.empty) { container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--gray-400)"><p>لا توجد طلبات نشطة حالياً</p></div>'; return; }
                container.innerHTML = snap2.docs.map(doc => renderRequestCard({id:doc.id,...doc.data()})).join('');
            });
        } else {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--red)"><i class="fas fa-exclamation-triangle fa-2x"></i><p style="margin-top:12px">خطأ في التحميل</p></div>';
        }
    });
}
let _allRequests = [];

function filterRequests() {
    const search  = document.getElementById('reqSearch')?.value?.toLowerCase()||'';
    const blood   = document.getElementById('reqBloodFilter')?.value||'';
    const city    = document.getElementById('reqCityFilter')?.value||'';
    const urgency = document.getElementById('reqUrgencyFilter')?.value||'';
    const filtered = _allRequests.filter(r =>
        (!search  || r.hospital?.includes(search) || r.city?.includes(search)) &&
        (!blood   || r.bloodType === blood) &&
        (!city    || r.city === city) &&
        (!urgency || (urgency==='urgent' ? r.urgent : !r.urgent))
    );
    const countEl = document.getElementById('requestsCount');
    if (countEl) countEl.textContent = filtered.length;
    const container = document.getElementById('full-requests-list');
    if (container) container.innerHTML = filtered.length
        ? filtered.map(renderRequestCard).join('')
        : '<div style="text-align:center;padding:60px;color:var(--gray-400)">لا توجد نتائج</div>';
}
function renderFilteredRequests() {
    const container = document.getElementById('full-requests-list');
    if (!container) return;
    if (_allRequests.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--gray-400)"><i class="fas fa-heartbeat fa-3x" style="margin-bottom:16px;display:block"></i><p>لا توجد طلبات نشطة حالياً</p></div>';
        return;
    }
    container.innerHTML = _allRequests.map(renderRequestCard).join('');
}

// =============================================
// DONORS
// =============================================

function loadDonors(bloodFilter='', cityFilter='') {
    const grid = document.getElementById('donorsGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400);grid-column:1/-1"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    let q = bloodFilter
        ? db.collection('donors').where('bloodType','==',bloodFilter).where('available','==',true)
        : db.collection('donors').where('available','==',true).orderBy('createdAt','desc').limit(50);
    q.onSnapshot(snap => {
        let donors = snap.docs.map(d => ({id:d.id,...d.data()}));
        if (cityFilter) donors = donors.filter(d => d.city?.includes(cityFilter));
        const countEl = document.getElementById('donorsCount');
        if (countEl) countEl.textContent = donors.length;
        grid.innerHTML = donors.length
            ? donors.map(renderDonorCard).join('')
            : '<div style="text-align:center;padding:60px;color:var(--gray-400);grid-column:1/-1"><i class="fas fa-users fa-3x" style="margin-bottom:16px;display:block"></i><p>لا يوجد متبرعون بهذه المعايير</p></div>';
    }, (err) => {
        // Fallback بدون orderBy إذا Index مفقود
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
            let q2 = bloodFilter
                ? db.collection('donors').where('bloodType','==',bloodFilter).where('available','==',true)
                : db.collection('donors').where('available','==',true).limit(50);
            q2.onSnapshot(snap2 => {
                let donors = snap2.docs.map(d => ({id:d.id,...d.data()}));
                if (cityFilter) donors = donors.filter(d => d.city?.includes(cityFilter));
                const countEl = document.getElementById('donorsCount');
                if (countEl) countEl.textContent = donors.length;
                grid.innerHTML = donors.length
                    ? donors.map(renderDonorCard).join('')
                    : '<div style="text-align:center;padding:60px;color:var(--gray-400);grid-column:1/-1"><p>لا يوجد متبرعون بهذه المعايير</p></div>';
            });
        }
    });
}

async function contactDonor(donorId) {
    if (!auth.currentUser) {
        showToast('يجب تسجيل الدخول للتواصل مع المتبرع', 'info');
        sessionStorage.setItem('redirectAfterLogin', 'donors.html');
        return setTimeout(() => window.location.href = 'login.html', 1500);
    }
    try {
        const doc = await db.collection('donors').doc(donorId).get();
        if (doc.exists) window.location.href = `tel:${doc.data().phone}`;
    } catch { showToast('تعذر الوصول لبيانات المتبرع', 'error'); }
}

function contactRequest(phone) {
    if (!auth.currentUser) {
        showToast('يجب تسجيل الدخول للتواصل', 'info');
        sessionStorage.setItem('redirectAfterLogin', 'requests.html');
        return setTimeout(() => window.location.href = 'login.html', 1500);
    }
    window.location.href = `tel:${phone}`;
}

// =============================================
// STATS
// =============================================

async function loadRealStats() {
    try {
        const [donorsSnap, requestsSnap] = await Promise.all([
            db.collection('donors').where('available','==',true).get(),
            db.collection('blood_requests').where('status','==','active').get()
        ]);
        const urgentCount = requestsSnap.docs.filter(d => d.data().urgent).length;
        animateNumber('stat-donors',    donorsSnap.size||0);
        animateNumber('stat-requests',  requestsSnap.size||0);
        animateNumber('stat-hospitals', 89);
        animateNumber('stat-urgent',    urgentCount);
        animateNumber('donors-count',    donorsSnap.size||0);
        animateNumber('requests-count',  requestsSnap.size||0);
        animateNumber('hospitals-count', 89);
        animateNumber('emergency-count', urgentCount);
    } catch(e) {}
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    if (target === 0) { el.textContent = '0'; return; }
    const duration=1800, step=target/(duration/16);
    let current=0;
    const timer = setInterval(() => {
        current = Math.min(current+step, target);
        el.textContent = Math.floor(current).toLocaleString('ar-EG');
        if (current >= target) clearInterval(timer);
    }, 16);
}

// =============================================
// RENDER CARDS
// =============================================

function renderRequestCard(r) {
    const timeStr = r.createdAt ? formatArabicTime(r.createdAt) : 'الآن';
    return `
    <div class="request-card fade-in">
        <div class="request-blood-badge">${r.bloodType}</div>
        <div class="request-info">
            <h3>${r.hospital}</h3>
            <div class="request-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${r.city}</span>
                <span><i class="fas fa-tint"></i> ${r.units||1} وحدة</span>
                ${r.patientName && r.patientName!=='غير محدد'?`<span><i class="fas fa-user-injured"></i> ${r.patientName}</span>`:''}
            </div>
        </div>
        <div class="request-right">
            ${r.urgent
                ?'<span class="badge-urgent"><i class="fas fa-bolt"></i> طارئ</span>'
                :'<span style="padding:4px 12px;background:#EFF8FF;color:#0066CC;border-radius:50px;font-size:0.75rem;font-weight:700;border:1px solid #CCE5FF">مجدول</span>'}
            <span class="request-time"><i class="far fa-clock"></i> ${timeStr}</span>
            <button class="btn-respond" onclick="contactRequest('${r.phone}')">
                <i class="fas fa-phone"></i> تواصل
            </button>
        </div>
    </div>`;
}

function renderDonorCard(donor) {
    const initials = donor.name ? donor.name.split(' ').map(n=>n[0]).join('').substring(0,2) : '؟';
    return `
    <div class="donor-card fade-in">
        <div class="donor-header">
            <div class="donor-avatar">${initials}</div>
            <div>
                <div class="donor-name">${donor.name||'مستخدم'}</div>
                <div class="donor-city"><i class="fas fa-map-marker-alt" style="color:var(--red);font-size:0.7rem"></i> ${donor.city||'غير محدد'}</div>
            </div>
        </div>
        <span class="donor-blood">${donor.bloodType||'؟'}</span>
        <div class="donor-meta">
            ${donor.age?`<span><i class="fas fa-birthday-cake"></i> ${donor.age} سنة</span>`:''}
            <span><i class="fas fa-tint"></i> ${donor.totalDonations||0} مرة تبرع</span>
            <span><i class="fas fa-circle" style="font-size:0.5rem;color:${donor.available?'#16A34A':'#DC2626'}"></i>
                ${donor.available?'متاح للتبرع':'غير متاح حالياً'}</span>
        </div>
        <button class="btn-contact" onclick="contactDonor('${donor.id}')"
            ${!donor.available?'disabled style="opacity:0.5;cursor:not-allowed"':''}>
            <i class="fas fa-phone"></i> ${donor.available?'تواصل معه':'غير متاح'}
        </button>
    </div>`;
}

// =============================================
// UI HELPERS
// =============================================

function toggleMenu() { document.getElementById('navMenu')?.classList.toggle('open'); }
function selectBlood(btn) {
    btn.closest('.blood-type-selector').querySelectorAll('.blood-type-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
}
function selectUrgency(type) {
    document.getElementById('urgentBtn')?.classList.remove('selected');
    document.getElementById('normalBtn')?.classList.remove('selected');
    document.getElementById(type==='urgent'?'urgentBtn':'normalBtn')?.classList.add('selected');
}
function selectType(type) {
    document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('selected'));
    document.getElementById(`btn-${type}`)?.classList.add('selected');
}
function goToStep(step) {
    [1,2,3].forEach(s=>{
        const el=document.getElementById(`step${s}`);
        const dot=document.getElementById(`step${s}-dot`);
        if(el) el.style.display=s===step?'block':'none';
        if(dot){dot.classList.remove('active','done');if(s<step)dot.classList.add('done');if(s===step)dot.classList.add('active');}
        const line=document.getElementById(`line${s}`);
        if(line) line.classList.toggle('done',s<step);
    });
}
function togglePassword() {
    const input=document.getElementById('loginPassword');
    const icon=document.getElementById('eyeIcon');
    if(input&&icon){input.type=input.type==='password'?'text':'password';icon.className=input.type==='password'?'fas fa-eye':'fas fa-eye-slash';}
}
function filterDonors() { loadDonors(document.getElementById('bloodFilter')?.value||'', document.getElementById('cityFilter')?.value||''); }
function setView(view) {
    const grid=document.getElementById('donorsGrid');
    const gBtn=document.getElementById('gridViewBtn');
    const lBtn=document.getElementById('listViewBtn');
    if(!grid)return;
    grid.style.gridTemplateColumns=view==='grid'?'':'1fr';
    if(gBtn){gBtn.style.background=view==='grid'?'var(--red)':'white';gBtn.style.color=view==='grid'?'white':'var(--gray-600)';}
    if(lBtn){lBtn.style.background=view==='list'?'var(--red)':'white';lBtn.style.color=view==='list'?'white':'var(--gray-600)';}
}

// =============================================
// INIT
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('scroll', () => {
        const nb=document.getElementById('navbar');
        if(nb) nb.style.boxShadow=window.scrollY>50?'0 4px 24px rgba(0,0,0,0.1)':'none';
    });
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    if (typeof db === 'undefined') return;

    const page = window.location.pathname.split('/').pop()||'index.html';
    switch(page) {
        case 'index.html': case '':
            loadRealStats();
            loadRequests('requests-list', 3, true);
            break;
        case 'requests.html':
            loadRequests('full-requests-list', 50);
            break;
        case 'donors.html':
            const p=new URLSearchParams(window.location.search);
            const blood=p.get('blood')||'';
            loadDonors(blood,'');
            if(blood){const bf=document.getElementById('bloodFilter');if(bf)bf.value=blood;}
            break;
    }
});
