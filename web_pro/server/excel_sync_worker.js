import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const args = process.argv.slice(2);
if (!args[0]) {
  console.log('[Excel Worker] No row payload provided.');
  process.exit(0);
}

try {
  const rowValues = JSON.parse(args[0]);
  const candidates = [
    path.resolve(process.cwd(), '../EV_Dataset_2025_15000_Cars_Final_180K_Realistic.xlsx'),
    path.resolve(process.cwd(), './EV_Dataset_2025_15000_Cars_Final_180K_Realistic.xlsx'),
    'C:/Users/dhine/OneDrive/Documents/EV Cars vehicles/volttrack-db/EV_Dataset_2025_15000_Cars_Final_180K_Realistic.xlsx'
  ];

  const targetPath = candidates.find(c => fs.existsSync(c));
  if (!targetPath) {
    console.warn('[Excel Worker] Target Excel file not found. Skipping.');
    process.exit(0);
  }

  console.log(`[Excel Worker] Syncing new row for Driver ${rowValues[11]} (${rowValues[12]}) to ${targetPath}...`);
  const wb = XLSX.readFile(targetPath, { dense: true });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  XLSX.utils.sheet_add_aoa(sheet, [rowValues], { origin: -1 });
  XLSX.writeFile(wb, targetPath);
  console.log(`[Excel Worker Success] Appended row for ${rowValues[11]} (${rowValues[12]}) successfully.`);
} catch (err) {
  console.error('[Excel Worker Error]:', err.message);
  process.exit(1);
}
