const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

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
    ".section-head, .dish, .menu-group, .review, .visit-intro"
  ).forEach((element) => revealObserver.observe(element));
}

const categoryLinks = [...document.querySelectorAll(".menu-nav a")];
const menuSections = categoryLinks.map((link) =>
  document.getElementById(link.hash.slice(1))
);
let categoryFrame;

function updateCategory() {
  categoryFrame = undefined;
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

function scheduleCategoryUpdate() {
  if (categoryFrame !== undefined) return;
  categoryFrame = requestAnimationFrame(() => {
    updateCategory();
    updateServing();
  });
}

window.addEventListener("scroll", scheduleCategoryUpdate, { passive: true });
window.addEventListener("resize", scheduleCategoryUpdate);
const serving = document.querySelector(".serving");
const servingStage = serving.querySelector(".serving-stage");
const servingSteps = [...serving.querySelectorAll(".serving-step")];
const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};

function updateServing() {
  const animated = !motionPreference.matches;
  serving.classList.toggle("serving-enabled", animated);

  const rect = serving.getBoundingClientRect();
  const travel = Math.max(1, serving.offsetHeight - window.innerHeight);
  const progress = animated ? clamp(-rect.top / travel) : 1;
  const arrival = smooth(progress / .28);
  const delivery = smooth((progress - .28) / .4);
  const departure = smooth((progress - .66) / .22);
  const sides = smooth((progress - .72) / .28);
  const width = servingStage.clientWidth;
  const height = servingStage.clientHeight;
  const arrivalX = (arrival - 1) * width * .7;

  serving.style.setProperty("--serve-progress", progress);
  serving.style.setProperty("--plate-size", Math.min(width * .6, height * .58) + "px");
  serving.style.setProperty("--waiter-x", arrivalX - departure * width * .65 + "px");
  serving.style.setProperty("--waiter-opacity", (1 - departure) * Math.min(1, arrival * 4));
  serving.style.setProperty("--plate-x", arrivalX * (1 - delivery) + "px");
  serving.style.setProperty("--plate-y", 42 + delivery * 30 + "%");
  serving.style.setProperty("--plate-scale", .46 + delivery * .54);
  serving.style.setProperty("--plate-angle", 55 * (1 - delivery) + "deg");
  serving.style.setProperty("--table-opacity", smooth((progress - .3) / .3));
  serving.style.setProperty("--sides-opacity", sides);
  serving.style.setProperty("--sides-x", (1 - sides) * width * .12 + "px");
  serving.style.setProperty("--side-tilt", (1 - sides) * -12 + "deg");

  const activeStep = progress < .3 ? 0 : progress < .73 ? 1 : 2;
  servingSteps.forEach((step, index) => {
    step.classList.toggle("is-current", index === activeStep);
    step.setAttribute("aria-hidden", index !== activeStep);
  });
}

motionPreference.addEventListener("change", scheduleCategoryUpdate);
updateCategory();
updateServing();
