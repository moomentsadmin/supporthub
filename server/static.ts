import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production build, the Vite outDir is dist/public
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  if (!fs.existsSync(distPath)) {
    console.warn(`Build directory not found at ${distPath}, trying alternative path...`);
    
    // Try alternative path (same level as server files)
    const altPath = path.resolve(import.meta.dirname, "public");
    if (fs.existsSync(altPath)) {
      console.log(`Using alternative static path: ${altPath}`);
      app.use(express.static(altPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(altPath, "index.html"));
      });
      return;
    }
    
    throw new Error(
      `Could not find the build directory at ${distPath} or ${altPath}. Make sure to build the client first with: npm run build`,
    );
  }

  console.log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA routing)
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
