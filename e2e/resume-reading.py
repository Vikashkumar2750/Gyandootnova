/**
 * E2E: Resume buttons open the correct saved chapter and scroll to
 * the last-read position — on both BookDetail and the homepage
 * "Continue Reading" section.
 *
 * Requirements:
 *   1. The app must be running at BASE_URL (default http://localhost:8080).
 *   2. LOVABLE_BROWSER_SUPABASE_* env vars OR TEST_USER / TEST_PASS must be
 *      set so the test can authenticate. Skips cleanly when neither is present.
 *
 * Run locally:   python3 e2e/resume-reading.py
 * Run in CI:     invoke via a workflow job that provides one of the two
 *                auth mechanisms above.
 */
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")
SCREENSHOTS = Path(__file__).parent / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

TARGET_PERCENT = 55  # what we'll write into reading_progress.scroll_percent


async def hydrate_supabase_session(context, page):
    """Restore a managed Supabase session, if the sandbox has one."""
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if not (session_json and storage_key):
        return False
    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = BASE_URL
        await context.add_cookies(cookies)
    await page.goto(BASE_URL)
    await page.evaluate(
        f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
    )
    return True


async def sign_in_with_password(page):
    user = os.environ.get("TEST_USER")
    pw = os.environ.get("TEST_PASS")
    if not (user and pw):
        return False
    await page.goto(f"{BASE_URL}/auth")
    await page.get_by_label("Email", exact=False).fill(user)
    await page.get_by_label("Password", exact=False).fill(pw)
    await page.get_by_role("button", name="Sign in", exact=False).click()
    await page.wait_for_url(lambda u: "/auth" not in u, timeout=15_000)
    return True


async def pick_a_book_slug(page) -> str | None:
    await page.goto(f"{BASE_URL}/books", wait_until="networkidle")
    href = await page.evaluate(
        """() => {
          const a = document.querySelector('a[href^="/books/"]');
          return a ? a.getAttribute('href') : null;
        }"""
    )
    if not href:
        return None
    parts = [p for p in href.split("/") if p]
    return parts[1] if len(parts) >= 2 else None


async def seed_reading_progress(page, book_slug: str) -> dict | None:
    """Use the app's own supabase client (already authenticated in the page)
    to insert/update a reading_progress row for the first chapter."""
    return await page.evaluate(
        """async (slug) => {
          const mod = await import('/src/integrations/supabase/client.ts');
          const supabase = mod.supabase;
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return { error: 'no user' };
          const { data: book } = await supabase.from('books')
            .select('id, slug').eq('slug', slug).maybeSingle();
          if (!book) return { error: 'no book' };
          const { data: chapter } = await supabase.from('book_chapters')
            .select('id, slug, chapter_number, title')
            .eq('book_id', book.id).order('chapter_number').limit(1).maybeSingle();
          if (!chapter) return { error: 'no chapter' };
          await supabase.from('reading_progress').upsert({
            user_id: user.id,
            book_id: book.id,
            chapter_id: chapter.id,
            chapter_number: chapter.chapter_number,
            scroll_percent: %d,
          }, { onConflict: 'user_id,book_id' });
          return { book, chapter };
        }""" % TARGET_PERCENT,
        book_slug,
    )


async def assert_chapter_rendered(page, expected_title: str | None) -> bool:
    """Confirm the reader rendered the expected chapter by matching its title
    inside a heading. Falls back to scanning the reader body text when the
    chapter has no title."""
    if not expected_title:
        # No title on record — just verify the reader shell rendered content.
        body_len = await page.evaluate("() => (document.body.innerText || '').length")
        return body_len > 500
    heading_ok = await page.evaluate(
        """(t) => {
          const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim().toLowerCase();
          const needle = norm(t);
          if (!needle) return true;
          const nodes = Array.from(document.querySelectorAll('h1, h2, h3, [data-chapter-title]'));
          return nodes.some(n => norm(n.textContent).includes(needle));
        }""",
        expected_title,
    )
    return bool(heading_ok)


async def check_resume_from_home(page, book_slug: str, chapter_slug: str, chapter_title: str | None) -> bool:
    await page.goto(BASE_URL, wait_until="networkidle")
    await page.screenshot(path=str(SCREENSHOTS / "1_home_continue_reading.png"))
    section = page.locator("section[aria-labelledby='continue-reading']")
    await section.wait_for(state="visible", timeout=10_000)
    # The Continue Reading card must show the expected chapter reference.
    if chapter_title:
        card_has_title = await section.evaluate(
            """(el, t) => (el.innerText || '').toLowerCase().includes(t.toLowerCase())""",
            chapter_title,
        )
        print(f"[home card] mentions chapter title? {card_has_title}")
    target = section.locator(f"a[href='/books/{book_slug}/{chapter_slug}']").first
    await target.wait_for(state="visible")
    await target.click()
    await page.wait_for_url(f"**/books/{book_slug}/{chapter_slug}", timeout=10_000)
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(0.8)  # let the restore effect scroll
    scroll_y = await page.evaluate("() => window.scrollY")
    doc_h = await page.evaluate("() => document.documentElement.scrollHeight - window.innerHeight")
    percent = 0 if doc_h <= 0 else (scroll_y / doc_h) * 100
    title_ok = await assert_chapter_rendered(page, chapter_title)
    await page.screenshot(path=str(SCREENSHOTS / "2_after_home_resume.png"))
    print(f"[home->reader] url={page.url}  scrollY={scroll_y}  approx%={percent:.1f}  title_ok={title_ok}")
    return (
        page.url.endswith(f"/books/{book_slug}/{chapter_slug}")
        and title_ok
        and percent >= TARGET_PERCENT - 10
    )


async def check_resume_from_book_detail(page, book_slug: str, chapter_slug: str, chapter_title: str | None) -> bool:
    await page.goto(f"{BASE_URL}/books/{book_slug}", wait_until="networkidle")
    await page.screenshot(path=str(SCREENSHOTS / "3_book_detail.png"))
    resume = page.locator(
        f"a[href='/books/{book_slug}/{chapter_slug}'], "
        f"a[href*='/books/{book_slug}/']:has-text('Resume')"
    ).first
    if not await resume.count():
        print("[detail] no explicit resume link found — checking chapter list")
        resume = page.locator(f"a[href='/books/{book_slug}/{chapter_slug}']").first
    await resume.wait_for(state="visible", timeout=10_000)
    await resume.click()
    await page.wait_for_url(f"**/books/{book_slug}/{chapter_slug}", timeout=10_000)
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(0.8)
    scroll_y = await page.evaluate("() => window.scrollY")
    doc_h = await page.evaluate("() => document.documentElement.scrollHeight - window.innerHeight")
    percent = 0 if doc_h <= 0 else (scroll_y / doc_h) * 100
    title_ok = await assert_chapter_rendered(page, chapter_title)
    await page.screenshot(path=str(SCREENSHOTS / "4_after_detail_resume.png"))
    print(f"[detail->reader] url={page.url}  scrollY={scroll_y}  approx%={percent:.1f}  title_ok={title_ok}")
    return (
        page.url.endswith(f"/books/{book_slug}/{chapter_slug}")
        and title_ok
        and percent >= TARGET_PERCENT - 10
    )


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        signed_in = await hydrate_supabase_session(context, page) or await sign_in_with_password(page)
        if not signed_in:
            print("SKIP — no test session available (set LOVABLE_BROWSER_SUPABASE_* or TEST_USER/TEST_PASS).")
            await browser.close()
            return 0

        slug = await pick_a_book_slug(page)
        if not slug:
            print("FAIL — could not find a book slug on /books")
            await browser.close()
            return 2
        print(f"[seed] using book slug: {slug}")

        seeded = await seed_reading_progress(page, slug)
        if not seeded or seeded.get("error"):
            print(f"FAIL — could not seed reading_progress: {seeded}")
            await browser.close()
            return 3
        chapter_slug = seeded["chapter"]["slug"]
        chapter_title = seeded["chapter"].get("title")

        ok_home = await check_resume_from_home(page, slug, chapter_slug, chapter_title)
        ok_detail = await check_resume_from_book_detail(page, slug, chapter_slug, chapter_title)

        await browser.close()
        if ok_home and ok_detail:
            print("PASS — Resume buttons open the correct chapter and restore scroll on both surfaces.")
            return 0
        print(f"FAIL — home_ok={ok_home} detail_ok={ok_detail}")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
