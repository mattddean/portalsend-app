export interface NavItem {
  title: string;
  href?: "/files/sent" | "/files/received";
  disabled?: boolean;
  external?: boolean;
  label?: string;
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[];
}

export type MainNavItem = NavItem;

export type SidebarNavItem = NavItemWithChildren;

interface DocsConfig {
  sidebarNav: SidebarNavItem[];
}

export const docsConfig: DocsConfig = {
  sidebarNav: [
    {
      title: "Files",
      items: [
        {
          title: "Sent Files",
          href: "/files/sent",
          items: [],
        },
        {
          title: "Received Files",
          href: "/files/received",
          items: [],
        },
      ],
    },
  ],
};
