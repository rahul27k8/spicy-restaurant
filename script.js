const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const compactViewport = window.matchMedia("(max-height: 560px)");
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
const plateCanvas = plating.querySelector(".plate-canvas");
const plateImage = plating.querySelector(".plate-finished");
const foodLayers = [...plating.querySelectorAll(".food-layer")].map((element) => ({
  element,
  start: Number(element.dataset.start),
  end: Number(element.dataset.end),
  x: Number(element.dataset.x) / 100,
  y: Number(element.dataset.y) / 100,
  opacity: -1
}));
const ingredientSteps = [...plating.querySelectorAll(".plating-steps li")];
const bitePositions = ["20% 75%", "20% 25%", "50% 22%", "70% 70%", "80% 25%"];
let pageFrame;
let needsMeasure = true;
let animated = false;
let heroTop = 0;
let heroDistance = 1;
let plateWidth = 0;
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
  plating.classList.toggle("plating-motion", animated);
  const scrollY = window.scrollY;
  heroTop = plating.getBoundingClientRect().top + scrollY;
  heroDistance = Math.max(1, plating.offsetHeight - window.innerHeight);
  plateWidth = plateCanvas.clientWidth;
  categoryMarker = menuNav.offsetHeight + 32;
  sectionTops = menuSections.map((section) =>
    section.getBoundingClientRect().top + scrollY
  );
  plating.style.setProperty("--bite-image", "url(" + JSON.stringify(plateImage.currentSrc || plateImage.src) + ")");
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
}

function updatePlating(scrollY) {
  const progress = animated ? clamp((scrollY - heroTop) / heroDistance) : 1;
  if (progress === lastProgress) return;
  lastProgress = progress;

  foodLayers.forEach((layer) => {
    const local = clamp((progress - layer.start) / (layer.end - layer.start));
    const opacity = smooth((local - .48) / .25);
    if (opacity === layer.opacity) return;
    layer.opacity = opacity;
    layer.element.style.setProperty("--food-opacity", opacity);
  });

  const index = foodLayers.findIndex((layer) => progress < layer.end);
  const current = index === -1 ? foodLayers.length - 1 : index;
  const layer = foodLayers[current];
  const local = clamp((progress - layer.start) / (layer.end - layer.start));
  const approach = smooth(local / .38);
  const tip = smooth((local - .38) / .25);
  const retreat = smooth((local - .68) / .32);
  const travel = 1 - approach + retreat;
  const opacity = animated && progress >= layer.start && index !== -1
    ? clamp(local / .08) * (1 - smooth((local - .9) / .1))
    : 0;

  plating.style.setProperty("--tool-x", (layer.x + travel * .44) * plateWidth + "px");
  plating.style.setProperty("--tool-y", (layer.y - travel * .38) * plateWidth + "px");
  plating.style.setProperty("--tool-angle", -12 + tip * 34 - retreat * 22 + "deg");
  plating.style.setProperty("--tool-opacity", opacity);
  plating.style.setProperty("--bite-opacity", 1 - smooth((local - .42) / .3));
  plating.style.setProperty("--bite-scale", 1 - tip * .18);
  plating.style.setProperty("--finished-opacity", smooth((progress - .94) / .06));

  if (current !== lastIngredient) {
    lastIngredient = current;
    plating.style.setProperty("--bite-position", bitePositions[current]);
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
