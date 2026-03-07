// src/components/Sidebar.tsx
"use client";

import { Mode } from "@/lib/types";
import {
  BookOpen,
  Brain,
  Stethoscope,
  Library,
  FileText,
  X,
} from "lucide-react";

interface SidebarProps {
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
  isOpen: boolean;
  onClose: () => void;
}

const learningItems: { mode: Mode; icon: typeof BookOpen; label: string }[] = [
  { mode: "tutor", icon: BookOpen, label: "Tutor Mode" },
  { mode: "quiz", icon: Brain, label: "Quiz Mode" },
  { mode: "scenario", icon: Stethoscope, label: "Clinical Scenarios" },
  { mode: "reference", icon: Library, label: "Reference Library" },
];

const resourceItems: { mode: Mode; icon: typeof FileText; label: string }[] = [
  { mode: "guidelines", icon: FileText, label: "Guidelines" },
];

const NavItem = ({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof BookOpen;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
      ${
        active
          ? "bg-sidebar-accent text-sidebar-text-active font-semibold"
          : "text-sidebar-text hover:bg-sidebar-text/5 hover:text-sidebar-text-active"
      }
    `}
  >
    <Icon className="w-4 h-4 shrink-0" />
    <span>{label}</span>
  </button>
);

const Sidebar = ({ activeMode, onModeChange, isOpen, onClose }: SidebarProps) => {
  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-40 w-56 flex flex-col
        bg-sidebar-bg text-sidebar-text transition-transform duration-200
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
    >
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        <img
          src="/EchoTutor_logo.png"
          alt="EchoTutor"
          className="w-28 mx-auto"
        />
        <button
          onClick={onClose}
          className="lg:hidden p-1 hover:text-sidebar-text-active"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-sidebar-text/60 px-3 mb-2">
          Learning Modes
        </p>
        {learningItems.map((item) => (
          <NavItem
            key={item.mode}
            {...item}
            active={activeMode === item.mode}
            onClick={() => onModeChange(item.mode)}
          />
        ))}

        <div className="my-3 border-t border-sidebar-text/10" />

        <p className="text-[11px] uppercase tracking-wider text-sidebar-text/60 px-3 mb-2">
          Resources
        </p>
        {resourceItems.map((item) => (
          <NavItem
            key={item.mode}
            {...item}
            active={activeMode === item.mode}
            onClick={() => onModeChange(item.mode)}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 text-[11px] text-sidebar-text/50 text-center">
        Educational use only · ASE/SCA Guidelines
      </div>
    </aside>
  );
};

export default Sidebar;
