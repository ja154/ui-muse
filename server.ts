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
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        let browser;
        try {
            console.log(`Launching browser to scrape: ${url}`);
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process', // <- this one doesn't works in Windows
                    '--disable-gpu'
                ]
            });

            const page = await browser.newPage();
            
            // Set a reasonable viewport with high DPI for better screenshot quality
            await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

            // Navigate to the URL
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            // Extract data
            const title = await page.title();
            
            // Get computed styles for body and root
            const styles = await page.evaluate(() => {
                const bodyStyles = window.getComputedStyle(document.body);
                const rootStyles = window.getComputedStyle(document.documentElement);
                
                const keys = ['font-family', 'background-color', 'color', 'font-size', 'line-height', 'letter-spacing', 'font-weight'];
                
                const bodyResult: Record<string, string> = {};
                for (let i = 0; i < keys.length; i++) {
                    bodyResult[keys[i]] = bodyStyles.getPropertyValue(keys[i]);
                }
                
                const rootResult: Record<string, string> = {};
                for (let i = 0; i < keys.length; i++) {
                    rootResult[keys[i]] = rootStyles.getPropertyValue(keys[i]);
                }

                return {
                    body: bodyResult,
                    root: rootResult
                };
            });

            // Get HTML content (simplified if possible, but raw is fine for Gemini)
            const html = await page.content();

            // Take screenshot (full page for complete context)
            const screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: true });
            const screenshot = `data:image/png;base64,${screenshotBuffer}`;

            res.json({
                title,
                html,
                styles,
                screenshot
            });

        } catch (error: any) {
            console.error('Scraping error:', error);
            res.status(500).json({ error: `Failed to scrape URL: ${error.message}` });
        } finally {
            if (browser) {
                await browser.close();
            }
        }
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
