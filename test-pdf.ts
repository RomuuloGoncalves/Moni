import { PDFParse } from "pdf-parse";
import fs from "fs";
import { execSync } from "child_process";
execSync("npx -y pdf-creator-node test.pdf 'Hello'");
async function test() {
  try {
    const buffer = fs.readFileSync("test.pdf");
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    console.log("SUCCESS:", data.text.trim());
  } catch (err) {
    console.error("FAIL:", err);
  }
}
test();
