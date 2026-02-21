import type { FC } from "react";
import logo from "@/assets/logo.svg";
import type { Size } from "@/type";
import "@styles/Logo.css";

export type LogoProps = {
  size: Size;
  paddingValue: Size;
};

export const Logo: FC<LogoProps> = ({ size, paddingValue }) => {
  const height = size === "small" ? "3em" : size === "medium" ? "6em" : "12em";
  const pdd =
    paddingValue === "small"
      ? "1em"
      : paddingValue === "medium"
        ? "1.5em"
        : "3em";

  return (
    <img
      src={logo}
      className="logo"
      style={{ height, padding: pdd }}
      alt="Logo"
    />
  );
};
