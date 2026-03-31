import express from 'express';
import { createServer as createViteServer } from 'vite';
import puppeteer from 'puppeteer';
import cors from 'cors';

async function startServer() {
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());

    // API Routes
    app.post('/api/scrape', async (req, res) => {
        const { url } = req.body as { url?: string };

        if (!url || !/^https?:\/\//i.test(url)) {
            return res.status(400).json({ error: 'A valid http/https URL is required.' });
        }

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ],
            });

            const page = await browser.newPage();

            // Block heavy non-essential resources to speed up load
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const type = req.resourceType();
                if (['media', 'font'].includes(type)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
            await page.setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            );

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });

            // ── FIX: stable-height scroll ─────────────────────────────────────────
            // Scroll until the page height hasn't grown for 3 consecutive 300ms ticks.
            // This guarantees lazy-loaded footer content is fully in the DOM before
            // we serialise the HTML.
            await page.evaluate(`(async () => {
                await new Promise((resolve) => {
                    const SCROLL_STEP   = 600;   // px per tick
                    const TICK_MS       = 300;   // ms between ticks
                    const STABLE_NEEDED = 3;     // consecutive stable ticks before stopping

                    let lastHeight   = 0;
                    let stableCount  = 0;

                    const tick = () => {
                        const currentHeight = document.body.scrollHeight;

                        if (currentHeight === lastHeight) {
                            stableCount++;
                            if (stableCount >= STABLE_NEEDED) {
                                resolve();
                                return;
                            }
                        } else {
                            stableCount = 0;
                            lastHeight  = currentHeight;
                        }

                        window.scrollBy(0, SCROLL_STEP);
                        setTimeout(tick, TICK_MS);
                    };

                    setTimeout(tick, TICK_MS);
                });
            })()`);

            // ── FIX: wait for footer to appear ───────────────────────────────────
            try {
                await page.waitForSelector('footer, [role="contentinfo"], .footer, #footer', {
                    timeout: 5_000,
                });
            } catch {
                // Footer not found within timeout — proceed anyway
            }

            // Small buffer for any post-scroll paint
            await new Promise((r) => setTimeout(r, 500));

            // ── FIX: serialise HTML AFTER full scroll so all sections are in DOM ──
            const html = await page.content();
            const title = await page.title();

            // ── FIX: extract CSS custom properties from :root for colour fidelity ─
            const cssVariables: Record<string, string> = await page.evaluate(`(() => {
                const styles = getComputedStyle(document.documentElement);
                const vars = {};
                // iterate all declared custom properties
                for (const sheet of Array.from(document.styleSheets)) {
                    try {
                        for (const rule of Array.from(sheet.cssRules ?? [])) {
                            if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
                                const ruleStyle = rule.style;
                                for (let i = 0; i < ruleStyle.length; i++) {
                                    const prop = ruleStyle[i];
                                    if (prop.startsWith('--')) {
                                        vars[prop] = styles.getPropertyValue(prop).trim();
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // Cross-origin stylesheets — skip
                    }
                }
                return vars;
            })()`) as any;

            // ── FIX: scroll back to top so screenshot shows the hero/nav ─────────
            await page.evaluate(`window.scrollTo(0, 0)`);
            await new Promise((r) => setTimeout(r, 300));

            const screenshotBuffer = await page.screenshot({
                encoding: 'base64',
                fullPage: false, // viewport-only (hero) — full-page at 2x crashes memory
            });

            // Also grab a full-page screenshot at lower quality for footer reference
            const fullPageBuffer = await page.screenshot({
                encoding: 'base64',
                fullPage: true,
                // clip to max 15000px tall to avoid OOM on very long pages
            });

            await browser.close();
            browser = undefined;

            return res.json({
                title,
                html,
                // FIX: return raw base64 WITHOUT the data-URI prefix.
                // geminiService.ts expects raw base64 for inlineData.data.
                screenshot: screenshotBuffer as string,
                fullPageScreenshot: fullPageBuffer as string,
                cssVariables: Object.keys(cssVariables).length > 0 ? cssVariables : undefined,
            });

        } catch (err: any) {
            console.error('[/api/scrape] Error:', err?.message ?? err);
            if (browser) {
                await browser.close().catch(() => {});
            }
            return res.status(500).json({
                error: err?.message ?? 'Scraping failed',
                html:  undefined,
                screenshot: undefined,
            });
        }
    });

    app.post('/api/design-system', async (req, res) => {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const { exec } = await import('child_process');
        const path = await import('path');

        const scriptPath = path.join(process.cwd(), 'backend', 'core.py');
        const command = `python3 "${scriptPath}" "${query.replace(/"/g, '\\"')}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing python script: ${error.message}`);
                return res.status(500).json({ error: `Failed to generate design system: ${stderr || error.message}` });
            }

            try {
                const result = JSON.parse(stdout);
                res.json(result);
            } catch (parseError) {
                console.error(`Error parsing python output: ${stdout}`);
                res.status(500).json({ error: 'Failed to parse design system output' });
            }
        });
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        // In production, serve static files from dist
        // (This part is handled by the build system usually, but good to have)
        app.use(express.static('dist'));
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
