interface SiteConfig {
  name: string;
  description: string;
  links: {
    twitter: string;
    github: string;
  };
}

export const siteConfig: SiteConfig = {
  name: "Portalsend",
  description: "Dead simple end-to-end encrypted file sharing for everyone.",
  links: {
    twitter: "https://twitter.com/matt_d_dean",
    github: "https://github.com/mattddean",
  },
};
