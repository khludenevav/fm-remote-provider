const fs = require('fs');
const path = require('path');

function check(cwd, excludes) {
    console.log(`cwd: ${cwd}`);
    console.log(`excludes: ${excludes}`);
    let fileHasIncorrectName = false;
    checkInternal(cwd);
    if (fileHasIncorrectName)
        throw new Error('Some file has incorrect name');

    function checkInternal(dirPath) {
        fs.readdirSync(dirPath).map(fileName => {
            const currFile = path.posix.join(dirPath, fileName);
            if(excludes.some(p => p == currFile))
                return;

            if (fs.lstatSync(currFile).isDirectory()) {
                if (!/node_modules/.test(currFile) && !/_generated/.test(currFile) && !/\.git/.test(currFile)) {
                    checkInternal(currFile);
                }
            }
            else
                checkFileName(fileName, currFile);
        });
    }
    function checkFileName(fileName, fullFilePath) {
        const result = [];
        let ind = 0;
        for (let c of fileName) {
            if (isUpperCase(c) && /[^\d._-]/.test(c))
                result.push(ind);
            ind++;
        }
        if (result.length) {
            fileHasIncorrectName = true;
            console.log(`Possible error inside ${fullFilePath} [${result.join(', ')}]`);
        }
    }
}

function isUpperCase(str) {
    return str[0].toUpperCase() == str[0];
}

if (module.parent == null) {
    const cwd = path.posix.join(process.cwd(), process.argv[2] ? process.argv[2] : "").replace(/\\/g, "\/");
    const excludes = (process.argv.length > 2 ? process.argv.slice(3) : []).map(p => path.posix.join(process.cwd(), p).replace(/\\/g, "\/"));
    check(cwd, excludes);
}

module.exports = check;