export {};

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  minify: true,
  splitting: true,
  external: [
    "zod",
    "react-hot-toast",
    "zod-error",
    "next",
    "react",
    "typescript",
  ],
});
