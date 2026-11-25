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
    ".hero-copy, .hero-photo, .section-head, .dish, .menu-group, .review, .visit-intro"
  ).forEach((element) => revealObserver.observe(element));
}
