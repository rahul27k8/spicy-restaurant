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
  categoryFrame = requestAnimationFrame(updateCategory);
}

window.addEventListener("scroll", scheduleCategoryUpdate, { passive: true });
window.addEventListener("resize", scheduleCategoryUpdate);
updateCategory();
