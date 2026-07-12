const fs = require("fs");
let ie = fs.readFileSync("src/components/ImportExport.tsx", "utf-8");

// Fix the progress bar - width values need % sign
ie = ie.replace(
  "width:'100',height:8,background:'var(--border)'",
  "width:'100%',height:8,background:'var(--border)'"
);
ie = ie.replace(
  "width:'{(storageTotal / (5*1024*1024) * 100)}%',height:'100%'",
  "width:' + (storageTotal / (5*1024*1024) * 100) + '%',height:'100%'"
);

fs.writeFileSync("src/components/ImportExport.tsx", ie, "utf-8");
console.log("fixed");
