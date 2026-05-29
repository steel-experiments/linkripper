// ABOUTME: Minimal type declaration for turndown-plugin-gfm, which ships no types.
// ABOUTME: Declares the gfm plugin as a Turndown plugin function.
declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  export const gfm: TurndownService.Plugin;
  export const tables: TurndownService.Plugin;
  export const strikethrough: TurndownService.Plugin;
  export const taskListItems: TurndownService.Plugin;
}
