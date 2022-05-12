const fs = require('fs');

const RM_DIRS = [
    './.parcel-cache',
    './dist'
];

RM_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
    }
});
