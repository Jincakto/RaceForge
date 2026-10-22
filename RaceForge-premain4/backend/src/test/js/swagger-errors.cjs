// Run with Playwright installed and the project's Swagger UI bundle supplied as argv[2].
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(10000);
        const errors = [];
        page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.stack); });
        let current;
        const spec = {
            openapi: '3.0.3', info: { title: 'Error display test', version: '1' },
            servers: [{ url: 'https://raceforge.test' }],
            components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
            paths: { '/api/test': { get: { responses: { 200: { description: 'OK' } } } } }
        };
        await page.route('https://raceforge.test/**', async route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/bundle.js') {
                return route.fulfill({ contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(process.argv[2], 'utf8') });
            }
            if (url.pathname === '/errors.js') {
                return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(
                    path.join(__dirname, '../../main/resources/swagger/raceforge-errors.js'), 'utf8') });
            }
            if (url.pathname === '/api/test') {
                if (current.network) return route.abort();
                return route.fulfill({ status: current.status, contentType: current.contentType || 'application/json',
                    body: current.body, headers: { 'x-test-header': 'preserved' } });
            }
            return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><meta charset="utf-8"><div id="swagger-ui"></div>
                <script src="/bundle.js"></script><script src="/errors.js"></script><script>
                window.ui = SwaggerUIBundle({dom_id:'#swagger-ui', spec:${JSON.stringify(spec)}, validatorUrl:null,
                    presets:[SwaggerUIBundle.presets.apis]});
                </script>` });
        });
        const cases = [
            { status: 409, body: JSON.stringify({message:'Email already exists',data:{code:'EMAIL_ALREADY_EXISTS'}}), label: '409 \u2014 Email already exists' },
            { status: 403, body: JSON.stringify({message:'Access denied'}), label: '403 \u2014 Access denied' },
            { status: 400, body: JSON.stringify({message:'Validation failed', data:{validationErrors:{email:'Invalid email'}}}), label: '400 \u2014 Validation failed' },
            { status: 503, body: JSON.stringify({message:'Email delivery is not configured'}), label: '503 \u2014 Email delivery is not configured' },
            { status: 409, body: JSON.stringify({message:' ',data:{message:'Nested message'}}), label: '409 \u2014 Nested message' },
            { status: 503, body: JSON.stringify({message:123,data:{message:[]}}), label: '503 \u2014 Service Unavailable' },
            { status: 503, body: '', label: '503 \u2014 Service Unavailable' },
            { status: 502, body: '<html>upstream error</html>', contentType:'text/html', label: '502 \u2014 Bad Gateway' },
            { status: 409, body: JSON.stringify({message:'<img src=x onerror="window.injected=true">'}), label: '409 \u2014 <img src=x onerror="window.injected=true">' },
            { network:true, label: 'Unable to connect to the server.' }
        ];
        for (current of cases) {
            await page.goto('https://raceforge.test/');
            console.log('Checking:', current.label);
            await page.locator('.opblock-summary').waitFor();
            if (!await page.getByRole('button', {name:'Try it out'}).isVisible()) {
                await page.locator('.opblock-summary-control').click();
            }
            await page.getByRole('button', {name:'Try it out'}).click();
            await page.getByRole('button', {name:'Execute', exact:true}).click();
            const heading = page.locator('.raceforge-error-message');
            await heading.waitFor();
            assert.equal(await heading.textContent(), current.label);
            assert.equal(await heading.locator('img').count(), 0);
            assert.equal(await page.evaluate(() => window.injected), undefined);
            if (!current.network) {
                const response = await page.evaluate(() => window.ui.specSelectors.responseFor('/api/test','get').toJS());
                assert.equal(response.text, current.body);
                assert.equal(response.status, current.status);
                assert.equal(response.headers['x-test-header'], 'preserved');
            }
        }
        await page.getByRole('button', {name:/Authorize/}).first().click();
        await page.locator('.auth-container input').fill('test-token');
        await page.locator('.auth-btn-wrapper button.authorize').click();
        assert.ok(await page.evaluate(() => window.ui.authSelectors.authorized().has('bearerAuth')));
        assert.deepEqual(errors, []);
        await page.screenshot({ path: path.resolve('target/swagger-error-display.png'), fullPage: true });
        console.log('PASS: 10 live Swagger error scenarios, unchanged response data, safe text and Authorize.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
