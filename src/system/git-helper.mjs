import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

export async function ExecCommand(swotFolderPath, command) {
    try {
        const { stdout, stderr } = await execPromise(command, { cwd: swotFolderPath });

        if (stdout) {
            console.error(stdout);
        }

        if (stderr) {
            console.error(stderr);
        }
    } catch (error) {
        console.error('Execution error:', error.message);
    }
}