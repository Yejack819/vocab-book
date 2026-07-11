const fs = require("fs");
let a = fs.readFileSync("src/utils/ai.ts", "utf-8");
// Fix line 43: remove 'const e = ' from catch
a = a.replace('catch(()=>{}\'\')', 'catch(()=>"")');
// Actually just look for the specific patterns
a = a.replace("catch(()=>''); }", "catch(()=>''); }"); // no change needed
// Find and fix 'catch(()=>{}\'\')' 
a = a.replace("catch(()=>'')", "catch(()=>'')"); // already fine
// The issue is 'e' declared in catch block - let me check
// Line 80: catch (err: any) has 'e' somewhere
// Actually let me just build and see
console.log(a.length);
fs.writeFileSync("src/utils/ai.ts", a, "utf-8");
