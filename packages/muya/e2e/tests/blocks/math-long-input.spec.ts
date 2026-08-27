import { expect, test } from '../fixtures/muya';
import { editor } from '../helpers/selectors';

// Long-formula input UX (fork feature):
// 1. While a math block is being edited, the raw LaTeX source must wrap in the
//    input container instead of running off the right edge (a `<pre>` defaults
//    to `white-space: pre`, which would overflow).
// 2. An invalid inline formula must surface the KaTeX parse reason not only in
//    the `title` but as a visible detail line in the editing popup.

test.describe('long math input', () => {
    test('active math block input wraps long LaTeX lines', async ({ page }) => {
        await page.evaluate(() => {
            window.muya!.setContent(
                '$$\n\\int_0^\\infty \\frac{x^2}{e^x-1}\\,dx + \\sum_{n=1}^\\infty \\frac{1}{n^2} + \\frac{1}{\\pi}\\oint_C \\mathbf{E}\\cdot d\\mathbf{l} = \\zeta(2)\n$$\n',
            );
        });

        const block = page.locator(editor.mathBlock).first();
        await block.click();

        const container = page.locator('.mu-math-container').first();
        await expect(container).toBeVisible();

        const style = await container.evaluate(el => {
            const cs = getComputedStyle(el);

            return { whiteSpace: cs.whiteSpace, overflowWrap: cs.overflowWrap };
        });
        expect(style.whiteSpace).toBe('pre-wrap');
        expect(style.overflowWrap).toBe('break-word');
    });

    test('editing an invalid inline formula shows the parse reason in the popup detail', async ({ page }) => {
        await page.evaluate(() => {
            window.muya!.setContent('hello $\\frac{1}{$ world');
        });

        const err = page.locator('.mu-math-error').first();
        await expect(err).toBeAttached();

        // Activate the token for editing (removes `mu-hide`); the KaTeX parse
        // reason detail becomes visible under the compact label.
        await err.click();

        const detail = page.locator('.mu-math-error-detail').first();
        await expect(detail).toBeVisible();
        expect((await detail.textContent()) ?? '').toMatch(/parse error/i);
    });
});
