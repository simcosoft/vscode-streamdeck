import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const pluginUuid = "com.nicollasr.streamdeckvsc.mac";
const sourceDir = `${pluginUuid}.sdPlugin`;
const outputDir = path.join("build", `${pluginUuid}.sdPlugin`);

/** Copies the static plugin assets (manifest, images, property inspectors) into the build output. */
function copyPluginAssets() {
  return {
    name: "copy-plugin-assets",
    writeBundle() {
      mkdirSync(outputDir, { recursive: true });
      for (const asset of ["manifest.json", "Images", "PropertyInspector", "settings.ini"]) {
        const from = path.join(sourceDir, asset);
        if (existsSync(from)) {
          cpSync(from, path.join(outputDir, asset), { recursive: true });
        }
      }
    }
  };
}

export default {
  input: "src/plugin.ts",
  output: {
    file: `${outputDir}/bin/plugin.js`,
    format: "cjs",
    sourcemap: true
  },
  // Optional native accelerators of `ws` — absent in the bundle by design.
  external: ["bufferutil", "utf-8-validate"],
  plugins: [
    resolve({ browser: false, preferBuiltins: true }),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" }),
    copyPluginAssets()
  ]
};
