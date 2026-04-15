import { useEffect, useState } from "react";

export function useTypingLoop(lines: string[], speed = 40, pause = 2200) {
  const [display, setDisplay] = useState<string[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let lineIdx = 0;
    let charIdx = 0;
    let currentLines: string[] = [];
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (lineIdx >= lines.length) {
        // restart loop
        setTimeout(() => {
          lineIdx = 0;
          charIdx = 0;
          currentLines = [];
          setDisplay([]);
          timeout = setTimeout(tick, 400);
        }, pause);
        return;
      }

      if (charIdx <= lines[lineIdx].length) {
        const partial = lines[lineIdx].slice(0, charIdx);
        setDisplay([...currentLines, partial]);
        charIdx++;
        timeout = setTimeout(tick, speed + Math.random() * 30);
      } else {
        currentLines = [...currentLines, lines[lineIdx]];
        setDisplay([...currentLines]);
        lineIdx++;
        charIdx = 0;
        timeout = setTimeout(tick, 300);
      }
    };

    timeout = setTimeout(tick, 600);

    // cursor blink
    const cursorInterval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);

    return () => {
      clearTimeout(timeout);
      clearInterval(cursorInterval);
    };
  }, [lines, speed, pause]);

  return { display, cursorVisible };
}
