import { useEffect } from "react";

/**
 * useScrollReveal hook
 * 
 * Automatically initializes an IntersectionObserver to reveal elements with the
 * .reveal-on-scroll class and their .stagger-child children when they enter the viewport.
 */
export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-premium-fade-in");
            entry.target.classList.remove("opacity-0");

            const staggers = entry.target.querySelectorAll(".stagger-child");
            staggers.forEach((child, i) => {
              setTimeout(() => {
                child.classList.add("animate-premium-fade-in");
                child.classList.remove("opacity-0");
              }, i * 120);
            });

            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
