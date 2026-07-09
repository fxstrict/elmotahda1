/* =========================================================
   admin-store.js
   طبقة تخزين مشتركة بين لوحة التحكم والموقع العام.
   تُستخدم localStorage لحفظ: بيانات الدخول، المنتجات، التصنيفات.
   هذا الملف لا يعتمد على أي عناصر DOM؛ يمكن تحميله في أي صفحة.
   ========================================================= */

const AdminStore = (() => {

  const KEYS = {
    creds: "uc_admin_credentials",
    products: "uc_products_override",
    categories: "uc_categories_override",
    session: "uc_admin_session"
  };

  const DEFAULT_CREDS = { username: "hos", password: "111" };

  /* ---------------- بيانات الدخول ---------------- */
  function getCredentials(){
    try{
      const raw = localStorage.getItem(KEYS.creds);
      if(!raw) return { ...DEFAULT_CREDS };
      const parsed = JSON.parse(raw);
      if(!parsed.username || !parsed.password) return { ...DEFAULT_CREDS };
      return parsed;
    }catch(e){
      return { ...DEFAULT_CREDS };
    }
  }

  function setCredentials(username, password){
    localStorage.setItem(KEYS.creds, JSON.stringify({ username, password }));
  }

  function verifyCredentials(username, password){
    const creds = getCredentials();
    return creds.username === username && creds.password === password;
  }

  /* ---------------- الجلسة (تسجيل الدخول) ---------------- */
  function login(username){
    sessionStorage.setItem(KEYS.session, JSON.stringify({ username, ts: Date.now() }));
  }
  function logout(){
    sessionStorage.removeItem(KEYS.session);
  }
  function isLoggedIn(){
    return !!sessionStorage.getItem(KEYS.session);
  }
  function currentSession(){
    try{
      return JSON.parse(sessionStorage.getItem(KEYS.session));
    }catch(e){ return null; }
  }

  /* ---------------- المنتجات ---------------- */
  function hasProductsOverride(){
    return localStorage.getItem(KEYS.products) !== null;
  }
  function getProductsOverride(){
    try{
      const raw = localStorage.getItem(KEYS.products);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function saveProducts(products){
    localStorage.setItem(KEYS.products, JSON.stringify(products));
  }

  /* ---------------- التصنيفات ---------------- */
  function hasCategoriesOverride(){
    return localStorage.getItem(KEYS.categories) !== null;
  }
  function getCategoriesOverride(){
    try{
      const raw = localStorage.getItem(KEYS.categories);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function saveCategories(categories){
    localStorage.setItem(KEYS.categories, JSON.stringify(categories));
  }

  /* ---------------- إعادة الضبط الكامل ---------------- */
  function resetAllOverrides(){
    localStorage.removeItem(KEYS.products);
    localStorage.removeItem(KEYS.categories);
  }

  return {
    KEYS,
    getCredentials, setCredentials, verifyCredentials,
    login, logout, isLoggedIn, currentSession,
    hasProductsOverride, getProductsOverride, saveProducts,
    hasCategoriesOverride, getCategoriesOverride, saveCategories,
    resetAllOverrides
  };
})();
