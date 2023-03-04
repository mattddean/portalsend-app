Just started hacking a bit with tRPC and Next 13.

This is not anywhere closed to the finished design and just a playground for our own exploration.

## Overview

- `/@trpc/*` represent an imaginary trpc lib for Next 13
- Feel free to add whatever you want to get a feel of Next 13 + tRPC combo
- Deployed at [rsc.trpc.io](https://rsc.trpc.io/)

See the [Issues](https://github.com/trpc/next-13/issues) for things we want to hack on

## TODO

- Migrate routes to app directory
- Cloudflare pages deployment
  - Use edge runtime everywhere
- Caching on pages and routes, understand revalidate etc.
  - Mimic stale-while-revalidate
- Hide Profile in footer when user is not logged in
- Metadata
- Add more links to homepage
- More server components and fewer client-side requests
- Figure out why polyfills are being served to chrome
