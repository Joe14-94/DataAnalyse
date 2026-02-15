import os
from playwright.sync_api import sync_playwright

def verify_data_explorer():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        page.goto("http://localhost:5173/#/data")

        # Wait a bit for load
        page.wait_for_timeout(2000)

        # Handle onboarding tour
        try:
            page.click("button:has-text('Passer le tour')", timeout=5000)
        except:
            pass

        # Select a dataset if none is selected
        try:
            if "Aucun tableau sélectionné" in page.content():
                # Go to Settings and load demo data
                page.goto("http://localhost:5173/#/settings")
                page.click("button:has-text('Générer')")
                page.wait_for_timeout(2000)
                page.goto("http://localhost:5173/#/data")
        except Exception as e:
            print(f"Error selecting dataset: {e}")

        # Wait for the grid
        try:
            page.wait_for_selector("[role='grid']", timeout=10000)
        except:
            print("Grid not found")

        # Click on a data cell
        cells = page.locator("[role='gridcell']")
        if cells.count() > 0:
            cells.nth(5).click()

            # Press Arrows to demonstrate navigation
            page.keyboard.press("ArrowDown")
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(500)

        # Take a screenshot
        os.makedirs("/home/jules/verification", exist_ok=True)
        page.screenshot(path="/home/jules/verification/grid_nav.png")

        browser.close()

if __name__ == "__main__":
    verify_data_explorer()
