export {};

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  external: [
    "zod",
    "react-hot-toast",
    "zod-error",
    "next",
    "react",
    "typescript",
  ],
});
