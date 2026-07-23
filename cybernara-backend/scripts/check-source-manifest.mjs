import { access, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const manifest = [
  "CCPA_Controls.xlsx",
  "CMMI_Controls.xlsx",
  "DPDP_Controls.xlsx",
  "E8_Controls.xlsx",
  "GDPR_Controls.xlsx",
  "HIPAA_Controls.xlsx",
  "HITRUST_Controls.xlsx",
  "ISO_9001_Controls.xlsx",
  "ISO_27001_Controls.xlsx",
  "NIST_SP800_Controls.xlsx",
  "PCI_DSS_Controls.xlsx",
  "PDPL_Controls.xlsx",
  "SOC2_Controls.xlsx",
  "DPDP_SOC2_PDPL_E8_HIPAA_GDPR_CCPA_Control_Harmonization.xlsx",
  "PCI-DSS_NIST-SP-800-53_ISO-27001_ISO-9001-CMMI_HITRUST_Control_Harmonization.xlsx"
];

const missing = [];
const present = [];

for (const file of manifest) {
  const fullPath = path.join("sources", file);
  try {
    await access(fullPath);
    const info = await stat(fullPath);
    const sha256 = createHash("sha256").update(readFileSync(fullPath)).digest("hex");
    present.push({ file, bytes: info.size, sha256 });
  } catch {
    missing.push(file);
  }
}

if (missing.length > 0) {
  console.error(`Missing required source workbook(s): ${missing.join(", ")}`);
  process.exit(1);
}

console.log(JSON.stringify({ workbookCount: present.length, present }, null, 2));

