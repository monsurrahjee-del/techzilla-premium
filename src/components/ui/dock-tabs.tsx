"use client";

import { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface DockServiceItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  accentColor: string;
}

interface ServiceDockProps {
  items: DockServiceItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

function DockIcon({
  item,
  mouseX,
  isActive,
  onClick,
}: {
  item: DockServiceItem;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  isActive: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const sizeSync = useTransform(distance, [-150, 0, 150], [44, 68, 44]);
  const size = useSpring(sizeSync, { mass: 0.1, stiffness: 150, damping: 12 });

  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className="aspect-square cursor-pointer flex items-center justify-center relative group flex-shrink-0"
      whileTap={{ scale: 0.92 }}
    >
      <motion.div
        className="w-full h-full rounded-xl flex items-center justify-center relative overflow-hidden"
        style={{
          background: isActive
            ? `linear-gradient(135deg, ${item.accentColor}cc, ${item.accentColor}88)`
            : "rgba(255,255,255,0.08)",
          border: isActive
            ? `1.5px solid ${item.accentColor}99`
            : "1.5px solid rgba(255,255,255,0.12)",
          color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
          boxShadow: isActive ? `0 0 20px ${item.accentColor}44` : "none",
        }}
        animate={{
          y: isHovered ? -8 : 0,
          scale: isActive ? 1.05 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        {/* Icon */}
        <motion.div
          className="flex items-center justify-center"
          style={{ width: "55%", height: "55%" }}
          animate={{ scale: isHovered ? 1.12 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {item.icon}
        </motion.div>

        {/* Shine */}
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)",
          }}
          animate={{ opacity: isHovered ? 0.4 : 0.1 }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.8 }}
        animate={{
          opacity: isHovered ? 1 : 0,
          y: isHovered ? -12 : 10,
          scale: isHovered ? 1 : 0.8,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute -top-10 left-1/2 -translate-x-1/2 text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap pointer-events-none backdrop-blur-md"
        style={{
          background: "rgba(10,8,18,0.9)",
          border: `1px solid ${item.accentColor}44`,
          color: item.accentColor,
          fontFamily: "monospace",
          fontSize: "0.7rem",
        }}
      >
        {item.name}
      </motion.div>

      {/* Active dot */}
      <motion.div
        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full"
        style={{ background: item.accentColor }}
        animate={{
          width: isActive ? 6 : 4,
          height: isActive ? 6 : 4,
          opacity: isActive ? 1 : 0.4,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </motion.div>
  );
}

export function ServiceDock({ items, activeIndex, onSelect }: ServiceDockProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="flex items-end gap-3 rounded-2xl px-4 pb-3 pt-2"
      style={{
        background: "rgba(10, 8, 18, 0.65)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
    >
      {items.map((item, index) => (
        <DockIcon
          key={item.id}
          item={item}
          mouseX={mouseX}
          isActive={activeIndex === index}
          onClick={() => onSelect(index)}
        />
      ))}
    </motion.div>
  );
}
