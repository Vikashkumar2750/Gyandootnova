"""
E2E: /library empty-state login flow.

Flow:
  1. Visit /library while signed out → assert the "Sign in to view" empty
     state renders and click its "Sign in to view" CTA.
  2. Confirm the auth page's redirect param round-trips back to /library.
  3. Restore a Supabase session, revisit /library, and confirm one of:
       - library-empty  (signed-in but no reading_progress rows)
       - a list of books with "Resume reading" buttons
     Fails if the guest state is still visible after sign-in.

Run: python3 e2e/library-auth-flow.py
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)


async def check_guest_state(page):
    await page.goto(f"{BASE_URL}/library", wait_until="networkidle")
    await page.screenshot(path=str(SHOTS / "lib_1_guest.png"))
    guest = page.locator("[data-testid='library-guest']")
    await guest.wait_for(state="visible", timeout=10_000)
    # Click the sign-in CTA and verify the redirect param round-trips.
    cta = guest.get_by_role("link", name="Sign in to view")
    await cta.click()
    await page.wait_for_url("**/auth*", timeout=10_000)
    url = page.url
    ok = "redirect=%2Flibrary" in url or "redirect=/library" in url
    await page.screenshot(path=str(SHOTS / "lib_2_auth_redirect.png"))
    print(f"[guest] auth url={url}  redirect_param_ok={ok}")
    return ok


async def restore_session(context, page):
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


async def check_signed_in_state(page):
    await page.goto(f"{BASE_URL}/library", wait_until="networkidle")
    # Wait until either the empty state or a resume link appears; the guest
    # state must NOT be visible.
    await page.wait_for_function(
        """() => {
          const guest = document.querySelector("[data-testid='library-guest']");
          if (guest) return false;
          const empty = document.querySelector("[data-testid='library-empty']");
          const items = document.querySelectorAll("a[href^='/books/']");
          return !!empty || items.length > 0;
        }""",
        timeout=15_000,
    )
    await page.screenshot(path=str(SHOTS / "lib_3_signed_in.png"))
    empty = await page.locator("[data-testid='library-empty']").count()
    items = await page.locator("a[href^='/books/']:has-text('Resume reading')").count()
    guest_still = await page.locator("[data-testid='library-guest']").count()
    print(f"[signed-in] empty={empty}  resume_buttons={items}  guest_still={guest_still}")
    return guest_still == 0 and (empty > 0 or items > 0)


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        guest_ok = await check_guest_state(page)
        if not guest_ok:
            print("FAIL — guest empty-state or redirect param broken.")
            await browser.close()
            return 1

        if not await restore_session(context, page):
            print("SKIP signed-in check — no LOVABLE_BROWSER_SUPABASE_* session available.")
            await browser.close()
            return 0

        signed_ok = await check_signed_in_state(page)
        await browser.close()
        if signed_ok:
            print("PASS — /library empty-state + auth round-trip + signed-in render.")
            return 0
        print("FAIL — signed-in /library did not render list or empty state.")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
