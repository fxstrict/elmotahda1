/* =========================================================
   admin.js — منطق لوحة تحكم الأدمن
   ========================================================= */

/* ---------- حماية الصفحة: لازم يكون مسجل دخول ---------- */
if(!AdminStore.isLoggedIn()){
  location.href = "login.html";
}

const BASE_PATH = "../"; // لأن صفحات الأدمن داخل مجلد admin/

let DB = { categories: [], products: [] };

/* ---------- تحميل البيانات الأولية ---------- */
async function initData(){
  // فئات
  if(AdminStore.hasCategoriesOverride()){
    DB.categories = AdminStore.getCategoriesOverride();
  }else{
    const res = await fetch(BASE_PATH + "data/categories.json");
    DB.categories = await res.json();
  }
  // منتجات
  if(AdminStore.hasProductsOverride()){
    DB.products = AdminStore.getProductsOverride();
  }else{
    const res = await fetch(BASE_PATH + "data/products.json");
    DB.products = await res.json();
  }
}

function persistProducts(){
  AdminStore.saveProducts(DB.products);
}
function persistCategories(){
  AdminStore.saveCategories(DB.categories);
}

/* ---------- Toast ---------- */
function toast(msg, type){
  const el = document.getElementById("admin-toast");
  el.textContent = msg;
  el.className = "admin-toast show" + (type ? " " + type : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- التنقل بين التبويبات ---------- */
function initNav(){
  const links = document.querySelectorAll(".admin-nav-link");
  links.forEach(link => {
    link.addEventListener("click", () => {
      links.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      document.querySelectorAll(".admin-view").forEach(v => v.classList.remove("active"));
      document.getElementById("view-" + link.dataset.view).classList.add("active");
      document.getElementById("sidebar").classList.remove("open");
    });
  });

  document.getElementById("mobile-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    AdminStore.logout();
    location.href = "login.html";
  });

  const session = AdminStore.currentSession();
  document.getElementById("sidebar-username").textContent = session ? session.username : "";
}

/* ---------- نظرة عامة ---------- */
function renderOverview(){
  document.getElementById("stat-products").textContent = DB.products.length;
  document.getElementById("stat-categories").textContent = DB.categories.length;
  const subcats = DB.categories.reduce((sum, c) => sum + (c.subcategories ? c.subcategories.length : 0), 0);
  document.getElementById("stat-subcats").textContent = subcats;
  const hasOverride = AdminStore.hasProductsOverride() || AdminStore.hasCategoriesOverride();
  document.getElementById("stat-source").textContent = hasOverride ? "تعديلات محلية غير مصدَّرة" : "ملفات JSON الأصلية";
}

/* =========================================================
   المنتجات
   ========================================================= */
function fillCategoryFilterOptions(){
  const filterSelect = document.getElementById("product-filter-category");
  filterSelect.innerHTML = '<option value="">كل التصنيفات</option>' +
    DB.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  const formSelect = document.getElementById("p-category");
  formSelect.innerHTML = DB.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
}

function fillSubcategoryOptions(categoryId, selected){
  const sub = document.getElementById("p-subcategory");
  const cat = DB.categories.find(c => c.id === categoryId);
  const subs = cat && cat.subcategories ? cat.subcategories : [];
  sub.innerHTML = '<option value="">— بدون —</option>' + subs.map(s => `<option value="${s}" ${s===selected?"selected":""}>${s}</option>`).join("");
}

function renderProducts(){
  const tbody = document.getElementById("products-tbody");
  const searchVal = document.getElementById("product-search").value.trim().toLowerCase();
  const catVal = document.getElementById("product-filter-category").value;

  let list = DB.products.slice();
  if(catVal) list = list.filter(p => p.category === catVal);
  if(searchVal){
    list = list.filter(p =>
      (p.name || "").toLowerCase().includes(searchVal) ||
      (p.code || "").toLowerCase().includes(searchVal) ||
      (p.brand || "").toLowerCase().includes(searchVal)
    );
  }

  document.getElementById("products-empty").style.display = list.length ? "none" : "block";

  tbody.innerHTML = list.map(p => {
    const cat = DB.categories.find(c => c.id === p.category);
    const imgSrc = (p.image || "").startsWith("data:") ? p.image : BASE_PATH + (p.image || "assets/images/products/placeholder.svg");
    return `
      <tr data-code="${p.code}">
        <td><img class="thumb" src="${imgSrc}" onerror="this.onerror=null;this.src='${BASE_PATH}assets/images/products/placeholder.svg';" alt=""></td>
        <td>${p.code}</td>
        <td>${p.name}</td>
        <td>${cat ? cat.name : "—"}</td>
        <td>${p.brand || "—"}</td>
        <td>
          <div class="row-actions">
            <button class="admin-icon-btn" data-edit-product="${p.code}" title="تعديل">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button class="admin-icon-btn danger" data-delete-product="${p.code}" title="حذف">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-edit-product]").forEach(btn => {
    btn.addEventListener("click", () => openProductModal(btn.dataset.editProduct));
  });
  tbody.querySelectorAll("[data-delete-product]").forEach(btn => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.deleteProduct));
  });
}

function openProductModal(code){
  const form = document.getElementById("product-form");
  form.reset();
  document.getElementById("image-preview").src = BASE_PATH + "assets/images/products/placeholder.svg";
  document.getElementById("p-image-data").value = "";

  fillCategoryFilterOptions(); // يضمن أن قائمة التصنيفات محدّثة

  if(code){
    const p = DB.products.find(pr => pr.code === code);
    document.getElementById("product-modal-title").textContent = "تعديل منتج";
    document.getElementById("p-original-code").value = p.code;
    document.getElementById("p-code").value = p.code;
    document.getElementById("p-name").value = p.name;
    document.getElementById("p-category").value = p.category;
    fillSubcategoryOptions(p.category, p.subcategory);
    document.getElementById("p-brand").value = p.brand || "";
    document.getElementById("p-model").value = p.model || "";
    document.getElementById("p-description").value = p.description || "";
    const imgSrc = (p.image || "").startsWith("data:") ? p.image : BASE_PATH + (p.image || "assets/images/products/placeholder.svg");
    document.getElementById("image-preview").src = imgSrc;
    document.getElementById("p-image-data").value = p.image || "";
  }else{
    document.getElementById("product-modal-title").textContent = "إضافة منتج جديد";
    document.getElementById("p-original-code").value = "";
    if(DB.categories[0]) fillSubcategoryOptions(DB.categories[0].id);
  }

  document.getElementById("product-modal-backdrop").classList.add("show");
}

function deleteProduct(code){
  if(!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
  DB.products = DB.products.filter(p => p.code !== code);
  persistProducts();
  renderProducts();
  renderOverview();
  toast("تم حذف المنتج", "success");
}

function initProductsView(){
  fillCategoryFilterOptions();
  renderProducts();

  document.getElementById("add-product-btn").addEventListener("click", () => openProductModal(null));
  document.getElementById("product-search").addEventListener("input", renderProducts);
  document.getElementById("product-filter-category").addEventListener("change", renderProducts);

  document.getElementById("p-category").addEventListener("change", (e) => {
    fillSubcategoryOptions(e.target.value);
  });

  document.getElementById("image-upload-box").addEventListener("click", () => {
    document.getElementById("p-image-file").click();
  });
  document.getElementById("p-image-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 1.5 * 1024 * 1024){
      toast("الصورة كبيرة جداً، الرجاء اختيار صورة أصغر من 1.5 ميجا", "danger");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById("image-preview").src = ev.target.result;
      document.getElementById("p-image-data").value = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("product-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const originalCode = document.getElementById("p-original-code").value;
    const code = document.getElementById("p-code").value.trim();
    const exists = DB.products.find(p => p.code === code);
    if(exists && code !== originalCode){
      toast("كود المنتج مستخدم بالفعل، اختر كوداً آخر", "danger");
      return;
    }

    const productData = {
      code,
      name: document.getElementById("p-name").value.trim(),
      category: document.getElementById("p-category").value,
      subcategory: document.getElementById("p-subcategory").value,
      brand: document.getElementById("p-brand").value.trim(),
      model: document.getElementById("p-model").value.trim(),
      description: document.getElementById("p-description").value.trim(),
      image: document.getElementById("p-image-data").value || "assets/images/products/placeholder.svg"
    };

    if(originalCode){
      const idx = DB.products.findIndex(p => p.code === originalCode);
      DB.products[idx] = productData;
    }else{
      DB.products.push(productData);
    }

    persistProducts();
    closeModal("product-modal-backdrop");
    renderProducts();
    renderOverview();
    toast("تم حفظ المنتج بنجاح", "success");
  });
}

/* =========================================================
   التصنيفات
   ========================================================= */
let editingSubcats = [];

function renderCategories(){
  const wrap = document.getElementById("categories-list");
  if(!DB.categories.length){
    wrap.innerHTML = `<div class="empty-state">لا توجد تصنيفات بعد.</div>`;
    return;
  }
  wrap.innerHTML = DB.categories.map(c => `
    <div class="admin-panel">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div>
          <h3>${c.name} <span class="badge">${c.id}</span></h3>
          <p class="desc">${c.description || "بدون وصف"}</p>
          <div class="subcat-tags">
            ${(c.subcategories || []).map(s => `<span class="subcat-tag">${s}</span>`).join("") || '<span style="color:var(--color-text-muted);font-size:0.8rem;">لا توجد تصنيفات فرعية</span>'}
          </div>
        </div>
        <div class="row-actions">
          <button class="admin-icon-btn" data-edit-cat="${c.id}" title="تعديل">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="admin-icon-btn danger" data-delete-cat="${c.id}" title="حذف">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join("");

  wrap.querySelectorAll("[data-edit-cat]").forEach(btn => {
    btn.addEventListener("click", () => openCategoryModal(btn.dataset.editCat));
  });
  wrap.querySelectorAll("[data-delete-cat]").forEach(btn => {
    btn.addEventListener("click", () => deleteCategory(btn.dataset.deleteCat));
  });
}

function renderSubcatTagsEditor(){
  const wrap = document.getElementById("c-subcats-list");
  wrap.innerHTML = editingSubcats.map((s, i) => `
    <span class="subcat-tag">${s} <button type="button" data-remove-subcat="${i}">×</button></span>
  `).join("");
  wrap.querySelectorAll("[data-remove-subcat]").forEach(btn => {
    btn.addEventListener("click", () => {
      editingSubcats.splice(Number(btn.dataset.removeSubcat), 1);
      renderSubcatTagsEditor();
    });
  });
}

function openCategoryModal(id){
  const form = document.getElementById("category-form");
  form.reset();
  editingSubcats = [];

  if(id){
    const c = DB.categories.find(cat => cat.id === id);
    document.getElementById("category-modal-title").textContent = "تعديل تصنيف";
    document.getElementById("c-original-id").value = c.id;
    document.getElementById("c-name").value = c.name;
    document.getElementById("c-id").value = c.id;
    document.getElementById("c-description").value = c.description || "";
    editingSubcats = [...(c.subcategories || [])];
  }else{
    document.getElementById("category-modal-title").textContent = "إضافة تصنيف جديد";
    document.getElementById("c-original-id").value = "";
  }

  renderSubcatTagsEditor();
  document.getElementById("category-modal-backdrop").classList.add("show");
}

function deleteCategory(id){
  const inUse = DB.products.some(p => p.category === id);
  if(inUse){
    if(!confirm("هناك منتجات مرتبطة بهذا التصنيف، حذفه لن يحذف المنتجات لكنها ستظهر بدون تصنيف صالح. هل تريد المتابعة؟")) return;
  }else{
    if(!confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;
  }
  DB.categories = DB.categories.filter(c => c.id !== id);
  persistCategories();
  renderCategories();
  renderOverview();
  fillCategoryFilterOptions();
  toast("تم حذف التصنيف", "success");
}

function initCategoriesView(){
  renderCategories();

  document.getElementById("add-category-btn").addEventListener("click", () => openCategoryModal(null));

  document.getElementById("c-add-subcat").addEventListener("click", () => {
    const input = document.getElementById("c-subcat-input");
    const val = input.value.trim();
    if(val && !editingSubcats.includes(val)){
      editingSubcats.push(val);
      renderSubcatTagsEditor();
    }
    input.value = "";
    input.focus();
  });

  document.getElementById("category-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const originalId = document.getElementById("c-original-id").value;
    const id = document.getElementById("c-id").value.trim();
    const exists = DB.categories.find(c => c.id === id);
    if(exists && id !== originalId){
      toast("معرّف التصنيف (id) مستخدم بالفعل", "danger");
      return;
    }

    const catData = {
      id,
      name: document.getElementById("c-name").value.trim(),
      icon: "supplies",
      page: `categories/${id}.html`,
      description: document.getElementById("c-description").value.trim(),
      subcategories: [...editingSubcats]
    };

    if(originalId){
      const idx = DB.categories.findIndex(c => c.id === originalId);
      catData.icon = DB.categories[idx].icon || "supplies";
      catData.page = DB.categories[idx].page || catData.page;
      DB.categories[idx] = catData;
      if(originalId !== id){
        DB.products.forEach(p => { if(p.category === originalId) p.category = id; });
        persistProducts();
      }
    }else{
      DB.categories.push(catData);
    }

    persistCategories();
    closeModal("category-modal-backdrop");
    renderCategories();
    renderOverview();
    fillCategoryFilterOptions();
    toast("تم حفظ التصنيف بنجاح", "success");
  });
}

/* =========================================================
   تصدير / استيراد
   ========================================================= */
function downloadJSON(data, filename){
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function initIOView(){
  document.getElementById("export-products-btn").addEventListener("click", () => {
    downloadJSON(DB.products, "products.json");
    toast("تم تنزيل products.json", "success");
  });
  document.getElementById("export-categories-btn").addEventListener("click", () => {
    downloadJSON(DB.categories, "categories.json");
    toast("تم تنزيل categories.json", "success");
  });

  document.getElementById("import-products-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try{
        const parsed = JSON.parse(ev.target.result);
        if(!Array.isArray(parsed)) throw new Error("bad format");
        DB.products = parsed;
        persistProducts();
        renderProducts();
        renderOverview();
        toast("تم استيراد المنتجات بنجاح", "success");
      }catch(err){
        toast("ملف غير صالح", "danger");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("import-categories-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try{
        const parsed = JSON.parse(ev.target.result);
        if(!Array.isArray(parsed)) throw new Error("bad format");
        DB.categories = parsed;
        persistCategories();
        renderCategories();
        renderOverview();
        fillCategoryFilterOptions();
        toast("تم استيراد التصنيفات بنجاح", "success");
      }catch(err){
        toast("ملف غير صالح", "danger");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("reset-overrides-btn").addEventListener("click", async () => {
    if(!confirm("سيتم حذف كل التعديلات المحفوظة محلياً في هذا المتصفح والعودة للبيانات الأصلية. متابعة؟")) return;
    AdminStore.resetAllOverrides();
    await initData();
    renderProducts();
    renderCategories();
    fillCategoryFilterOptions();
    renderOverview();
    toast("تمت إعادة الضبط", "success");
  });
}

/* =========================================================
   الإعدادات (تغيير اسم المستخدم / كلمة المرور)
   ========================================================= */
function initSettingsView(){
  const form = document.getElementById("settings-form");
  const successBox = document.getElementById("settings-success");
  const errorBox = document.getElementById("settings-error");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    successBox.classList.remove("show");
    errorBox.classList.remove("show");

    const currentPassword = document.getElementById("current-password").value;
    const newUsername = document.getElementById("new-username").value.trim();
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    const creds = AdminStore.getCredentials();

    if(currentPassword !== creds.password){
      errorBox.textContent = "كلمة المرور الحالية غير صحيحة.";
      errorBox.classList.add("show");
      return;
    }
    if(newPassword !== confirmPassword){
      errorBox.textContent = "كلمة المرور الجديدة وتأكيدها غير متطابقين.";
      errorBox.classList.add("show");
      return;
    }
    if(!newUsername){
      errorBox.textContent = "الرجاء إدخال اسم مستخدم صالح.";
      errorBox.classList.add("show");
      return;
    }

    AdminStore.setCredentials(newUsername, newPassword);
    AdminStore.login(newUsername);
    document.getElementById("sidebar-username").textContent = newUsername;
    form.reset();
    successBox.classList.add("show");
    toast("تم تحديث بيانات الدخول", "success");
  });
}

/* ---------- إغلاق النوافذ المنبثقة ---------- */
function closeModal(id){
  document.getElementById(id).classList.remove("show");
}
function initModals(){
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll(".admin-modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if(e.target === backdrop) backdrop.classList.remove("show");
    });
  });
}

/* ---------- التشغيل ---------- */
(async function boot(){
  await initData();
  initNav();
  initModals();
  renderOverview();
  initProductsView();
  initCategoriesView();
  initIOView();
  initSettingsView();
})();
