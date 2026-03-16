// =============================================
// firebase-config.js — دم الخير
// =============================================

const firebaseConfig = {
    apiKey:            "AIzaSyAC8zy_LYAm8obg4rkpDIgOIXAxvQoMVQE",
    authDomain:        "dam-al-kheir.firebaseapp.com",
    projectId:         "dam-al-kheir",
    storageBucket:     "dam-al-kheir.firebasestorage.app",
    messagingSenderId: "540114962646",
    appId:             "1:540114962646:web:e89653a6161cb7f4caa177"
};

// تهيئة Firebase — Compat SDK (يشتغل مع script tags بدون npm)
firebase.initializeApp(firebaseConfig);

// خدمات Firebase
const auth = firebase.auth();
const db   = firebase.firestore();

// اللغة العربية لرسائل الخطأ
auth.useDeviceLanguage();

// =============================================
// هيكل Firestore
// =============================================
//  users/           — بيانات كل مستخدم
//  donors/          — المتبرعون (نفس uid المستخدم)
//  blood_requests/  — طلبات الدم
//  hospitals/       — المستشفيات
// =============================================
