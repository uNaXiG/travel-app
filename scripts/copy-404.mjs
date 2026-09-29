import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDirectory = resolve('auth', 'dist');
copyFileSync(resolve(distDirectory, 'index.html'), resolve(distDirectory, '404.html'));