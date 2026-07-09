/* =========================================================
   search.js
   بحث فوري (Live Search) + فلاتر التصنيف/الماركة/الموديل/الكود
   ========================================================= */

function normalizeText(str){
  return (str || "").toString().trim().toLowerCase();
}

/** يبحث نصياً جزئياً داخل: الاسم، الكود، الموديل، الماركة، التصنيف والتصنيف الفرعي */
function searchProducts(products, query){
  const q = normalizeText(query);
  if(!q) return [];
  return products.filter(p => {
    const haystack = normalizeText([
      p.name, p.code, p.model, p.brand, p.category, p.subcategory
    ].join(" "));
    return haystack.includes(q);
  });
}

/** فلترة إضافية: تصنيف / تصنيف فرعي / ماركة / موديل (نص جزئي) */
function filterProducts(products, { category, subcategory, brand, model } = {}){
  return products.filter(p => {
    if(category && p.category !== category) return false;
    if(subcategory && p.subcategory !== subcategory) return false;
    if(brand && p.brand !== brand) return false;
    if(model && !normalizeText(p.model).includes(normalizeText(model))) return false;
    return true;
  });
}

/* -------------------- شريط البحث في الهيدر (كل الصفحات) -------------------- */
function initHeaderSearch(){
  const input = document.getElementById("header-search-input");
  const panel = document.getElementById("search-suggestions");
  const form = document.getElementById("header-search-form");
  if(!input || !panel) return;

  function render(query){
    const products = (window.__SITE_DATA__ && window.__SITE_DATA__.products) || [];
    const results = searchProducts(products, query).slice(0, 20);

    if(!query.trim()){
      panel.classList.remove("is-open");
      panel.innerHTML = "";
      return;
    }
    if(results.length === 0){
      panel.innerHTML = `<div class="suggestion-empty">لا توجد نتائج مطابقة لـ «${query}»</div>`;
      panel.classList.add("is-open");
      return;
    }
    const shown = results.slice(0, 6);
    panel.innerHTML = shown.map(p => `
      <a class="suggestion-item" href="${BASE_PATH}search.html?q=${encodeURIComponent(p.code)}">
        <img src="${BASE_PATH}${p.image}" alt="" onerror="this.onerror=null;this.src='${BASE_PATH}${SITE.placeholderImage}';">
        <span>
          <span class="s-name">${p.name}</span><br>
          <span class="s-meta">كود: ${p.code} · ${p.brand}</span>
        </span>
      </a>
    `).join("") + (results.length > 6 ? `<div class="suggestion-more">+${results.length - 6} نتيجة أخرى — اضغط Enter لعرض الكل</div>` : "");
    panel.classList.add("is-open");
  }

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("focus", () => { if(input.value.trim()) render(input.value); });
  document.addEventListener("click", (e) => {
    if(!panel.contains(e.target) && e.target !== input) panel.classList.remove("is-open");
  });

  if(form){
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if(!q) return;
      window.location.href = `${BASE_PATH}search.html?q=${encodeURIComponent(q)}`;
    });
  }
}

document.addEventListener("site-data-ready", initHeaderSearch);

/* -------------------- صفحة نتائج البحث الكاملة (search.html) -------------------- */
function initSearchResultsPage(){
  const container = document.getElementById("search-results-grid");
  if(!container) return;

  const params = new URLSearchParams(window.location.search);
  const q = params.get("q") || "";
  const titleEl = document.getElementById("search-query-title");
  const inputEl = document.getElementById("header-search-input");

  document.addEventListener("site-data-ready", (e) => {
    const products = e.detail.products;
    if(inputEl) inputEl.value = q;
    if(titleEl) titleEl.textContent = q ? `نتائج البحث عن: «${q}»` : "كل قطع الغيار المتاحة";
    const results = q ? searchProducts(products, q) : products;
    const countEl = document.getElementById("search-count");
    if(countEl) countEl.textContent = `${results.length} نتيجة`;
    renderProductGrid(container, results);
  });
}
document.addEventListener("DOMContentLoaded", initSearchResultsPage);

/* -------------------- فلاتر صفحات التصنيفات (categories/*.html) -------------------- */
function initCategoryFilters(){
  const grid = document.getElementById("category-product-grid");
  if(!grid) return;

  const categoryId = document.body.getAttribute("data-category");
  const subSelect = document.getElementById("filter-subcategory");
  const brandSelect = document.getElementById("filter-brand");
  const modelInput = document.getElementById("filter-model");
  const resetBtn = document.getElementById("filter-reset");
  const countEl = document.getElementById("results-count");

  document.addEventListener("site-data-ready", (e) => {
    const products = e.detail.products;
    const categories = e.detail.categories;
    const cat = categories.find(c => c.id === categoryId);

    // عنوان ووصف الصفحة
    const titleEl = document.getElementById("category-title");
    const descEl = document.getElementById("category-description");
    if(cat && titleEl) titleEl.textContent = cat.name;
    if(cat && descEl) descEl.textContent = cat.description;

    // بناء خيارات الفلاتر ديناميكياً
    if(cat && subSelect){
      subSelect.innerHTML = `<option value="">كل التصنيفات الفرعية</option>` +
        cat.subcategories.map(s => `<option value="${s}">${s}</option>`).join("");
    }
    const brands = [...new Set(products.filter(p => p.category === categoryId).map(p => p.brand))].sort();
    if(brandSelect){
      brandSelect.innerHTML = `<option value="">كل الماركات</option>` +
        brands.map(b => `<option value="${b}">${b}</option>`).join("");
    }

    function applyFilters(){
      const filtered = filterProducts(products, {
        category: categoryId,
        subcategory: subSelect ? subSelect.value : "",
        brand: brandSelect ? brandSelect.value : "",
        model: modelInput ? modelInput.value : ""
      });
      if(countEl) countEl.textContent = `${filtered.length} قطعة`;
      renderProductGrid(grid, filtered);
    }

    [subSelect, brandSelect].forEach(el => el && el.addEventListener("change", applyFilters));
    if(modelInput) modelInput.addEventListener("input", applyFilters);
    if(resetBtn) resetBtn.addEventListener("click", () => {
      if(subSelect) subSelect.value = "";
      if(brandSelect) brandSelect.value = "";
      if(modelInput) modelInput.value = "";
      applyFilters();
    });

    applyFilters();
  });
}
document.addEventListener("DOMContentLoaded", initCategoryFilters);
