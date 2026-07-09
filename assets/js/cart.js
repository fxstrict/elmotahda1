/* =========================================================
   cart.js
   سلة اختيارات القطع + إرسال طلب كشف سعر عبر واتساب
   يعتمد بالكامل على localStorage (بدون سيرفر أو حساب مستخدم)
   ========================================================= */

const Cart = (() => {
  const STORAGE_KEY = "unitedco_cart_v1";

  function read(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function write(cart){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCount();
  }
  function getProducts(){
    return (window.__SITE_DATA__ && window.__SITE_DATA__.products) || [];
  }
  function findProduct(code){
    return getProducts().find(p => p.code === code);
  }

  function add(code, qty=1){
    const cart = read();
    cart[code] = (cart[code] || 0) + qty;
    write(cart);
    openDrawer();
    renderDrawer();
  }
  function setQty(code, qty){
    const cart = read();
    if(qty <= 0){ delete cart[code]; }
    else { cart[code] = qty; }
    write(cart);
    renderDrawer();
  }
  function remove(code){
    const cart = read();
    delete cart[code];
    write(cart);
    renderDrawer();
  }
  function clear(){
    write({});
    renderDrawer();
  }
  function totalCount(){
    const cart = read();
    return Object.values(cart).reduce((a,b) => a+b, 0);
  }
  function updateCount(){
    document.querySelectorAll(".cart-count").forEach(el => {
      el.textContent = totalCount();
    });
  }

  function waLink(text){
    return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(text)}`;
  }

  function buildCartMessage(){
    const cart = read();
    const products = getProducts();
    const lines = Object.keys(cart).map((code, i) => {
      const p = products.find(pp => pp.code === code);
      if(!p) return null;
      return `${i+1}. ${p.name} - كود: ${p.code} - الموديل: ${p.model} - الكمية: ${cart[code]}`;
    }).filter(Boolean);

    return `طلب كشف سعر جديد من موقع ${SITE.companyName}:\n\n${lines.join("\n")}\n\nبرجاء إفادتي بالأسعار والتوافر. شكراً.`;
  }

  // بعض المتصفحات (متصفحات التطبيقات المدمجة مثل فيسبوك/انستجرام، أو
  // عند تفعيل مانع النوافذ المنبثقة) تمنع window.open وتُرجع null بدون
  // أي رسالة واضحة؛ هنا نفتح الرابط في نفس الصفحة كحل بديل بدل ترك
  // الزر بلا أي استجابة للمستخدم.
  function openWa(url){
    const newTab = window.open(url, "_blank");
    if(!newTab){
      window.location.href = url;
    }
  }

  function sendCartOrder(){
    const cart = read();
    if(Object.keys(cart).length === 0) return;
    openWa(waLink(buildCartMessage()));
  }

  function quickOrder(code){
    const p = findProduct(code);
    if(!p) return;
    const msg = `استفسار سريع عن قطعة غيار من موقع ${SITE.companyName}:\n\nالاسم: ${p.name}\nالكود: ${p.code}\nالموديل المتوافق: ${p.model}\nالماركة: ${p.brand}\n\nبرجاء إفادتي بالسعر والتوافر. شكراً.`;
    openWa(waLink(msg));
  }

  /* -------------------- واجهة الدرج (Drawer) -------------------- */
  function ensureDrawer(){
    if(document.getElementById("cart-drawer")) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="overlay" id="cart-overlay"></div>
      <aside class="cart-drawer" id="cart-drawer" role="dialog" aria-label="سلة الطلب">
        <div class="cart-header">
          <h3>سلة الطلب</h3>
          <button class="cart-close" id="cart-close-btn" aria-label="إغلاق السلة">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <div class="cart-items" id="cart-items"></div>
        <div class="cart-footer" id="cart-footer"></div>
      </aside>
    `;
    document.body.appendChild(wrap);
    document.getElementById("cart-close-btn").addEventListener("click", closeDrawer);
    document.getElementById("cart-overlay").addEventListener("click", closeDrawer);
  }
  function openDrawer(){
    ensureDrawer();
    renderDrawer();
    document.getElementById("cart-drawer").classList.add("is-open");
    document.getElementById("cart-overlay").classList.add("is-open");
  }
  function closeDrawer(){
    const d = document.getElementById("cart-drawer");
    const o = document.getElementById("cart-overlay");
    if(d) d.classList.remove("is-open");
    if(o) o.classList.remove("is-open");
  }
  function renderDrawer(){
    const itemsEl = document.getElementById("cart-items");
    const footerEl = document.getElementById("cart-footer");
    if(!itemsEl) return;
    const cart = read();
    const codes = Object.keys(cart);
    const products = getProducts();

    if(codes.length === 0){
      itemsEl.innerHTML = `
        <div class="cart-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2 3h2l2.2 11.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20 7H6"/></svg>
          <p>السلة فارغة حالياً.<br>أضف القطع التي تحتاجها من صفحات التصنيفات.</p>
        </div>`;
      footerEl.innerHTML = "";
      return;
    }

    itemsEl.innerHTML = codes.map(code => {
      const p = products.find(pp => pp.code === code);
      if(!p) return "";
      const img = BASE_PATH + p.image;
      const ph = BASE_PATH + SITE.placeholderImage;
      return `
        <div class="cart-item">
          <img src="${img}" alt="${p.name}" onerror="this.onerror=null;this.src='${ph}';">
          <div class="ci-info">
            <div class="ci-name">${p.name}</div>
            <div class="ci-meta">كود: ${p.code} | ${p.brand}</div>
            <div class="ci-controls">
              <div class="qty-control">
                <button aria-label="إنقاص الكمية" onclick="Cart.setQty('${code}', ${cart[code]-1})">−</button>
                <input type="text" readonly value="${cart[code]}">
                <button aria-label="زيادة الكمية" onclick="Cart.setQty('${code}', ${cart[code]+1})">+</button>
              </div>
              <button class="ci-remove" onclick="Cart.remove('${code}')">حذف</button>
            </div>
          </div>
        </div>`;
    }).join("");

    footerEl.innerHTML = `
      <div class="items-count">عدد القطع المختارة: ${codes.reduce((a,c)=>a+cart[c],0)}</div>
      <button class="btn btn-whatsapp btn-block" onclick="Cart.sendCartOrder()">
        إرسال طلب كشف السعر عبر واتساب
      </button>
      <button class="btn btn-ghost btn-block" onclick="Cart.clear()">تفريغ السلة</button>
    `;
  }

  return { add, setQty, remove, clear, updateCount, sendCartOrder, quickOrder, openDrawer, closeDrawer, renderDrawer };
})();

document.addEventListener("DOMContentLoaded", () => {
  const cartBtn = document.getElementById("cart-toggle");
  if(cartBtn){
    cartBtn.addEventListener("click", () => Cart.openDrawer());
  }
  Cart.updateCount();
});
