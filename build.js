import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcHtmlPath = path.resolve(__dirname, 'src/index.html');
const cssPath = path.resolve(__dirname, 'dist/style.css');
const jsPath = path.resolve(__dirname, 'dist/main.js');
const distHtmlPath = path.resolve(__dirname, 'index.html'); // ルートに出力

try {
  console.log('Building single HTML file...');

  // 各ファイルの読み込み
  let html = fs.readFileSync(srcHtmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  // 1. 開発用の Tailwind CSS CDN スクリプトと設定の削除
  // <script src="https://cdn.tailwindcss.com"></script> とそれに続く <script>tailwind.config = ...</script> を削除
  const tailwindCdnRegex = /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*<script>\s*tailwind\.config =[\s\S]*?<\/script>/;
  html = html.replace(tailwindCdnRegex, '');

  // 2. 開発用のローカルCSSリンクの削除
  const cssLinkRegex = /<link rel="stylesheet" href="\/src\/style\.css">/;
  html = html.replace(cssLinkRegex, '');

  // 3. ミニファイされた本番用 CSS の埋め込み (headの末尾)
  const headEndIndex = html.indexOf('</head>');
  if (headEndIndex !== -1) {
    const cssStyleTag = `\n  <style>\n${css}\n  </style>\n`;
    html = html.slice(0, headEndIndex) + cssStyleTag + html.slice(headEndIndex);
  }

  // 4. 開発用の main.ts エントリーポイントの削除と本番用 CDN & JS の埋め込み
  const devScriptTag = /<script type="module" src="\/src\/main\.ts"><\/script>/;
  const productionScripts = `
  <!-- Vue 3 CDN (Global Build) -->
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <!-- Application JS Bundle -->
  <script>
${js}
  </script>
`;
  html = html.replace(devScriptTag, () => productionScripts);

  // 5. 成果物の書き出し
  fs.writeFileSync(distHtmlPath, html, 'utf8');
  console.log(`Successfully built standalone HTML: ${distHtmlPath}`);

} catch (error) {
  console.error('Failed to bundle standalone HTML file:', error);
  process.exit(1);
}
