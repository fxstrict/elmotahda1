/* =========================================================
   render.js
   تحميل البيانات (categories.json / products.json) وعرضها
   في كل الصفحات: الهيدر، القائمة، الفوتر، بطاقات التصنيفات
   والمنتجات.
   ========================================================= */

const SITE = {
  whatsappNumber: "201140070010", // TODO: تم تحويله لصيغة دولية (بدون + وبدون أصفار البداية)
  ownerName: "المهندس محمد حسن",
  companyName: "الشركة المتحدة لقطع غيار التبريد والتكييف والغسالات وتوريدات عامة",
  placeholderImage: "assets/images/products/placeholder.svg"
};

// يحدَّد تلقائياً حسب عمق المسار الحالي (لأن الصفحات داخل categories/ تحتاج "../" قبل الروابط)
const BASE_PATH = location.pathname.includes("/categories/") ? "../" : "";

const ICONS = {
  snow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2.5 7l19 10M2.5 7l4 .5M2.5 7l1.5 3.7M21.5 17l-4-.5M21.5 17l-1.5-3.7M21.5 7l-19 10M21.5 7l-4 .5M21.5 7l-1.5 3.7M2.5 17l4-.5M2.5 17l1.5-3.7"/></svg>`,
  fridge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="1.5"/><line x1="5" y1="10" x2="19" y2="10"/><line x1="8" y1="5" x2="8" y2="7"/><line x1="8" y1="13" x2="8" y2="15"/></svg>`,
  washer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="13" r="5.5"/><circle cx="12" cy="13" r="2.2"/><circle cx="7" cy="6" r="0.8" fill="currentColor" stroke="none"/><circle cx="10" cy="6" r="0.8" fill="currentColor" stroke="none"/></svg>`,
  supplies: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3 17.7 9.3 8.3 18.7 5.3 15.7z"/><path d="M13 8 16 11"/><path d="M3 21l2.2-5.2L9.2 19.8z"/><circle cx="18" cy="6" r="2"/></svg>`,
  ac: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="7" rx="2"/><path d="M6 16v2M10 16v3M14 16v2M18 16v3"/></svg>`
};
function getIcon(id){ return ICONS[id] || ICONS.supplies; }

/* -------------------- تحميل البيانات --------------------
   إذا قام الأدمن بإضافة/تعديل بيانات من لوحة التحكم (admin/)
   فسيتم حفظها في localStorage على نفس المتصفح، ويقوم الموقع
   هنا بقراءتها أولاً (إن وجدت) بدلاً من ملفات JSON الأصلية.
   هذا يسمح بمعاينة فورية للتغييرات، مع العلم أن هذه التغييرات
   محلية للمتصفح فقط حتى يتم تصدير الملفات ورفعها فعلياً
   (راجع تبويب "تصدير / استيراد" داخل لوحة التحكم).
   ------------------------------------------------------- */
async function loadData(){
  let categories, products;

  if(window.AdminStore && AdminStore.hasCategoriesOverride()){
    categories = AdminStore.getCategoriesOverride();
  }else{
    const catRes = await fetch(BASE_PATH + "data/categories.json");
    categories = await catRes.json();
  }

  if(window.AdminStore && AdminStore.hasProductsOverride()){
    products = AdminStore.getProductsOverride();
  }else{
    const prodRes = await fetch(BASE_PATH + "data/products.json");
    products = await prodRes.json();
  }

  return { categories, products };
}

/* -------------------- بناء الهيدر والقائمة --------------------
   ملحوظة مهمة: هذه الدالة تُبنى فوراً عند تحميل الصفحة (DOMContentLoaded)
   بغض النظر عن نجاح تحميل بيانات categories.json/products.json أو فشله.
   قبل هذا التعديل كانت القائمة بالكامل (وزر الهامبرجر) تُبنى فقط
   داخل .then() الخاص بتحميل البيانات، فإذا فشل تحميل البيانات لأي
   سبب (مثال شائع جداً: فتح الموقع مباشرة من الجهاز عبر file:// بدل
   تشغيله على سيرفر محلي، لأن المتصفح يمنع قراءة ملفات JSON بهذه
   الطريقة) كانت القائمة تبقى فارغة تماماً وزر القائمة لا يُظهر أي
   محتوى عند الضغط عليه. الآن القائمة الأساسية (الرئيسية/من نحن/
   التوريد للشركات/اتصل بنا) وزر الفتح/الإغلاق يعملان فوراً ودائماً،
   وقائمة "التصنيفات" المنسدلة تُملأ لاحقاً بمجرد نجاح تحميل البيانات.
   ------------------------------------------------------------- */
function renderNavSkeleton(){
  const nav = document.getElementById("main-nav");
  if(!nav) return;

  const currentPage = document.body.getAttribute("data-page") || "";

  nav.innerHTML = `
    <a href="${BASE_PATH}index.html" ${currentPage==="home"?'aria-current="page"':''}>الرئيسية</a>
    <div class="has-dropdown">
      <a href="#" id="categories-dd-toggle" aria-haspopup="true" aria-expanded="false">التصنيفات <span class="dd-arrow">▾</span></a>
      <div class="dropdown-panel" id="categories-dd-panel"><span class="dd-status">جاري تحميل التصنيفات...</span></div>
    </div>
    <a href="${BASE_PATH}about.html" ${currentPage==="about"?'aria-current="page"':''}>من نحن</a>
    <a href="${BASE_PATH}corporate-supply.html" ${currentPage==="corporate"?'aria-current="page"':''}>خدمات التوريد للشركات</a>
    <a href="${BASE_PATH}contact.html" ${currentPage==="contact"?'aria-current="page"':''}>اتصل بنا</a>
  `;

  const toggle = document.getElementById("nav-toggle");
  if(toggle){
    toggle.addEventListener("click", () => {
      nav.classList.toggle("is-open");
      const expanded = nav.classList.contains("is-open");
      toggle.setAttribute("aria-expanded", expanded);
      // اقفل قائمة التصنيفات المنسدلة كل ما تتقفل القائمة الرئيسية، عشان تبدأ مقفولة في المرة الجاية
      if(!expanded){
        const openDropdown = nav.querySelector(".has-dropdown.open");
        if(openDropdown){
          openDropdown.classList.remove("open");
          const ddLink = openDropdown.querySelector("#categories-dd-toggle");
          if(ddLink) ddLink.setAttribute("aria-expanded", "false");
        }
      }
    });
  }

  // قائمة "التصنيفات" المنسدلة: تعمل باللمس على الموبيل (لا تعتمد فقط على hover)
  const ddToggle = document.getElementById("categories-dd-toggle");
  if(ddToggle){
    ddToggle.addEventListener("click", (e) => {
      e.preventDefault();
      const parent = ddToggle.closest(".has-dropdown");
      const isOpen = parent.classList.toggle("open");
      ddToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // اضبط مسارات شعار الهيدر حسب عمق الصفحة
  document.querySelectorAll("[data-base-href]").forEach(el => {
    el.setAttribute("href", BASE_PATH + el.getAttribute("data-base-href"));
  });
}

/* -------------------- ملء قائمة "التصنيفات" المنسدلة بعد نجاح تحميل البيانات -------------------- */
function renderCategoryLinks(categories){
  const panel = document.getElementById("categories-dd-panel");
  if(!panel) return;
  panel.innerHTML = categories.map(c =>
    `<a href="${BASE_PATH}${c.page}">${c.name}</a>`
  ).join("");
}

/* -------------------- رسالة عند فشل تحميل بيانات الموقع --------------------
   تظهر بدلاً من ترك عناصر الصفحة فارغة بصمت، مع توضيح السبب الأشهر
   (فتح index.html مباشرة من الجهاز بدل تشغيله عبر سيرفر محلي) وزر
   لإعادة المحاولة.
   ------------------------------------------------------------- */
function showDataError(err){
  console.error("تعذر تحميل بيانات الموقع (categories.json / products.json):", err);

  const isFileProtocol = location.protocol === "file:";
  const reasonHint = isFileProtocol
    ? `يبدو أنك تفتح الموقع مباشرة من ملفاته (file://) بدون سيرفر محلي، والمتصفح يمنع قراءة ملفات JSON بهذه الطريقة. شغّل أمر <code>python3 -m http.server</code> (أو أي سيرفر محلي مشابه) من داخل مجلد الموقع، ثم افتح الرابط الذي يظهر بدلاً من فتح index.html مباشرة.`
    : `تحقق من اتصالك بالإنترنت، ثم أعد تحميل الصفحة. إذا استمرت المشكلة تواصل معنا مباشرة عبر واتساب.`;

  const mainMessage = `
    <div class="no-results">
      تعذر تحميل بيانات المنتجات والتصنيفات.<br>${reasonHint}
      <br><button type="button" id="retry-load-data-btn" class="btn btn-outline btn-sm" style="margin-top:12px;">إعادة المحاولة</button>
    </div>`;

  // أول عنصر موجود من هذه القائمة فقط (كل صفحة تحتوي على واحد منها كحد أقصى)
  const primaryContainerIds = ["category-product-grid", "search-results-grid", "category-grid"];
  const primaryEl = primaryContainerIds.map(id => document.getElementById(id)).find(Boolean);
  if(primaryEl) primaryEl.innerHTML = mainMessage;

  const featuredEl = document.getElementById("featured-grid");
  if(featuredEl && featuredEl !== primaryEl){
    featuredEl.innerHTML = `<div class="no-results">تعذر تحميل المنتجات المميزة حالياً.</div>`;
  }

  const ddPanel = document.getElementById("categories-dd-panel");
  if(ddPanel) ddPanel.innerHTML = `<span class="dd-status">تعذر تحميل التصنيفات</span>`;

  const footerCats = document.getElementById("footer-categories");
  if(footerCats) footerCats.innerHTML = "";

  const retryBtn = document.getElementById("retry-load-data-btn");
  if(retryBtn) retryBtn.addEventListener("click", () => location.reload());
}

/* -------------------- بناء الفوتر -------------------- */
function renderFooterCategoryLinks(categories){
  const el = document.getElementById("footer-categories");
  if(!el) return;
  el.innerHTML = categories.map(c => `<li><a href="${BASE_PATH}${c.page}">${c.name}</a></li>`).join("");
}

/* -------------------- بطاقات التصنيفات (الصفحة الرئيسية) -------------------- */
function renderCategoryGrid(categories){
  const grid = document.getElementById("category-grid");
  if(!grid) return;
  grid.innerHTML = categories.map(c => `
    <a class="category-card" href="${BASE_PATH}${c.page}">
      <span class="cat-icon">${getIcon(c.icon)}</span>
      <h3>${c.name}</h3>
      <p>${c.description}</p>
      <span class="cat-link">تصفح المنتجات ←</span>
    </a>
  `).join("");
}

/* -------------------- بطاقة منتج (قالب مشترك) -------------------- */
function productCardHTML(p){
  const img = BASE_PATH + p.image;
  const ph = BASE_PATH + SITE.placeholderImage;
  return `
    <article class="product-card" data-code="${p.code}">
      <div class="p-image">
        <img src="${img}" alt="${p.name}" loading="lazy"
             onerror="this.onerror=null;this.src='${ph}';">
      </div>
      <div class="p-body">
        <span class="p-code">كود: ${p.code}</span>
        <h3>${p.name}</h3>
        <p class="p-meta"><strong>الماركة:</strong> ${p.brand}</p>
        <p class="p-meta"><strong>التوافق:</strong> ${p.model}</p>
        <div class="p-actions">
          <div class="row">
            <button class="btn btn-primary btn-sm btn-block" onclick="Cart.add('${p.code}')">أضف لسلة الطلب</button>
          </div>
          <div class="row">
            <button class="btn btn-whatsapp btn-sm btn-block" onclick="Cart.quickOrder('${p.code}')">
              ${whatsappIconSmall()} طلب سريع واتساب
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}
function whatsappIconSmall(){
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.44 1.33 4.94L2 22l5.24-1.37c1.45.79 3.08 1.21 4.8 1.21 5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm0 18.18c-1.55 0-3.06-.42-4.38-1.2l-.31-.19-3.11.82.83-3.03-.2-.31a8.18 8.18 0 0 1-1.26-4.31c0-4.53 3.69-8.22 8.23-8.22 4.53 0 8.22 3.69 8.22 8.22 0 4.53-3.69 8.22-8.22 8.22Zm4.52-6.16c-.25-.12-1.47-.73-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.36-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.68 4.25 3.75.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29Z"/></svg>`;
}
function renderProductGrid(container, products){
  if(!products.length){
    container.innerHTML = `<div class="no-results">لا توجد قطع مطابقة لبحثك حالياً. جرّب تعديل الفلاتر أو تواصل معنا مباشرة عبر واتساب وسنساعدك في توفير القطعة.</div>`;
    return;
  }
  container.innerHTML = products.map(productCardHTML).join("");
}

/* -------------------- منتجات مميزة (الرئيسية) -------------------- */
function renderFeatured(products, codes){
  const el = document.getElementById("featured-grid");
  if(!el) return;
  const featured = products.filter(p => codes.includes(p.code));
  el.innerHTML = featured.map(productCardHTML).join("");
}

/* -------------------- التحميل الرئيسي عند فتح أي صفحة -------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // القائمة الرئيسية وزر الهامبرجر يعملان فوراً، بغض النظر عن نجاح تحميل البيانات
  renderNavSkeleton();

  loadData().then(({categories, products}) => {
    window.__SITE_DATA__ = { categories, products };
    renderCategoryLinks(categories);
    renderFooterCategoryLinks(categories);
    renderCategoryGrid(categories);
    if(document.getElementById("featured-grid")){
      renderFeatured(products, ["AC-COMP-001","WM-PUMP-014","RF-COMP-030","AC-REM-005"]);
    }
    document.dispatchEvent(new CustomEvent("site-data-ready", { detail: { categories, products }}));
    if(window.Cart) Cart.updateCount();
  }).catch(err => {
    showDataError(err);
  });
});
