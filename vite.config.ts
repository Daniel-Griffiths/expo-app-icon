import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["plugin/src/**/*.test.ts"],
    exclude: ["node_modules", "build", "plugin/build"],
  },
});
