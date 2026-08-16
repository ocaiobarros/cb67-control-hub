import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

type LinkProps = ComponentProps<typeof Link>;

/**
 * Router link that accepts a plain string path.
 * Navigation targets come from the runtime navigation model and mock data, so
 * the literal-union route typing is relaxed in exactly one place.
 */
export function AppLink({ to, ...rest }: Omit<LinkProps, "to"> & { to: string }) {
  return <Link to={to as never} {...rest} />;
}
