const revealItems = document.querySelectorAll(".reveal");
const leadForm = document.querySelector(".lead-form");
const stickyCta = document.querySelector(".sticky-cta");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

leadForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const button = leadForm.querySelector("button");
  const originalLabel = button.textContent;
  button.textContent = "Request Captured";
  button.disabled = true;

  window.setTimeout(() => {
    button.textContent = originalLabel;
    button.disabled = false;
  }, 1800);
});

window.addEventListener(
  "scroll",
  () => {
    if (!stickyCta) return;
    stickyCta.style.opacity = window.scrollY > 40 ? "1" : "0.96";
  },
  { passive: true }
);
