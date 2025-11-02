// ====== 1. ССЫЛКА НА ТАБЛИЦУ С ЦЕНАМИ ======
const PRICE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTCNB2cD-LexAA4WYi5tR7a7wxkTjaaV-gos_bh2ZmnAPJTEAfOFIb8027q337NJGjvlH7hIw32q7VI/pub?gid=980462976&single=true&output=csv";

// ====== 2. ПАРСЕР CSV ======
function parseCSV(text) {
  const rows = [];
  let current = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && insideQuotes && next === '"') {
      // двойная кавычка внутри "..."
      value += '"';
      i++;
    } else if (ch === '"') {
      insideQuotes = !insideQuotes;
    } else if (ch === "," && !insideQuotes) {
      current.push(value.trim());
      value = "";
    } else if ((ch === "\n" || ch === "\r") && !insideQuotes) {
      if (value.length || current.length) {
        current.push(value.trim());
        rows.push(current);
        current = [];
        value = "";
      }
    } else {
      value += ch;
    }
  }

  if (value.length || current.length) {
    current.push(value.trim());
    rows.push(current);
  }

  return rows;
}

// ====== 3. ЗАГРУЗКА ЦЕН ИЗ GOOGLE SHEETS ======
async function loadPrices() {
  try {
    const res = await fetch(PRICE_SHEET_URL, { cache: "no-cache" });
    const text = await res.text();
    const rows = parseCSV(text);

    if (!rows.length) {
      console.warn("Цены: таблица пустая.");
      return;
    }

    // первая строка — заголовки
    const headers = rows.shift().map((h) => h.trim().toLowerCase());

    const data = rows.map((r) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (r[i] || "").trim();
      });
      return obj;
    });

    // обновляем цены в карточках
    data.forEach((item) => {
      if (!item.id) return;
      const card = document.querySelector(
        `.product[data-product-id="${item.id}"]`
      );
      if (!card) return;

      const priceEl = card.querySelector(".price");
      if (!priceEl) return;

      if (item.price) {
        priceEl.textContent =
          item.price + " ₽" + (item.unit ? " / " + item.unit : "");
      } else {
        priceEl.textContent = "Цена по запросу";
      }
    });

    console.log("✅ Цены обновлены из Google Sheets. Всего строк:", data.length);

    // ====== АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ ДАТЫ ======
    const updateEl = document.querySelector(".update-date");
    if (updateEl) {
      const now = new Date();
      const months = [
        "января",
        "февраля",
        "марта",
        "апреля",
        "мая",
        "июня",
        "июля",
        "августа",
        "сентября",
        "октября",
        "ноября",
        "декабря",
      ];
      const formatted = `${now.getDate()} ${
        months[now.getMonth()]
      } ${now.getFullYear()} г.`;
      updateEl.textContent = `Обновлено: ${formatted}`;
    }
  } catch (err) {
    console.error("❌ Ошибка загрузки цен:", err);
    // если хочешь — можно тут писать в подвале "не удалось обновить"
    // const updateEl = document.querySelector(".update-date");
    // if (updateEl) updateEl.textContent = "Не удалось обновить цены";
  }
}

// ====== 4. ОСНОВНАЯ ЛОГИКА САЙТА ======
document.addEventListener("DOMContentLoaded", function () {
  // --- кэш элементов ---
  const categoryItems = document.querySelectorAll(".categories .category-item");
  const seedsSub = document.getElementById("seeds-subcategories");
  const fertilizersSub = document.getElementById("fertilizers-subcategories");
  const dripInfo = document.getElementById("drip-info");
  const products = document.querySelectorAll(".product");
  const searchInput = document.getElementById("searchInput");
  const toTop = document.getElementById("toTop");

  const sanitize = (str) => (str || "").toLowerCase();

  // какая сейчас активная область (подкатегория / категория)
  function getActiveScopeCategory() {
    if (seedsSub && seedsSub.style.display !== "none") {
      const activeSub = seedsSub.querySelector(".category-item.active");
      if (activeSub) return activeSub.getAttribute("data-category");
    }
    if (fertilizersSub && fertilizersSub.style.display !== "none") {
      const activeSub = fertilizersSub.querySelector(".category-item.active");
      if (activeSub) return activeSub.getAttribute("data-category");
    }
    const activeTop = document.querySelector(".categories .category-item.active");
    return activeTop ? activeTop.getAttribute("data-category") : "all";
  }

  // ====== ФИЛЬТРАЦИЯ ТОВАРОВ ======
  function filterProducts(category, searchTerm = "") {
    const term = sanitize(searchTerm);

    products.forEach((product) => {
      const prodCat = product.getAttribute("data-category");
      const nameEl = product.querySelector("h3");
      const name = sanitize(nameEl ? nameEl.textContent : "");

      const matchesCategory = category === "all" || prodCat === category;
      const matchesSearch = !term || name.includes(term);

      product.style.display =
        matchesCategory && matchesSearch ? "block" : "none";
    });
  }

  // показать всё при загрузке
  filterProducts("all", "");

  // ====== ПОИСК ======
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const scope = getActiveScopeCategory();
      filterProducts(scope || "all", this.value.trim());
    });
  }

  // ====== ХЕЛПЕРЫ ДЛЯ ПАНЕЛЕЙ ======
  function showSeedsSubs() {
    if (seedsSub) seedsSub.style.display = "flex";
    if (fertilizersSub) fertilizersSub.style.display = "none";
    if (dripInfo) dripInfo.style.display = "none";
  }
  function showFertilizerSubs() {
    if (fertilizersSub) fertilizersSub.style.display = "flex";
    if (seedsSub) seedsSub.style.display = "none";
    if (dripInfo) dripInfo.style.display = "none";
  }
  function showDripInfo() {
    if (dripInfo) dripInfo.style.display = "block";
    if (seedsSub) seedsSub.style.display = "none";
    if (fertilizersSub) fertilizersSub.style.display = "none";
  }
  function hideAllSubs() {
    if (seedsSub) seedsSub.style.display = "none";
    if (fertilizersSub) fertilizersSub.style.display = "none";
    if (dripInfo) dripInfo.style.display = "none";
  }
  function clearTopActive() {
    document
      .querySelectorAll(".categories .category-item")
      .forEach((el) => el.classList.remove("active"));
  }

  // ====== КЛИК ПО ВЕРХНИМ КАТЕГОРИЯМ ======
  categoryItems.forEach((item) => {
    item.addEventListener("click", function () {
      const category = this.getAttribute("data-category");

      clearTopActive();
      this.classList.add("active");

      if (category === "seeds") {
        showSeedsSubs();
        if (seedsSub && !seedsSub.querySelector(".category-item.active")) {
          const def =
            seedsSub.querySelector('.category-item[data-category="tomato"]') ||
            seedsSub.querySelector(".category-item");
          if (def) def.classList.add("active");
          filterProducts(
            def ? def.getAttribute("data-category") : "all",
            searchInput ? searchInput.value.trim() : ""
          );
        } else {
          filterProducts(
            getActiveScopeCategory(),
            searchInput ? searchInput.value.trim() : ""
          );
        }
      } else if (category === "fertilizers") {
        showFertilizerSubs();
        if (
          fertilizersSub &&
          !fertilizersSub.querySelector(".category-item.active")
        ) {
          const def =
            fertilizersSub.querySelector(
              '.category-item[data-category="soluble"]'
            ) || fertilizersSub.querySelector(".category-item");
          if (def) def.classList.add("active");
          filterProducts(
            def ? def.getAttribute("data-category") : "all",
            searchInput ? searchInput.value.trim() : ""
          );
        } else {
          filterProducts(
            getActiveScopeCategory(),
            searchInput ? searchInput.value.trim() : ""
          );
        }
      } else if (category === "drip") {
        showDripInfo();
        filterProducts("drip", searchInput ? searchInput.value.trim() : "");
      } else {
        hideAllSubs();
        filterProducts(category, searchInput ? searchInput.value.trim() : "");
      }
    });
  });

  // ====== ПОДКАТЕГОРИИ: СЕМЕНА ======
  if (seedsSub) {
    seedsSub.querySelectorAll(".category-item").forEach((subItem) => {
      subItem.addEventListener("click", function (e) {
        e.stopPropagation();
        const subCategory = this.getAttribute("data-category");

        seedsSub
          .querySelectorAll(".category-item")
          .forEach((el) => el.classList.remove("active"));
        this.classList.add("active");

        filterProducts(
          subCategory,
          searchInput ? searchInput.value.trim() : ""
        );
      });
    });
  }

  // ====== ПОДКАТЕГОРИИ: УДОБРЕНИЯ ======
  if (fertilizersSub) {
    fertilizersSub.querySelectorAll(".category-item").forEach((subItem) => {
      subItem.addEventListener("click", function (e) {
        e.stopPropagation();
        const subCategory = this.getAttribute("data-category");

        fertilizersSub
          .querySelectorAll(".category-item")
          .forEach((el) => el.classList.remove("active"));
        this.classList.add("active");

        filterProducts(
          subCategory,
          searchInput ? searchInput.value.trim() : ""
        );
      });
    });
  }

  // ====== КНОПКА "НАВЕРХ" ======
  if (toTop) {
    window.addEventListener("scroll", () => {
      toTop.style.display = window.scrollY > 600 ? "block" : "none";
    });

    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ====== МОДАЛКА ПОЛНОЭКРАННОГО ПРОСМОТРА ======
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("imageModalImg");
  const modalTitle = document.getElementById("imageModalTitle");
  const modalClose = document.querySelector(".image-modal-close");

  if (modal) {
    // клик по всей карточке
    document.querySelectorAll(".product").forEach((card) => {
      const img = card.querySelector("img");
      const titleEl = card.querySelector("h3");
      if (!img) return;

      card.style.cursor = "zoom-in";

      card.addEventListener("click", () => {
        modal.style.display = "flex";
        // чтобы анимация сработала
        requestAnimationFrame(() => modal.classList.add("show"));

        modalImg.src = img.src;
        modalTitle.textContent = titleEl ? titleEl.textContent.trim() : "";

        document.body.style.overflow = "hidden";
      });
    });

    // закрытие по крестику
    if (modalClose) {
      modalClose.addEventListener("click", () => {
        modal.classList.remove("show");
        setTimeout(() => {
          modal.style.display = "none";
        }, 200);
        modalImg.src = "";
        document.body.style.overflow = "";
      });
    }

    // закрытие по фону
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("show");
        setTimeout(() => {
          modal.style.display = "none";
        }, 200);
        modalImg.src = "";
        document.body.style.overflow = "";
      }
    });

    // закрытие по ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.style.display === "flex") {
        modal.classList.remove("show");
        setTimeout(() => {
          modal.style.display = "none";
        }, 200);
        modalImg.src = "";
        document.body.style.overflow = "";
      }
    });
  }

  // ====== ОПТИМИЗАЦИЯ КАРТИНОК ======
  (function optimizeImages() {
    document.querySelectorAll("img:not(.logo)").forEach((img) => {
      if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
      if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
    });

    document.querySelectorAll(".categories .category-icon").forEach((img) => {
      img.setAttribute("width", "120");
      img.setAttribute("height", "120");
    });

    document.querySelectorAll(".subcategories .category-icon").forEach((img) => {
      img.setAttribute("width", "100");
      img.setAttribute("height", "100");
    });

    document.querySelectorAll(".product img").forEach((img) => {
      if (!img.hasAttribute("width")) img.setAttribute("width", "800");
      if (!img.hasAttribute("height")) img.setAttribute("height", "600");
    });

    document.querySelectorAll(".drip-gallery img").forEach((img) => {
      if (!img.hasAttribute("width")) img.setAttribute("width", "1200");
      if (!img.hasAttribute("height")) img.setAttribute("height", "800");
    });

    document.querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", () => {
        if (!img.dataset.fallback) {
          img.dataset.fallback = "1";
          img.src = "images/placeholder.png";
        }
      });
    });
  })();

  // ====== ПОДТЯНУТЬ ЦЕНЫ ======
  loadPrices();
});
