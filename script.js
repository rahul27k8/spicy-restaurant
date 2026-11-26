// Browser refresh starts at the clean homepage; section clicks remain native links.
const navigationEntry = window.performance?.getEntriesByType?.("navigation")[0];
if (navigationEntry?.type === "reload") {
  const previousRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";
  if (window.location.hash) {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }
  const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  resetScroll();
  window.addEventListener("load", () => {
    resetScroll();
    requestAnimationFrame(() => { window.history.scrollRestoration = previousRestoration; });
  }, { once: true });
}

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const compactViewport = window.matchMedia("(max-width: 760px) and (max-height: 480px)");
const connection = navigator.connection;

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      if (!motionPreference.matches) {
        entry.target.classList.add("reveal-in");
        entry.target.addEventListener("animationend", () => {
          entry.target.classList.remove("reveal-in");
        }, { once: true });
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(
    ".story-grid, .section-head, .dish, .menu-group, .review, .visit-intro"
  ).forEach((element) => revealObserver.observe(element));
}

const categoryLinks = [...document.querySelectorAll(".menu-nav a")];
const menuSections = categoryLinks.map((link) =>
  document.getElementById(link.hash.slice(1))
);
const menuNav = document.querySelector(".menu-nav");
const plating = document.querySelector(".plating-hero");
const platingContent = plating?.querySelector(".plating-sticky");
const foodLayers = [...(plating?.querySelectorAll(".food-layer") ?? [])].map((element) => ({
  element,
  start: Number(element.dataset.start),
  end: Number(element.dataset.end),
  opacity: -1
}));
const ingredientSteps = [...(plating?.querySelectorAll(".plating-steps li") ?? [])];
let pageFrame;
let needsMeasure = true;
let animated = false;
let heroTop = 0;
let heroDistance = 1;
let categoryMarker = 0;
let sectionTops = [];
let lastProgress = -1;
let lastCategory = -1;
let lastIngredient = -1;

const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};

// Layout is measured on size changes, never in the scroll animation loop.
function measurePage() {
  animated = !motionPreference.matches && !compactViewport.matches && !connection?.saveData;
  plating?.classList.toggle("plating-motion", animated);
  // A pinned scene must fit in the visible screen, including enlarged text.
  if (animated && platingContent && platingContent.getBoundingClientRect().height > window.innerHeight + 2) {
    animated = false;
    plating.classList.remove("plating-motion");
  }
  const scrollY = window.scrollY;
  heroTop = plating ? plating.getBoundingClientRect().top + scrollY : 0;
  heroDistance = plating ? Math.max(1, plating.offsetHeight - window.innerHeight) : 1;
  categoryMarker = (menuNav?.offsetHeight ?? 0) + 32;
  sectionTops = menuSections.map((section) =>
    section.getBoundingClientRect().top + scrollY
  );
  lastProgress = -1;
  needsMeasure = false;
}

function updateCategory(scrollY) {
  let current = 0;
  sectionTops.forEach((top, index) => {
    if (top <= scrollY + categoryMarker) current = index;
  });
  if (current === lastCategory) return;
  lastCategory = current;
  categoryLinks.forEach((link, index) => {
    if (index === current) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });

  // Follow the active tab horizontally without scrolling the page or moving focus.
  const activeLink = categoryLinks[current];
  if (menuNav && activeLink && menuNav.scrollWidth > menuNav.clientWidth) {
    const left = activeLink.offsetLeft;
    const right = left + activeLink.offsetWidth;
    if (left < menuNav.scrollLeft) menuNav.scrollLeft = left;
    else if (right > menuNav.scrollLeft + menuNav.clientWidth) {
      menuNav.scrollLeft = right - menuNav.clientWidth;
    }
  }
}

function updatePlating(scrollY) {
  if (!plating) return;
  const progress = animated ? clamp((scrollY - heroTop) / heroDistance) : 1;
  if (progress === lastProgress) return;
  lastProgress = progress;

  foodLayers.forEach((layer) => {
    const local = clamp((progress - layer.start) / (layer.end - layer.start));
    const opacity = smooth(local);
    if (opacity === layer.opacity) return;
    layer.opacity = opacity;
    layer.element.style.setProperty("--food-opacity", opacity);
    layer.element.style.setProperty("--food-y", (1 - opacity) * -22 + "px");
  });

  const index = foodLayers.findIndex((layer) => progress < layer.end);
  const current = index === -1 ? foodLayers.length - 1 : index;
  if (current !== lastIngredient) {
    lastIngredient = current;
    ingredientSteps.forEach((step, stepIndex) => {
      if (stepIndex === current) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  }
}

function updatePage() {
  pageFrame = undefined;
  if (needsMeasure) measurePage();
  const scrollY = window.scrollY;
  updateCategory(scrollY);
  updatePlating(scrollY);
}

function schedulePageUpdate() {
  if (pageFrame !== undefined) return;
  pageFrame = requestAnimationFrame(updatePage);
}

function refreshLayout() {
  needsMeasure = true;
  schedulePageUpdate();
}

window.addEventListener("scroll", schedulePageUpdate, { passive: true });
window.addEventListener("resize", refreshLayout);
window.addEventListener("load", refreshLayout);
motionPreference.addEventListener("change", refreshLayout);
compactViewport.addEventListener("change", refreshLayout);
connection?.addEventListener("change", refreshLayout);
document.fonts?.ready.then(refreshLayout);
if ("ResizeObserver" in window) {
  new ResizeObserver(refreshLayout).observe(document.body);
}
updatePage();
