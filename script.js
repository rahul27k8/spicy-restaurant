const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const compactViewport = window.matchMedia("(max-height: 560px)");

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
const plating = document.querySelector(".plating-hero");
const foodLayers = [...plating.querySelectorAll(".food-layer")];
const ingredientSteps = [...plating.querySelectorAll(".plating-steps li")];
let pageFrame;

const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};

function updateCategory() {
  const marker = document.querySelector(".menu-nav").getBoundingClientRect().bottom + 32;
  let currentSection = menuSections[0];

  menuSections.forEach((section) => {
    if (section.getBoundingClientRect().top <= marker) currentSection = section;
  });

  categoryLinks.forEach((link) => {
    if (link.hash === "#" + currentSection.id) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function updatePlating() {
  const animated = !motionPreference.matches && !compactViewport.matches;
  plating.classList.toggle("plating-motion", animated);
  const distance = Math.max(1, plating.offsetHeight - window.innerHeight);
  const progress = animated ? clamp(-plating.getBoundingClientRect().top / distance) : 1;

  foodLayers.forEach((layer, index) => {
    const start = Number(layer.dataset.start);
    const end = Number(layer.dataset.end);
    const local = smooth((progress - start) / (end - start));
    layer.style.setProperty("--food-opacity", clamp(local * 4));
    layer.style.setProperty("--food-drop", (1 - local) * -90 + "px");
    layer.style.setProperty("--food-turn", (1 - local) * (index % 2 ? 6 : -6) + "deg");
  });

  plating.style.setProperty("--plate-turn", -4 + progress * 4 + "deg");
  plating.style.setProperty("--finished-opacity", smooth((progress - .92) / .08));
  const currentStep = Math.min(ingredientSteps.length - 1, Math.floor(progress * ingredientSteps.length));
  ingredientSteps.forEach((step, index) => {
    if (index === currentStep) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  });
}

function updatePage() {
  pageFrame = undefined;
  updateCategory();
  updatePlating();
}

function schedulePageUpdate() {
  if (pageFrame !== undefined) return;
  pageFrame = requestAnimationFrame(updatePage);
}

window.addEventListener("scroll", schedulePageUpdate, { passive: true });
window.addEventListener("resize", schedulePageUpdate);
motionPreference.addEventListener("change", schedulePageUpdate);
compactViewport.addEventListener("change", schedulePageUpdate);
updatePage();
