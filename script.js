// Bunk Bed World — interactions

// Reveal on scroll
const revealItems = document.querySelectorAll(".reveal");
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

// Mobile menu toggle
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
burger?.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks?.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

// Category card -> prefill contact form interest + scroll
function selectInterest(value) {
  const sel = document.querySelector("select[name=interest]");
  if (sel) {
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].text === value) { sel.selectedIndex = i; break; }
    }
  }
  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
}

// Lead form (placeholder — wire to email/CRM later)
const leadForm = document.querySelector(".lead-form");
leadForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = leadForm.querySelector("button");
  const originalLabel = button.textContent;
  button.textContent = "Request Captured ✓";
  button.disabled = true;
  window.setTimeout(() => {
    button.textContent = originalLabel;
    button.disabled = false;
    leadForm.reset();
  }, 2000);
});

// Sticky CTA subtle fade
const stickyCta = document.querySelector(".sticky-cta");
window.addEventListener(
  "scroll",
  () => {
    if (!stickyCta) return;
    stickyCta.style.opacity = window.scrollY > 40 ? "1" : "0.96";
  },
  { passive: true }
);
