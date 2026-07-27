import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))
        
        print("Navigating to http://localhost:3000/chats")
        response = await page.goto("http://localhost:3000/chats", wait_until="networkidle")
        print(f"Status: {response.status}")
        
        await asyncio.sleep(3)
        await browser.close()

asyncio.run(main())
