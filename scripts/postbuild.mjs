/**
 * Po sestavení: GitHub Pages neumí přesměrovat hluboké adresy na index,
 * takže mu podstrčíme kopii jako 404.html. Přímé otevření /admin pak
 * funguje i při první návštěvě, než se nainstaluje service worker.
 * `.nojekyll` zabrání tomu, aby Pages ignorovaly soubory začínající podtržítkem.
 */
import { copyFile, writeFile } from 'node:fs/promises'

await copyFile('dist/index.html', 'dist/404.html')
await writeFile('dist/.nojekyll', '')
console.log('postbuild: 404.html a .nojekyll hotovo')
