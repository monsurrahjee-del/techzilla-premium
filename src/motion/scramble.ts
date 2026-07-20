const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}<>?/";

export function scrambleText(
  element: HTMLElement,
  finalText: string,
  duration = 1500
) {
  let frame = 0;

  const totalFrames = Math.max(20, duration / 16);

  const interval = setInterval(() => {
    const output = finalText
      .split("")
      .map((letter, index) => {
        if (letter === " ") return " ";

        if (index < frame) {
          return finalText[index];
        }

        return CHARS[Math.floor(Math.random() * CHARS.length)];
      })
      .join("");

    element.textContent = output;

    frame += 0.6;

    if (frame >= finalText.length) {
      clearInterval(interval);
      element.textContent = finalText;
    }
  }, 16);
}