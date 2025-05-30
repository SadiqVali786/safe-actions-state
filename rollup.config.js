import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import terser from "@rollup/plugin-terser";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
const packageJson = require("./package.json");

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: packageJson.main,
        format: "cjs",
        sourcemap: false,
      },
      {
        file: packageJson.module,
        format: "esm",
        sourcemap: false,
        compact: true, // Minify output
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve(),
      commonjs(),
      typescript({ tsconfig: "./tsconfig.json" }),
      terser({ format: { comments: false } }), // Remove comments
    ],
    treeshake: true, // Remove unused code
    external: [
      "zod",
      "react-hot-toast",
      "zod-error",
      "next",
      "react",
      "@types/react",
      "typescript",
    ],
  },
  {
    input: "src/index.ts",
    output: [{ file: packageJson.types }],
    plugins: [dts.default()],
  },
];
