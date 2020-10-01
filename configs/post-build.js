const fs = require("fs");
const path = require("path");

// package.json
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageJsonSource = fs.readFileSync(packageJsonPath).toString('utf-8');
const packageJsonObj = JSON.parse(packageJsonSource);
packageJsonObj.scripts = {};
delete packageJsonObj.devDependencies;
delete packageJsonObj.husky;
delete packageJsonObj.private;
fs.writeFileSync(packageJsonPath, Buffer.from(JSON.stringify(packageJsonObj, null, 2), "utf-8"));
